use crate::{
    actions, db,
    models::{ActionResult, Schedule, Status},
};
use chrono::Utc;
use rusqlite::Connection;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Notify;

pub const OVERDUE_TOLERANCE_MS: i64 = 30_000;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub notify: Notify,
    pub simulation: AtomicBool,
    pub allow_exit: AtomicBool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DueDecision {
    Wait,
    Execute,
    Confirm,
}

pub fn due_decision(now: i64, scheduled_for: i64) -> DueDecision {
    if now < scheduled_for {
        DueDecision::Wait
    } else if now - scheduled_for <= OVERDUE_TOLERANCE_MS {
        DueDecision::Execute
    } else {
        DueDecision::Confirm
    }
}

pub fn emit_schedule(app: &AppHandle) {
    let state = app.state::<AppState>();
    let active = state
        .db
        .lock()
        .ok()
        .and_then(|db| db::active_schedule(&db).ok())
        .flatten();
    let _ = app.emit("schedule://changed", active);
}

fn next_wait(schedule: Option<&Schedule>, now: i64) -> Duration {
    let Some(schedule) = schedule else {
        return Duration::from_secs(3600);
    };
    if schedule.status != Status::Scheduled {
        return Duration::from_secs(3600);
    }
    let warning_at = schedule.scheduled_for - schedule.warning_offset_ms;
    let next = if !schedule.warned && warning_at > now {
        warning_at
    } else {
        schedule.scheduled_for
    };
    Duration::from_millis((next - now).clamp(100, 60_000) as u64)
}

pub async fn run(app: AppHandle) {
    loop {
        let now = Utc::now().timestamp_millis();
        let mut result_event: Option<ActionResult> = None;
        let mut due_event: Option<Schedule> = None;
        let mut warning_event: Option<Schedule> = None;

        let wait = {
            let state = app.state::<AppState>();
            match state.db.lock() {
                Err(_) => Duration::from_secs(1),
                Ok(connection) => {
                    let mut active = db::active_schedule(&connection).ok().flatten();
                    if let Some(schedule) = active.as_mut() {
                        if schedule.status == Status::Scheduled {
                            let warning_at = schedule.scheduled_for - schedule.warning_offset_ms;
                            if !schedule.warned && now >= warning_at && now < schedule.scheduled_for
                            {
                                schedule.warned = true;
                                let _ = db::save_schedule(&connection, schedule);
                                warning_event = Some(schedule.clone());
                            }
                            match due_decision(now, schedule.scheduled_for) {
                                DueDecision::Wait => {}
                                DueDecision::Confirm => {
                                    schedule.status = Status::AwaitingConfirmation;
                                    let _ = db::save_schedule(&connection, schedule);
                                    let _ = db::audit(
                                        &connection,
                                        Some(&schedule.id),
                                        "overdue",
                                        "Waiting for local confirmation",
                                        now,
                                    );
                                    due_event = Some(schedule.clone());
                                }
                                DueDecision::Execute => {
                                    let outcome =
                                        actions::execute(schedule.action, schedule.simulation);
                                    schedule.status = if outcome.is_ok() {
                                        Status::Completed
                                    } else {
                                        Status::Failed
                                    };
                                    let detail = outcome.clone().unwrap_or_else(|error| error);
                                    let _ = db::save_schedule(&connection, schedule);
                                    let _ = db::audit(
                                        &connection,
                                        Some(&schedule.id),
                                        "action_result",
                                        &detail,
                                        now,
                                    );
                                    result_event = Some(ActionResult {
                                        schedule_id: schedule.id.clone(),
                                        ok: outcome.is_ok(),
                                        simulation: schedule.simulation,
                                        detail,
                                    });
                                }
                            }
                        }
                    }
                    next_wait(active.as_ref(), now)
                }
            }
        };

        if let Some(schedule) = warning_event {
            let _ = app.emit("schedule://warning", schedule);
            emit_schedule(&app);
        }
        if let Some(schedule) = due_event {
            let _ = app.emit("schedule://due", schedule);
            emit_schedule(&app);
        }
        if let Some(result) = result_event {
            let _ = app.emit("schedule://action-result", result);
            emit_schedule(&app);
        }

        let state = app.state::<AppState>();
        tokio::select! { _ = state.notify.notified() => {}, _ = tokio::time::sleep(wait) => {} }
    }
}

pub fn recover_overdue(connection: &Connection) -> rusqlite::Result<()> {
    if let Some(mut schedule) = db::active_schedule(connection)? {
        if schedule.status == Status::Scheduled
            && due_decision(Utc::now().timestamp_millis(), schedule.scheduled_for)
                == DueDecision::Confirm
        {
            schedule.status = Status::AwaitingConfirmation;
            db::save_schedule(connection, &schedule)?;
        }
    }
    Ok(())
}

pub fn wake(state: &AppState) {
    state.notify.notify_one();
}
pub fn set_exiting(state: &AppState) {
    state.allow_exit.store(true, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        db,
        models::{Action, Schedule},
    };

    #[test]
    fn due_timing_distinguishes_live_and_overdue() {
        assert_eq!(due_decision(900, 1_000), DueDecision::Wait);
        assert_eq!(due_decision(1_010, 1_000), DueDecision::Execute);
        assert_eq!(due_decision(31_001, 1_000), DueDecision::Confirm);
    }

    #[test]
    fn recovery_never_executes_an_overdue_action() {
        let connection = Connection::open_in_memory().unwrap();
        db::migrate(&connection).unwrap();
        let schedule = Schedule {
            id: "test".into(),
            action: Action::Shutdown,
            mode: "duration".into(),
            created_at: 1,
            scheduled_for: 2,
            warning_offset_ms: 1000,
            status: Status::Scheduled,
            simulation: false,
            paused_remaining_ms: None,
            warned: false,
            message: None,
        };
        db::save_schedule(&connection, &schedule).unwrap();
        recover_overdue(&connection).unwrap();
        assert_eq!(
            db::active_schedule(&connection).unwrap().unwrap().status,
            Status::AwaitingConfirmation
        );
    }
}
