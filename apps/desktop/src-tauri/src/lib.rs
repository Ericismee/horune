mod actions;
mod db;
mod models;
mod scheduler;

use chrono::Utc;
use models::{
    Capabilities, CreateScheduleInput, DesktopSettings, Schedule, Status, UpdateDesktopSettings,
};
use rusqlite::Connection;
use scheduler::AppState;
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, RunEvent, State, WebviewWindow,
    WindowEvent,
};
use uuid::Uuid;

fn capabilities(simulation: bool) -> Capabilities {
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    let (sleep, shutdown, lock) = (true, true, true);
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let (sleep, shutdown, lock) = (false, false, false);
    Capabilities {
        platform: std::env::consts::OS,
        sleep,
        shutdown,
        lock,
        reminder: true,
        simulation,
    }
}

fn active(state: &AppState) -> Result<Option<Schedule>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "Database lock failed".to_string())?;
    db::active_schedule(&connection).map_err(|error| error.to_string())
}

fn update_active<F>(
    app: &AppHandle,
    event: &str,
    expected_id: Option<&str>,
    operation: F,
) -> Result<Option<Schedule>, String>
where
    F: FnOnce(&mut Schedule) -> Result<(), String>,
{
    let state = app.state::<AppState>();
    let updated = {
        let connection = state
            .db
            .lock()
            .map_err(|_| "Database lock failed".to_string())?;
        let Some(mut schedule) =
            db::active_schedule(&connection).map_err(|error| error.to_string())?
        else {
            return Ok(None);
        };
        if expected_id.is_some_and(|id| id != schedule.id) {
            return Err("The active schedule changed; refresh before applying this action".into());
        }
        operation(&mut schedule)?;
        db::save_schedule(&connection, &schedule).map_err(|error| error.to_string())?;
        db::audit(
            &connection,
            Some(&schedule.id),
            event,
            schedule.status.as_str(),
            Utc::now().timestamp_millis(),
        )
        .map_err(|error| error.to_string())?;
        Some(schedule)
    };
    scheduler::wake(&state);
    scheduler::emit_schedule(app, updated.clone());
    Ok(updated)
}

#[tauri::command]
fn get_capabilities(state: State<'_, AppState>) -> Capabilities {
    capabilities(state.simulation.load(Ordering::SeqCst))
}

#[tauri::command]
fn get_active_schedule(state: State<'_, AppState>) -> Result<Option<Schedule>, String> {
    active(&state)
}

