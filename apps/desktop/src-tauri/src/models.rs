use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Sleep,
    Shutdown,
    Lock,
    Reminder,
}

impl Action {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Sleep => "sleep",
            Self::Shutdown => "shutdown",
            Self::Lock => "lock",
            Self::Reminder => "reminder",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "sleep" => Some(Self::Sleep),
            "shutdown" => Some(Self::Shutdown),
            "lock" => Some(Self::Lock),
            "reminder" => Some(Self::Reminder),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Scheduled,
    Paused,
    AwaitingConfirmation,
    Completed,
    Cancelled,
    Failed,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Scheduled => "scheduled",
            Self::Paused => "paused",
            Self::AwaitingConfirmation => "awaiting_confirmation",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::Failed => "failed",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "scheduled" => Some(Self::Scheduled),
            "paused" => Some(Self::Paused),
            "awaiting_confirmation" => Some(Self::AwaitingConfirmation),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub id: String,
    pub action: Action,
    pub mode: String,
    pub created_at: i64,
    pub scheduled_for: i64,
    pub warning_offset_ms: i64,
    pub status: Status,
    pub simulation: bool,
    pub paused_remaining_ms: Option<i64>,
    pub warned: bool,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduleInput {
    pub action: Action,
    pub mode: String,
    pub scheduled_for: i64,
    pub warning_offset_ms: i64,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub platform: &'static str,
    pub sleep: bool,
    pub shutdown: bool,
    pub lock: bool,
    pub reminder: bool,
    pub simulation: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActionResult {
    pub schedule_id: String,
    pub ok: bool,
    pub simulation: bool,
    pub detail: String,
}
