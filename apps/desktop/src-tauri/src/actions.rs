use crate::models::Action;
use std::process::Command;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DispatchReceipt {
    pub kind: &'static str,
    pub detail: String,
}

pub trait ActionAdapter {
    fn dispatch(&self, action: Action) -> Result<DispatchReceipt, String>;
}

pub struct SystemActionAdapter;

impl ActionAdapter for SystemActionAdapter {
    fn dispatch(&self, action: Action) -> Result<DispatchReceipt, String> {
        match action {
            Action::Reminder => Ok(DispatchReceipt {
                kind: "reminder_delivered",
                detail: "Reminder delivered locally".into(),
            }),
            #[cfg(target_os = "windows")]
            Action::Lock => request(
                "rundll32.exe",
                &["user32.dll,LockWorkStation"],
                "lock_request_started",
            ),
            #[cfg(target_os = "windows")]
            Action::Shutdown => request(
                "shutdown.exe",
                &["/s", "/t", "0"],
                "shutdown_request_started",
            ),
            #[cfg(target_os = "windows")]
            Action::Sleep => request(
                "rundll32.exe",
                &["powrprof.dll,SetSuspendState", "0,1,0"],
                "sleep_request_started",
            ),
            #[cfg(target_os = "macos")]
            Action::Lock => request(
                "/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession",
                &["-suspend"],
                "lock_request_started",
            ),
            #[cfg(target_os = "macos")]
            Action::Shutdown => request(
                "osascript",
                &["-e", "tell application \"System Events\" to shut down"],
                "shutdown_request_started",
            ),
            #[cfg(target_os = "macos")]
            Action::Sleep => request("pmset", &["sleepnow"], "sleep_request_started"),
            #[cfg(not(any(target_os = "windows", target_os = "macos")))]
            _ => Err("This system action is not implemented on Linux yet".into()),
        }
    }
}

pub fn simulation_receipt(action: Action) -> DispatchReceipt {
    DispatchReceipt {
        kind: "simulation_completed",
        detail: format!(
            "Simulation completed: {} was recorded without sending an operating-system request",
            action.as_str()
        ),
    }
}

fn request(program: &str, args: &[&str], kind: &'static str) -> Result<DispatchReceipt, String> {
    Command::new(program)
        .args(args)
        .spawn()
        .map(|child| DispatchReceipt {
            kind,
            detail: format!(
                "Operating-system request started via {program} (pid {}). This confirms dispatch, not that the machine completed the power transition or later resumed.",
                child.id()
            ),
        })
        .map_err(|error| format!("Could not start {program}: {error}"))
}
