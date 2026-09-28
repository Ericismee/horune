use crate::models::{Action, Schedule, Status};
use rusqlite::{params, Connection, OptionalExtension};

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
    Ok(())
}

pub fn save_schedule(connection: &Connection, schedule: &Schedule) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT INTO schedules (id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(id) DO UPDATE SET scheduled_for=excluded.scheduled_for, status=excluded.status,
           simulation=excluded.simulation, paused_remaining_ms=excluded.paused_remaining_ms, warned=excluded.warned, message=excluded.message",
        params![schedule.id, schedule.action.as_str(), schedule.mode, schedule.created_at, schedule.scheduled_for,
            schedule.warning_offset_ms, schedule.status.as_str(), schedule.simulation, schedule.paused_remaining_ms, schedule.warned, schedule.message]
    )?;
    Ok(())
}

pub fn cancel_open_schedules(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute(
        "UPDATE schedules SET status='cancelled' WHERE status IN ('scheduled', 'paused', 'awaiting_confirmation')",
        []
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
    })
}

pub fn active_schedule(connection: &Connection) -> rusqlite::Result<Option<Schedule>> {
    connection.query_row(
        "SELECT id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message
         FROM schedules WHERE status IN ('scheduled', 'paused', 'awaiting_confirmation') ORDER BY created_at DESC LIMIT 1",
        [], row_to_schedule
    ).optional()
}

pub fn history(connection: &Connection, limit: usize) -> rusqlite::Result<Vec<Schedule>> {
    let mut statement = connection.prepare(
        "SELECT id, action, mode, created_at, scheduled_for, warning_offset_ms, status, simulation, paused_remaining_ms, warned, message
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
