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
    Due,
    Dispatching,
    AwaitingConfirmation,
    RequestSent,
    Completed,
    Cancelled,
    Failed,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Scheduled => "scheduled",
            Self::Paused => "paused",
            Self::Due => "due",
            Self::Dispatching => "dispatching",
            Self::AwaitingConfirmation => "awaiting_confirmation",
            Self::RequestSent => "request_sent",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::Failed => "failed",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "scheduled" => Some(Self::Scheduled),
            "paused" => Some(Self::Paused),
            "due" => Some(Self::Due),
            "dispatching" => Some(Self::Dispatching),
            "awaiting_confirmation" => Some(Self::AwaitingConfirmation),
            "request_sent" => Some(Self::RequestSent),
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
    pub dispatch_started_at: Option<i64>,
    pub finished_at: Option<i64>,
    pub result_kind: Option<String>,
    pub result_detail: Option<String>,
    pub wake_observed_at: Option<i64>,
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
    pub status: Status,
    pub result_kind: String,
    pub detail: String,
    pub occurred_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSettings {
    pub overlay_auto_hide: bool,
    pub overlay_controls_timeout_ms: u64,
    pub overlay_clock_visible: bool,
    pub overlay_always_on_top: bool,
    pub selected_theme_id: String,
    pub active_theme_json: Option<String>,
    pub motion_mode: String,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            overlay_auto_hide: true,
            overlay_controls_timeout_ms: 3_500,
            overlay_clock_visible: true,
            overlay_always_on_top: true,
            selected_theme_id: "minimal-dawn".into(),
            active_theme_json: None,
            motion_mode: "subtle".into(),
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDesktopSettings {
    pub overlay_auto_hide: Option<bool>,
    pub overlay_controls_timeout_ms: Option<u64>,
    pub overlay_clock_visible: Option<bool>,
    pub overlay_always_on_top: Option<bool>,
    pub selected_theme_id: Option<String>,
    pub active_theme_json: Option<Option<String>>,
    pub motion_mode: Option<String>,
}
