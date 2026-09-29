use crate::{
    actions::{self, ActionAdapter, DispatchReceipt, SystemActionAdapter},
    db,
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
    pub pending_wake: Mutex<Option<String>>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DueDecision {
    Wait,
    Execute,
    Confirm,
}

#[derive(Debug)]
pub enum SchedulerStep {
    Wait(Duration),
    Warning(Schedule),
    AwaitingConfirmation(Schedule),
    Dispatch {
        due: Schedule,
        dispatching: Schedule,
    },
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

pub fn emit_schedule(app: &AppHandle, schedule: Option<Schedule>) {
    let _ = app.emit("schedule://changed", schedule);
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

pub fn advance(connection: &Connection, now: i64) -> rusqlite::Result<SchedulerStep> {
    let Some(mut schedule) = db::active_schedule(connection)? else {
        return Ok(SchedulerStep::Wait(Duration::from_secs(3600)));
    };

    match schedule.status {
        Status::Paused | Status::AwaitingConfirmation => {
            Ok(SchedulerStep::Wait(Duration::from_secs(3600)))
        }
        Status::Due | Status::Dispatching => {
            schedule.status = Status::AwaitingConfirmation;
            schedule.result_kind = Some("interrupted_dispatch".into());
            schedule.result_detail = Some(
                "The app restarted or re-entered the scheduler before a dispatch result was recorded. Confirmation is required; the action will not run again automatically."
                    .into(),
            );
            db::save_schedule(connection, &schedule)?;
            db::audit(
                connection,
                Some(&schedule.id),
                "dispatch_interrupted",
                schedule.result_detail.as_deref().unwrap_or_default(),
                now,
            )?;
            Ok(SchedulerStep::AwaitingConfirmation(schedule))
        }
        Status::Scheduled => {
            let warning_at = schedule.scheduled_for - schedule.warning_offset_ms;
            if !schedule.warned && now >= warning_at && now < schedule.scheduled_for {
                schedule.warned = true;
                db::save_schedule(connection, &schedule)?;
                db::audit(
                    connection,
                    Some(&schedule.id),
                    "warning",
                    "Pre-action warning emitted",
                    now,
                )?;
                return Ok(SchedulerStep::Warning(schedule));
            }

            match due_decision(now, schedule.scheduled_for) {
                DueDecision::Wait => Ok(SchedulerStep::Wait(next_wait(Some(&schedule), now))),
                DueDecision::Confirm => {
                    schedule.status = Status::AwaitingConfirmation;
                    schedule.result_kind = Some("overdue_recovery".into());
                    schedule.result_detail = Some(
                        "Deadline was missed by more than the safe tolerance. Local confirmation is required."
                            .into(),
                    );
                    db::save_schedule(connection, &schedule)?;
                    db::audit(
                        connection,
                        Some(&schedule.id),
                        "overdue",
                        schedule.result_detail.as_deref().unwrap_or_default(),
                        now,
                    )?;
                    Ok(SchedulerStep::AwaitingConfirmation(schedule))
                }
                DueDecision::Execute => {
                    schedule.status = Status::Due;
                    db::save_schedule(connection, &schedule)?;
                    db::audit(
                        connection,
                        Some(&schedule.id),
                        "due",
                        "Deadline reached",
                        now,
                    )?;
                    let due = schedule.clone();

                    schedule.status = Status::Dispatching;
                    schedule.dispatch_started_at = Some(now);
                    schedule.result_kind = Some("dispatching".into());
                    schedule.result_detail = Some(if schedule.simulation {
                        "Preparing simulated action".into()
                    } else {
                        "Preparing operating-system request".into()
                    });
                    db::save_schedule(connection, &schedule)?;
                    db::audit(
                        connection,
                        Some(&schedule.id),
                        "dispatching",
                        schedule.result_detail.as_deref().unwrap_or_default(),
                        now,
                    )?;
                    Ok(SchedulerStep::Dispatch {
                        due,
                        dispatching: schedule,
                    })
                }
            }
        }
        Status::RequestSent | Status::Completed | Status::Cancelled | Status::Failed => {
            Ok(SchedulerStep::Wait(Duration::from_secs(3600)))
        }
    }
}

pub fn perform_dispatch(
    schedule: &Schedule,
    adapter: &dyn ActionAdapter,
) -> Result<DispatchReceipt, String> {
    if schedule.simulation {
        Ok(actions::simulation_receipt(schedule.action))
    } else {
        adapter.dispatch(schedule.action)
    }
}

pub fn finalize_dispatch(
    connection: &Connection,
    schedule_id: &str,
    outcome: Result<DispatchReceipt, String>,
    now: i64,
) -> rusqlite::Result<(Schedule, ActionResult)> {
    let mut schedule =
        db::schedule_by_id(connection, schedule_id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)?;
    if schedule.status != Status::Dispatching {
        return Err(rusqlite::Error::InvalidQuery);
    }

    let (ok, kind, detail) = match outcome {
        Ok(receipt) => (true, receipt.kind.to_string(), receipt.detail),
        Err(error) => (false, "action_failed".into(), error),
    };
    schedule.status = if !ok {
        Status::Failed
    } else if kind.ends_with("_request_started") {
        Status::RequestSent
    } else {
        Status::Completed
    };
    schedule.finished_at = Some(now);
    schedule.result_kind = Some(kind.clone());
    let detail = if kind == "sleep_request_started" && schedule.wake_observed_at.is_some() {
        format!("{detail} Horune also observed the app resume after the request.")
    } else {
        detail
    };
    schedule.result_detail = Some(detail.clone());
    db::save_schedule(connection, &schedule)?;
    db::audit(
        connection,
        Some(schedule_id),
        "action_result",
        &format!("{kind}: {detail}"),
        now,
    )?;

    let result = ActionResult {
        schedule_id: schedule.id.clone(),
        ok,
        simulation: schedule.simulation,
        status: schedule.status,
        result_kind: kind,
        detail,
        occurred_at: now,
    };
    Ok((schedule, result))
}

pub async fn run(app: AppHandle) {
    let adapter = SystemActionAdapter;
    loop {
        let now = Utc::now().timestamp_millis();
        let step = {
            let state = app.state::<AppState>();
            match state.db.lock() {
                Ok(connection) => {
                    advance(&connection, now).unwrap_or(SchedulerStep::Wait(Duration::from_secs(1)))
                }
                Err(_) => SchedulerStep::Wait(Duration::from_secs(1)),
            }
        };

        let wait = match step {
            SchedulerStep::Wait(duration) => duration,
            SchedulerStep::Warning(schedule) => {
                let _ = app.emit("schedule://warning", schedule.clone());
                emit_schedule(&app, Some(schedule));
                Duration::from_millis(100)
            }
            SchedulerStep::AwaitingConfirmation(schedule) => {
                let _ = app.emit("schedule://due", schedule.clone());
                emit_schedule(&app, Some(schedule));
                Duration::from_secs(3600)
            }
            SchedulerStep::Dispatch { due, dispatching } => {
                let _ = app.emit("schedule://due", due);
                emit_schedule(&app, Some(dispatching.clone()));
                if dispatching.action == crate::models::Action::Sleep && !dispatching.simulation {
                    if let Ok(mut pending) = app.state::<AppState>().pending_wake.lock() {
                        *pending = Some(dispatching.id.clone());
                    }
                }
                let outcome = perform_dispatch(&dispatching, &adapter);
                let finalized = {
                    let state = app.state::<AppState>();
                    match state.db.lock() {
                        Ok(connection) => finalize_dispatch(
                            &connection,
                            &dispatching.id,
                            outcome,
                            Utc::now().timestamp_millis(),
                        )
                        .ok(),
                        Err(_) => None,
                    }
                };
                if let Some((schedule, result)) = finalized {
                    if !result.ok {
                        if let Ok(mut pending) = app.state::<AppState>().pending_wake.lock() {
                            if pending.as_deref() == Some(&schedule.id) {
                                *pending = None;
                            }
                        }
                    }
                    let _ = app.emit("schedule://action-result", result);
                    emit_schedule(&app, Some(schedule));
                }
                Duration::from_millis(100)
            }
        };

        let state = app.state::<AppState>();
        tokio::select! { _ = state.notify.notified() => {}, _ = tokio::time::sleep(wait) => {} }
    }
}

pub fn recover_overdue_at(connection: &Connection, now: i64) -> rusqlite::Result<()> {
    if let Some(mut schedule) = db::active_schedule(connection)? {
        let interrupted = matches!(schedule.status, Status::Due | Status::Dispatching);
        let overdue = schedule.status == Status::Scheduled && now >= schedule.scheduled_for;
        if interrupted || overdue {
            schedule.status = Status::AwaitingConfirmation;
            schedule.result_kind = Some(if interrupted {
                "interrupted_dispatch".into()
            } else {
                "overdue_recovery".into()
            });
            schedule.result_detail = Some(if interrupted {
                "A previous dispatch has no final result. Horune will not repeat it automatically."
                    .into()
            } else {
                "The app started after the deadline. Confirmation is required before any action."
                    .into()
            });
            db::save_schedule(connection, &schedule)?;
            db::audit(
                connection,
                Some(&schedule.id),
                "startup_recovery",
                schedule.result_detail.as_deref().unwrap_or_default(),
                now,
            )?;
        }
    }
    Ok(())
}

pub fn recover_overdue(connection: &Connection) -> rusqlite::Result<()> {
    recover_overdue_at(connection, Utc::now().timestamp_millis())
}

pub fn record_wake_observed(app: &AppHandle, now: i64) {
    let state = app.state::<AppState>();
    let schedule_id = match state.pending_wake.lock() {
        Ok(mut pending) => pending.take(),
        Err(_) => None,
    };
    let Some(schedule_id) = schedule_id else {
        return;
    };
    let updated = {
        let Ok(connection) = state.db.lock() else {
            return;
        };
        let Ok(Some(mut schedule)) = db::schedule_by_id(&connection, &schedule_id) else {
            return;
        };
        if schedule.action != crate::models::Action::Sleep
            || schedule.simulation
            || !matches!(schedule.status, Status::Dispatching | Status::RequestSent)
        {
            return;
        }
        schedule.wake_observed_at = Some(now);
        if schedule.status == Status::RequestSent {
            schedule.result_detail = Some("The operating-system Sleep request was dispatched and Horune observed the app resume afterward.".into());
        }
        if db::save_schedule(&connection, &schedule).is_err() {
            return;
        }
        let _ = db::audit(
            &connection,
            Some(&schedule.id),
            "wake_observed",
            schedule.result_detail.as_deref().unwrap_or_default(),
            now,
        );
        schedule
    };
    let _ = app.emit("schedule://wake-observed", updated.clone());
    emit_schedule(app, Some(updated));
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
    use crate::models::Action;
    use std::sync::atomic::{AtomicUsize, Ordering as AtomicOrdering};

    fn schedule(id: &str, scheduled_for: i64, simulation: bool) -> Schedule {
        Schedule {
            id: id.into(),
            action: Action::Sleep,
            mode: "duration".into(),
            created_at: 0,
            scheduled_for,
            warning_offset_ms: 60_000,
            status: Status::Scheduled,
            simulation,
            paused_remaining_ms: None,
            warned: false,
            message: None,
            dispatch_started_at: None,
            finished_at: None,
            result_kind: None,
            result_detail: None,
            wake_observed_at: None,
        }
    }

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        db::migrate(&connection).unwrap();
        connection
    }

    struct FakeAdapter {
        calls: AtomicUsize,
        outcome: Result<DispatchReceipt, String>,
    }

    impl ActionAdapter for FakeAdapter {
        fn dispatch(&self, _action: Action) -> Result<DispatchReceipt, String> {
            self.calls.fetch_add(1, AtomicOrdering::SeqCst);
            self.outcome.clone()
        }
    }

    #[test]
    fn due_timing_distinguishes_live_and_overdue() {
        assert_eq!(due_decision(900, 1_000), DueDecision::Wait);
        assert_eq!(due_decision(1_010, 1_000), DueDecision::Execute);
        assert_eq!(due_decision(31_001, 1_000), DueDecision::Confirm);
    }

    #[test]
    fn five_minute_schedule_warns_then_completes_in_simulation() {
        let connection = database();
        db::save_schedule(&connection, &schedule("five-minutes", 300_000, true)).unwrap();

        assert!(matches!(
            advance(&connection, 0).unwrap(),
            SchedulerStep::Wait(_)
        ));
        assert!(matches!(
            advance(&connection, 240_000).unwrap(),
            SchedulerStep::Warning(_)
        ));
        let dispatching = match advance(&connection, 300_000).unwrap() {
            SchedulerStep::Dispatch { dispatching, .. } => dispatching,
            other => panic!("expected dispatch, got {other:?}"),
        };
        assert_eq!(dispatching.status, Status::Dispatching);
        let adapter = FakeAdapter {
            calls: AtomicUsize::new(0),
            outcome: Err("must not be used in simulation".into()),
        };
        let outcome = perform_dispatch(&dispatching, &adapter);
        let (completed, result) =
            finalize_dispatch(&connection, &dispatching.id, outcome, 300_001).unwrap();
        assert_eq!(completed.status, Status::Completed);
        assert_eq!(
            completed.result_kind.as_deref(),
            Some("simulation_completed")
        );
        assert!(result.ok);
        assert_eq!(adapter.calls.load(AtomicOrdering::SeqCst), 0);
        assert!(db::active_schedule(&connection).unwrap().is_none());
        assert_eq!(db::history(&connection, 1).unwrap()[0].id, "five-minutes");
    }

    #[test]
    fn adapter_success_failure_and_return_after_wake_are_persisted() {
        for (id, outcome, expected_status, expected_kind) in [
            (
                "accepted",
                Ok(DispatchReceipt {
                    kind: "sleep_request_started",
                    detail: "request accepted".into(),
                }),
                Status::RequestSent,
                "sleep_request_started",
            ),
            (
                "failed",
                Err("access denied".into()),
                Status::Failed,
                "action_failed",
            ),
            (
                "after-wake",
                Ok(DispatchReceipt {
                    kind: "sleep_returned_after_resume",
                    detail: "adapter returned after resume".into(),
                }),
                Status::Completed,
                "sleep_returned_after_resume",
            ),
        ] {
            let connection = database();
            db::save_schedule(&connection, &schedule(id, 1_000, false)).unwrap();
            let dispatching = match advance(&connection, 1_000).unwrap() {
                SchedulerStep::Dispatch { dispatching, .. } => dispatching,
                other => panic!("expected dispatch, got {other:?}"),
            };
            let adapter = FakeAdapter {
                calls: AtomicUsize::new(0),
                outcome,
            };
            let receipt = perform_dispatch(&dispatching, &adapter);
            let (terminal, _) =
                finalize_dispatch(&connection, &dispatching.id, receipt, 1_001).unwrap();
            assert_eq!(terminal.status, expected_status);
            assert_eq!(terminal.result_kind.as_deref(), Some(expected_kind));
            assert_eq!(adapter.calls.load(AtomicOrdering::SeqCst), 1);
        }
    }

    #[test]
    fn wake_observed_before_adapter_returns_survives_finalization() {
        let connection = database();
        db::save_schedule(&connection, &schedule("resume-race", 1_000, false)).unwrap();
        let mut dispatching = match advance(&connection, 1_000).unwrap() {
            SchedulerStep::Dispatch { dispatching, .. } => dispatching,
            other => panic!("expected dispatch, got {other:?}"),
        };
        dispatching.wake_observed_at = Some(2_000);
        db::save_schedule(&connection, &dispatching).unwrap();
        let (result, _) = finalize_dispatch(
            &connection,
            &dispatching.id,
            Ok(DispatchReceipt {
                kind: "sleep_request_started",
                detail: "request launched".into(),
            }),
            2_100,
        )
        .unwrap();
        assert_eq!(result.status, Status::RequestSent);
        assert_eq!(result.wake_observed_at, Some(2_000));
        assert!(result
            .result_detail
            .unwrap()
            .contains("observed the app resume"));
    }

    #[test]
    fn interrupted_dispatch_is_never_repeated_after_restart() {
        let connection = database();
        db::save_schedule(&connection, &schedule("crash-safe", 1_000, false)).unwrap();
        assert!(matches!(
            advance(&connection, 1_000).unwrap(),
            SchedulerStep::Dispatch { .. }
        ));
        recover_overdue_at(&connection, 1_001).unwrap();
        let recovered = db::active_schedule(&connection).unwrap().unwrap();
        assert_eq!(recovered.status, Status::AwaitingConfirmation);
        assert_eq!(
            recovered.result_kind.as_deref(),
            Some("interrupted_dispatch")
        );
        assert!(matches!(
            advance(&connection, 1_002).unwrap(),
            SchedulerStep::Wait(_)
        ));
    }

    #[test]
    fn startup_recovery_requires_confirmation_even_inside_live_tolerance() {
        let connection = database();
        db::save_schedule(&connection, &schedule("restart", 1_000, false)).unwrap();
        recover_overdue_at(&connection, 1_001).unwrap();
        assert_eq!(
            db::active_schedule(&connection).unwrap().unwrap().status,
            Status::AwaitingConfirmation
        );
    }
}
