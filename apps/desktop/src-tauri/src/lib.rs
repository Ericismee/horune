mod actions;
mod db;
mod models;
mod scheduler;

use chrono::Utc;
use models::{Capabilities, CreateScheduleInput, Schedule, Status};
use rusqlite::Connection;
use scheduler::AppState;
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
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

fn update_active<F>(app: &AppHandle, operation: F) -> Result<Option<Schedule>, String>
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
        operation(&mut schedule)?;
        db::save_schedule(&connection, &schedule).map_err(|error| error.to_string())?;
        Some(schedule)
    };
    scheduler::wake(&state);
    scheduler::emit_schedule(app);
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
    };
    {
        let connection = state
            .db
            .lock()
            .map_err(|_| "Database lock failed".to_string())?;
        db::cancel_open_schedules(&connection).map_err(|error| error.to_string())?;
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
    scheduler::emit_schedule(&app);
    Ok(schedule)
}

#[tauri::command]
fn pause_schedule(app: AppHandle) -> Result<Option<Schedule>, String> {
    update_active(&app, |schedule| {
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
fn resume_schedule(app: AppHandle) -> Result<Option<Schedule>, String> {
    update_active(&app, |schedule| {
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
fn snooze_schedule(app: AppHandle, minutes: Option<i64>) -> Result<Option<Schedule>, String> {
    let minutes = minutes.unwrap_or(5).clamp(1, 60);
    update_active(&app, |schedule| {
        schedule.scheduled_for =
            schedule.scheduled_for.max(Utc::now().timestamp_millis()) + minutes * 60_000;
        schedule.status = Status::Scheduled;
        schedule.paused_remaining_ms = None;
        schedule.warned = false;
        Ok(())
    })
}

#[tauri::command]
fn cancel_schedule(app: AppHandle) -> Result<Option<Schedule>, String> {
    update_active(&app, |schedule| {
        schedule.status = Status::Cancelled;
        Ok(())
    })
}

#[tauri::command]
fn confirm_overdue(app: AppHandle) -> Result<Option<Schedule>, String> {
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
        if schedule.status != Status::AwaitingConfirmation {
            return Err("No overdue action is waiting".into());
        }
        let outcome = actions::execute(schedule.action, schedule.simulation);
        schedule.status = if outcome.is_ok() {
            Status::Completed
        } else {
            Status::Failed
        };
        db::save_schedule(&connection, &schedule).map_err(|error| error.to_string())?;
        Some(schedule)
    };
    scheduler::emit_schedule(&app);
    Ok(updated)
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

fn tray_mutation(app: &AppHandle, id: &str) {
    let result = match id {
        "pause" => update_active(app, |schedule| {
            if schedule.status == Status::Paused {
                schedule.scheduled_for =
                    Utc::now().timestamp_millis() + schedule.paused_remaining_ms.unwrap_or(0);
                schedule.paused_remaining_ms = None;
                schedule.status = Status::Scheduled;
            } else {
                schedule.paused_remaining_ms =
                    Some((schedule.scheduled_for - Utc::now().timestamp_millis()).max(0));
                schedule.status = Status::Paused;
            }
            Ok(())
        }),
        "snooze" => update_active(app, |schedule| {
            schedule.scheduled_for =
                schedule.scheduled_for.max(Utc::now().timestamp_millis()) + 300_000;
            schedule.status = Status::Scheduled;
            schedule.warned = false;
            Ok(())
        }),
        "cancel" => update_active(app, |schedule| {
            schedule.status = Status::Cancelled;
            Ok(())
        }),
        _ => Ok(None),
    };
    if let Err(error) = result {
        let _ = app.emit("schedule://error", error);
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
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
            app.manage(AppState {
                db: std::sync::Mutex::new(connection),
                notify: tokio::sync::Notify::new(),
                simulation: std::sync::atomic::AtomicBool::new(simulation),
                allow_exit: std::sync::atomic::AtomicBool::new(false),
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
            show_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running Horune");
}
