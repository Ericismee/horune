use crate::models::{Action, DesktopSettings, Schedule, Status, UpdateDesktopSettings};
use rusqlite::{params, Connection, OptionalExtension};

fn ensure_schedule_column(
    connection: &Connection,
    name: &str,
    definition: &str,
) -> rusqlite::Result<()> {
    let mut statement = connection.prepare("PRAGMA table_info(schedules)")?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    if !columns.iter().any(|column| column == name) {
        connection.execute_batch(&format!("ALTER TABLE schedules ADD COLUMN {definition}"))?;
    }
    Ok(())
}

pub fn migrate(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS schedules (
           id TEXT PRIMARY KEY,
           action TEXT NOT NULL,
           mode TEXT NOT NULL,
           created_at INTEGER NOT NULL,
           scheduled_for INTEGER NOT NULL,
           warning_offset_ms INTEGER NOT NULL,
           status TEXT NOT NULL,
           simulation INTEGER NOT NULL,
           paused_remaining_ms INTEGER,
           warned INTEGER NOT NULL DEFAULT 0,
           message TEXT
         );
         CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status, scheduled_for);
         CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS audit_events (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           schedule_id TEXT,
           event TEXT NOT NULL,
           detail TEXT,
           created_at INTEGER NOT NULL
         );",
    )?;
    ensure_schedule_column(
        connection,
        "dispatch_started_at",
        "dispatch_started_at INTEGER",
    )?;
    ensure_schedule_column(connection, "finished_at", "finished_at INTEGER")?;
    ensure_schedule_column(connection, "result_kind", "result_kind TEXT")?;
    ensure_schedule_column(connection, "result_detail", "result_detail TEXT")?;
    ensure_schedule_column(connection, "wake_observed_at", "wake_observed_at INTEGER")?;
    Ok(())
}

pub fn save_schedule(connection: &Connection, schedule: &Schedule) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT INTO schedules (id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message, dispatch_started_at, finished_at, result_kind, result_detail, wake_observed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
         ON CONFLICT(id) DO UPDATE SET scheduled_for=excluded.scheduled_for, status=excluded.status,
           simulation=excluded.simulation, paused_remaining_ms=excluded.paused_remaining_ms, warned=excluded.warned, message=excluded.message,
           dispatch_started_at=excluded.dispatch_started_at, finished_at=excluded.finished_at, result_kind=excluded.result_kind,
           result_detail=excluded.result_detail, wake_observed_at=excluded.wake_observed_at",
        params![schedule.id, schedule.action.as_str(), schedule.mode, schedule.created_at, schedule.scheduled_for,
            schedule.warning_offset_ms, schedule.status.as_str(), schedule.simulation, schedule.paused_remaining_ms, schedule.warned,
            schedule.message, schedule.dispatch_started_at, schedule.finished_at, schedule.result_kind, schedule.result_detail,
            schedule.wake_observed_at]
    )?;
    Ok(())
}

pub fn cancel_open_schedules(connection: &Connection, now: i64) -> rusqlite::Result<()> {
    connection.execute(
        "UPDATE schedules SET status='cancelled', finished_at=?1, result_kind='cancelled', result_detail='Replaced by a new schedule' WHERE status IN ('scheduled', 'paused', 'awaiting_confirmation')",
        [now]
    )?;
    Ok(())
}

fn row_to_schedule(row: &rusqlite::Row<'_>) -> rusqlite::Result<Schedule> {
    let action: String = row.get(1)?;
    let status: String = row.get(6)?;
    Ok(Schedule {
        id: row.get(0)?,
        action: Action::parse(&action).unwrap_or(Action::Reminder),
        mode: row.get(2)?,
        created_at: row.get(3)?,
        scheduled_for: row.get(4)?,
        warning_offset_ms: row.get(5)?,
        status: Status::parse(&status).unwrap_or(Status::Failed),
        simulation: row.get(7)?,
        paused_remaining_ms: row.get(8)?,
        warned: row.get(9)?,
        message: row.get(10)?,
        dispatch_started_at: row.get(11)?,
        finished_at: row.get(12)?,
        result_kind: row.get(13)?,
        result_detail: row.get(14)?,
        wake_observed_at: row.get(15)?,
    })
}

pub fn active_schedule(connection: &Connection) -> rusqlite::Result<Option<Schedule>> {
    connection.query_row(
        "SELECT id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message,
                dispatch_started_at, finished_at, result_kind, result_detail, wake_observed_at
         FROM schedules WHERE status IN ('scheduled', 'paused', 'due', 'dispatching', 'awaiting_confirmation') ORDER BY created_at DESC LIMIT 1",
        [], row_to_schedule
    ).optional()
}

pub fn schedule_by_id(
    connection: &Connection,
    schedule_id: &str,
) -> rusqlite::Result<Option<Schedule>> {
    connection
        .query_row(
            "SELECT id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message,
                    dispatch_started_at, finished_at, result_kind, result_detail, wake_observed_at
             FROM schedules WHERE id=?1",
            [schedule_id],
            row_to_schedule,
        )
        .optional()
}