#[tauri::command]
fn list_history(state: State<'_, AppState>, limit: Option<usize>) -> Result<Vec<Schedule>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "Database lock failed".to_string())?;
    db::history(&connection, limit.unwrap_or(30).min(100)).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_schedule(
    app: AppHandle,
    state: State<'_, AppState>,
    input: CreateScheduleInput,
) -> Result<Schedule, String> {
    let now = Utc::now().timestamp_millis();
    if input.scheduled_for <= now + 1_000 {
        return Err("The finish time must be in the future".into());
    }
    if input.scheduled_for > now + 366 * 24 * 60 * 60 * 1000 {
        return Err("Schedules are limited to one year".into());
    }
    if !matches!(input.mode.as_str(), "duration" | "absolute") {
        return Err("Invalid schedule mode".into());
    }
    if !(0..=24 * 60 * 60 * 1000).contains(&input.warning_offset_ms) {
        return Err("Invalid warning offset".into());
    }
    let caps = capabilities(state.simulation.load(Ordering::SeqCst));
    let allowed = match input.action {
        models::Action::Sleep => caps.sleep,
        models::Action::Shutdown => caps.shutdown,
        models::Action::Lock => caps.lock,
        models::Action::Reminder => true,
    };
    if !allowed {
        return Err("This action is not available on the current operating system".into());
    }
    let schedule = Schedule {
        id: Uuid::new_v4().to_string(),
        action: input.action,
        mode: input.mode,
        created_at: now,
        scheduled_for: input.scheduled_for,
        warning_offset_ms: input.warning_offset_ms,
        status: Status::Scheduled,
        simulation: state.simulation.load(Ordering::SeqCst),
        paused_remaining_ms: None,
        warned: false,
        message: input.message,
        dispatch_started_at: None,
        finished_at: None,
        result_kind: None,
        result_detail: None,
        wake_observed_at: None,
    };
    {
        let connection = state
            .db
            .lock()
            .map_err(|_| "Database lock failed".to_string())?;
        if let Some(open) = db::active_schedule(&connection).map_err(|error| error.to_string())? {
            if matches!(open.status, Status::Due | Status::Dispatching) {
                return Err(
                    "Wait for the current system action to finish before replacing it".into(),
                );
            }
        }
        db::cancel_open_schedules(&connection, now).map_err(|error| error.to_string())?;
        db::save_schedule(&connection, &schedule).map_err(|error| error.to_string())?;
        db::audit(
            &connection,
            Some(&schedule.id),
            "created",
            schedule.action.as_str(),
            now,
        )
        .map_err(|error| error.to_string())?;
    }
    scheduler::wake(&state);
    scheduler::emit_schedule(&app, Some(schedule.clone()));
    Ok(schedule)
}

#[tauri::command]
fn pause_schedule(app: AppHandle, schedule_id: Option<String>) -> Result<Option<Schedule>, String> {
    update_active(&app, "paused", schedule_id.as_deref(), |schedule| {
        if schedule.status != Status::Scheduled {
            return Err("Only a running schedule can be paused".into());
        }
        schedule.paused_remaining_ms =
            Some((schedule.scheduled_for - Utc::now().timestamp_millis()).max(0));
        schedule.status = Status::Paused;
        Ok(())
    })
}

#[tauri::command]
fn resume_schedule(
    app: AppHandle,
    schedule_id: Option<String>,
) -> Result<Option<Schedule>, String> {
    update_active(&app, "resumed", schedule_id.as_deref(), |schedule| {
        if schedule.status != Status::Paused {
            return Err("Only a paused schedule can resume".into());
        }
        schedule.scheduled_for =
            Utc::now().timestamp_millis() + schedule.paused_remaining_ms.unwrap_or(0);
        schedule.paused_remaining_ms = None;
        schedule.warned = false;
        schedule.status = Status::Scheduled;
        Ok(())
    })
}

#[tauri::command]
fn snooze_schedule(
    app: AppHandle,
    minutes: Option<i64>,
    schedule_id: Option<String>,
) -> Result<Option<Schedule>, String> {
    let minutes = minutes.unwrap_or(5).clamp(1, 60);
    update_active(&app, "snoozed", schedule_id.as_deref(), |schedule| {
        if !matches!(
            schedule.status,
            Status::Scheduled | Status::Paused | Status::AwaitingConfirmation
        ) {
            return Err("This schedule can no longer be extended".into());
        }
        schedule.scheduled_for =
            schedule.scheduled_for.max(Utc::now().timestamp_millis()) + minutes * 60_000;
        schedule.status = Status::Scheduled;
        schedule.paused_remaining_ms = None;
        schedule.warned = false;
        schedule.finished_at = None;
        schedule.result_kind = None;
        schedule.result_detail = None;
        Ok(())
    })
}

#[tauri::command]
fn cancel_schedule(
    app: AppHandle,
    schedule_id: Option<String>,
) -> Result<Option<Schedule>, String> {
    update_active(&app, "cancelled", schedule_id.as_deref(), |schedule| {
        if matches!(schedule.status, Status::Due | Status::Dispatching) {
            return Err("The system action is already being dispatched".into());
        }
        schedule.status = Status::Cancelled;
        schedule.finished_at = Some(Utc::now().timestamp_millis());
        schedule.result_kind = Some("cancelled".into());
        schedule.result_detail = Some("Cancelled by the user".into());
        Ok(())
    })
}

#[tauri::command]
fn confirm_overdue(
    app: AppHandle,
    schedule_id: Option<String>,
) -> Result<Option<Schedule>, String> {
    update_active(
        &app,
        "overdue_confirmed",
        schedule_id.as_deref(),
        |schedule| {
            if schedule.status != Status::AwaitingConfirmation {
                return Err("No overdue action is waiting".into());
            }
            schedule.scheduled_for = Utc::now().timestamp_millis();
            schedule.status = Status::Scheduled;
            schedule.warned = true;
            schedule.result_kind = None;
            schedule.result_detail = None;
            Ok(())
        },
    )
}

#[tauri::command]
fn set_simulation_mode(state: State<'_, AppState>, enabled: bool) -> Result<bool, String> {
    state.simulation.store(enabled, Ordering::SeqCst);
    let connection = state
        .db
        .lock()
        .map_err(|_| "Database lock failed".to_string())?;
    db::set_setting(
        &connection,
        "simulation",
        if enabled { "true" } else { "false" },
    )
    .map_err(|error| error.to_string())?;
    Ok(enabled)
}

#[tauri::command]
fn get_desktop_settings(state: State<'_, AppState>) -> Result<DesktopSettings, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "Database lock failed".to_string())?;
    db::desktop_settings(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
fn update_desktop_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    update: UpdateDesktopSettings,
) -> Result<DesktopSettings, String> {
    let settings = {
        let connection = state
            .db
            .lock()
            .map_err(|_| "Database lock failed".to_string())?;
        db::update_desktop_settings(&connection, &update).map_err(|error| error.to_string())?
    };
    if let Some(window) = app.get_webview_window("overlay") {
        window
            .set_always_on_top(settings.overlay_always_on_top)
            .map_err(|error| error.to_string())?;
    }
    app.emit("settings://changed", settings.clone())
        .map_err(|error| error.to_string())?;
    Ok(settings)
}

#[tauri::command]
fn show_overlay(app: AppHandle, show: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or("Overlay window is unavailable")?;
    if show {
        window.show().and_then(|_| window.set_focus())
    } else {
        window.hide()
    }
    .map_err(|error| error.to_string())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

fn tray_mutation(app: &AppHandle, id: &str) {
    let result = match id {
        "pause" => update_active(app, "tray_pause_toggle", None, |schedule| {
            if schedule.status == Status::Paused {
                schedule.scheduled_for =
                    Utc::now().timestamp_millis() + schedule.paused_remaining_ms.unwrap_or(0);
                schedule.paused_remaining_ms = None;
                schedule.status = Status::Scheduled;
            } else if schedule.status == Status::Scheduled {
                schedule.paused_remaining_ms =
                    Some((schedule.scheduled_for - Utc::now().timestamp_millis()).max(0));
                schedule.status = Status::Paused;
            } else {
                return Err("This schedule cannot be paused or resumed".into());
            }
            Ok(())
        }),
        "snooze" => update_active(app, "tray_snoozed", None, |schedule| {
            if !matches!(
                schedule.status,
                Status::Scheduled | Status::Paused | Status::AwaitingConfirmation
            ) {
                return Err("This schedule can no longer be extended".into());
            }
            schedule.scheduled_for =
                schedule.scheduled_for.max(Utc::now().timestamp_millis()) + 300_000;
            schedule.status = Status::Scheduled;
            schedule.paused_remaining_ms = None;
            schedule.warned = false;
            Ok(())
        }),
        "cancel" => update_active(app, "tray_cancelled", None, |schedule| {
            if matches!(schedule.status, Status::Due | Status::Dispatching) {
                return Err("The system action is already being dispatched".into());
            }
            schedule.status = Status::Cancelled;
            schedule.finished_at = Some(Utc::now().timestamp_millis());
            schedule.result_kind = Some("cancelled".into());
            schedule.result_detail = Some("Cancelled from the tray".into());
            Ok(())
        }),
        _ => Ok(None),
    };
    if let Err(error) = result {
        let _ = app.emit("schedule://error", error);
    }
}

fn restored_overlay_size(
    saved_width: f64,
    saved_height: f64,
    saved_scale: f64,
    current_scale: f64,
) -> (u32, u32) {
    let scale_ratio = current_scale.max(0.5) / saved_scale.max(0.5);
    (
        (saved_width * scale_ratio).clamp(280.0, 1200.0) as u32,
        (saved_height * scale_ratio).clamp(160.0, 800.0) as u32,
    )
}

fn clamp_overlay_position(
    saved_x: f64,
    saved_y: f64,
    width: u32,
    height: u32,
    origin: PhysicalPosition<i32>,
    monitor_size: PhysicalSize<u32>,
) -> (i32, i32) {
    let max_x = origin.x + monitor_size.width.saturating_sub(width) as i32;
    let max_y = origin.y + monitor_size.height.saturating_sub(height) as i32;
    (
        (saved_x as i32).clamp(origin.x, max_x.max(origin.x)),
        (saved_y as i32).clamp(origin.y, max_y.max(origin.y)),
    )
}

fn restore_overlay(window: &WebviewWindow, connection: &Connection) {
    if let Ok(settings) = db::desktop_settings(connection) {
        let _ = window.set_always_on_top(settings.overlay_always_on_top);
    }
    let number = |key: &str| {
        db::setting(connection, key)
            .ok()
            .flatten()
            .and_then(|value| value.parse::<f64>().ok())
    };
    let (Some(saved_x), Some(saved_y), Some(saved_width), Some(saved_height)) = (
        number("overlay_x"),
        number("overlay_y"),
        number("overlay_width"),
        number("overlay_height"),
    ) else {
        return;
    };
    let current_scale = window.scale_factor().unwrap_or(1.0);
    let saved_scale = number("overlay_scale_factor").unwrap_or(current_scale);
    let (width, height) =
        restored_overlay_size(saved_width, saved_height, saved_scale, current_scale);
    let monitors = window.available_monitors().unwrap_or_default();
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            saved_x >= position.x as f64
                && saved_x < (position.x + size.width as i32) as f64
                && saved_y >= position.y as f64
                && saved_y < (position.y + size.height as i32) as f64
        })
        .or_else(|| monitors.first());
    let (x, y) = if let Some(monitor) = monitor {
        let origin = monitor.position();
        let size = monitor.size();
        clamp_overlay_position(saved_x, saved_y, width, height, *origin, *size)
    } else {
        (saved_x as i32, saved_y as i32)
    };
    let _ = window.set_size(PhysicalSize::new(width, height));
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlay_size_is_scaled_for_dpi_and_bounded() {
        assert_eq!(restored_overlay_size(430.0, 205.0, 1.0, 1.5), (645, 307));
        assert_eq!(restored_overlay_size(10.0, 10.0, 1.0, 1.0), (280, 160));
        assert_eq!(restored_overlay_size(5000.0, 5000.0, 1.0, 1.0), (1200, 800));
    }

    #[test]
    fn overlay_position_returns_to_a_visible_monitor() {
        let origin = PhysicalPosition::new(1920, 0);
        let size = PhysicalSize::new(1920, 1080);
        assert_eq!(
            clamp_overlay_position(5000.0, -200.0, 430, 205, origin, size),
            (3410, 0)
        );
    }
}

fn persist_overlay_geometry(window: &WebviewWindow, event: &WindowEvent) {
    let state = window.state::<AppState>();
    let Ok(connection) = state.db.lock() else {
        return;
    };
    match event {
        WindowEvent::Moved(position) => {
            let _ = db::set_setting(&connection, "overlay_x", &position.x.to_string());
            let _ = db::set_setting(&connection, "overlay_y", &position.y.to_string());
        }
        WindowEvent::Resized(size) => {
            let _ = db::set_setting(&connection, "overlay_width", &size.width.to_string());
            let _ = db::set_setting(&connection, "overlay_height", &size.height.to_string());
        }
        WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
            let _ = db::set_setting(
                &connection,
                "overlay_scale_factor",
                &scale_factor.to_string(),
            );
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let connection = Connection::open(data_dir.join("horune.sqlite3"))?;
            db::migrate(&connection)?;
            scheduler::recover_overdue(&connection)?;
            let simulation = db::setting(&connection, "simulation")?
                .map(|value| value == "true")
                .unwrap_or(true);
            if let Some(window) = app.get_webview_window("overlay") {
                restore_overlay(&window, &connection);
            }
            app.manage(AppState {
                db: std::sync::Mutex::new(connection),
                notify: tokio::sync::Notify::new(),
                simulation: std::sync::atomic::AtomicBool::new(simulation),
                allow_exit: std::sync::atomic::AtomicBool::new(false),
                pending_wake: std::sync::Mutex::new(None),
            });

            let open = MenuItem::with_id(app, "open", "Open Horune", true, None::<&str>)?;
            let overlay =
                MenuItem::with_id(app, "overlay", "Show floating clock", true, None::<&str>)?;
            let snooze = MenuItem::with_id(app, "snooze", "+5 minutes", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause / Resume", true, None::<&str>)?;
            let cancel = MenuItem::with_id(app, "cancel", "Cancel schedule", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Horune", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &overlay, &snooze, &pause, &cancel, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "overlay" => {
                        if let Some(window) = app.get_webview_window("overlay") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "snooze" | "pause" | "cancel" => tray_mutation(app, event.id.as_ref()),
                    "quit" => {
                        let state = app.state::<AppState>();
                        scheduler::set_exiting(&state);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(scheduler::run(handle));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let state = window.state::<AppState>();
                    if !state.allow_exit.load(Ordering::SeqCst) {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            } else if window.label() == "overlay" {
                persist_overlay_geometry(window, event);
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_capabilities,
            get_active_schedule,
            list_history,
            create_schedule,
            pause_schedule,
            resume_schedule,
            snooze_schedule,
            cancel_schedule,
            confirm_overdue,
            set_simulation_mode,
            get_desktop_settings,
            update_desktop_settings,
            show_overlay,
            show_main_window
        ])
        .build(tauri::generate_context!())
        .expect("error while building Horune")
        .run(|app, event| {
            if matches!(event, RunEvent::Resumed) {
                scheduler::record_wake_observed(app, Utc::now().timestamp_millis());
            }
        });
}