pub fn history(connection: &Connection, limit: usize) -> rusqlite::Result<Vec<Schedule>> {
    let mut statement = connection.prepare(
        "SELECT id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message,
                dispatch_started_at, finished_at, result_kind, result_detail, wake_observed_at
         FROM schedules ORDER BY created_at DESC LIMIT ?1"
    )?;
    let schedules = statement
        .query_map([limit as i64], row_to_schedule)?
        .collect();
    schedules
}

pub fn set_setting(connection: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    connection.execute("INSERT INTO settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", params![key, value])?;
    Ok(())
}

pub fn setting(connection: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    connection
        .query_row("SELECT value FROM settings WHERE key=?1", [key], |row| {
            row.get(0)
        })
        .optional()
}

fn setting_bool(connection: &Connection, key: &str, fallback: bool) -> rusqlite::Result<bool> {
    Ok(setting(connection, key)?
        .map(|value| value == "true")
        .unwrap_or(fallback))
}

pub fn desktop_settings(connection: &Connection) -> rusqlite::Result<DesktopSettings> {
    let defaults = DesktopSettings::default();
    let timeout = setting(connection, "overlay_controls_timeout_ms")?
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(defaults.overlay_controls_timeout_ms)
        .clamp(1_000, 15_000);
    let motion = setting(connection, "motion_mode")?.unwrap_or(defaults.motion_mode);
    Ok(DesktopSettings {
        overlay_auto_hide: setting_bool(
            connection,
            "overlay_auto_hide",
            defaults.overlay_auto_hide,
        )?,
        overlay_controls_timeout_ms: timeout,
        overlay_clock_visible: setting_bool(
            connection,
            "overlay_clock_visible",
            defaults.overlay_clock_visible,
        )?,
        overlay_always_on_top: setting_bool(
            connection,
            "overlay_always_on_top",
            defaults.overlay_always_on_top,
        )?,
        selected_theme_id: setting(connection, "selected_theme_id")?
            .unwrap_or(defaults.selected_theme_id),
        active_theme_json: setting(connection, "active_theme_json")?,
        motion_mode: if matches!(motion.as_str(), "static" | "subtle" | "full") {
            motion
        } else {
            "subtle".into()
        },
    })
}

fn valid_theme_id(value: &str) -> bool {
    (2..=64).contains(&value.len())
        && value.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
        })
}

pub fn update_desktop_settings(
    connection: &Connection,
    update: &UpdateDesktopSettings,
) -> rusqlite::Result<DesktopSettings> {
    connection.execute_batch("BEGIN IMMEDIATE")?;
    let result = (|| {
        if let Some(value) = update.overlay_auto_hide {
            set_setting(
                connection,
                "overlay_auto_hide",
                if value { "true" } else { "false" },
            )?;
        }
        if let Some(value) = update.overlay_controls_timeout_ms {
            set_setting(
                connection,
                "overlay_controls_timeout_ms",
                &value.clamp(1_000, 15_000).to_string(),
            )?;
        }
        if let Some(value) = update.overlay_clock_visible {
            set_setting(
                connection,
                "overlay_clock_visible",
                if value { "true" } else { "false" },
            )?;
        }
        if let Some(value) = update.overlay_always_on_top {
            set_setting(
                connection,
                "overlay_always_on_top",
                if value { "true" } else { "false" },
            )?;
        }
        if let Some(value) = update.selected_theme_id.as_deref() {
            if !valid_theme_id(value) {
                return Err(rusqlite::Error::InvalidParameterName(
                    "selected_theme_id".into(),
                ));
            }
            set_setting(connection, "selected_theme_id", value)?;
        }
        if let Some(value) = &update.active_theme_json {
            match value {
                Some(json) if json.len() <= 256 * 1024 => {
                    set_setting(connection, "active_theme_json", json)?
                }
                Some(_) => {
                    return Err(rusqlite::Error::InvalidParameterName(
                        "active_theme_json".into(),
                    ))
                }
                None => {
                    connection.execute("DELETE FROM settings WHERE key='active_theme_json'", [])?;
                }
            }
        }
        if let Some(value) = update.motion_mode.as_deref() {
            if !matches!(value, "static" | "subtle" | "full") {
                return Err(rusqlite::Error::InvalidParameterName("motion_mode".into()));
            }
            set_setting(connection, "motion_mode", value)?;
        }
        desktop_settings(connection)
    })();
    match result {
        Ok(settings) => {
            connection.execute_batch("COMMIT")?;
            Ok(settings)
        }
        Err(error) => {
            let _ = connection.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}

pub fn audit(
    connection: &Connection,
    schedule_id: Option<&str>,
    event: &str,
    detail: &str,
    now: i64,
) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT INTO audit_events(schedule_id,event,detail,created_at) VALUES(?1,?2,?3,?4)",
        params![schedule_id, event, detail, now],
    )?;
    Ok(())
}
