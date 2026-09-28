use crate::models::Action;
use std::process::Command;

pub fn execute(action: Action, simulation: bool) -> Result<String, String> {
    if simulation {
        return Ok(format!("Simulation: {} was not executed", action.as_str()));
    }
    match action {
        Action::Reminder => Ok("Reminder delivered".into()),
        #[cfg(target_os = "windows")]
        Action::Lock => run("rundll32.exe", &["user32.dll,LockWorkStation"]),
        #[cfg(target_os = "windows")]
        Action::Shutdown => run("shutdown.exe", &["/s", "/t", "0"]),
        #[cfg(target_os = "windows")]
        Action::Sleep => run("rundll32.exe", &["powrprof.dll,SetSuspendState", "0,1,0"]),
        #[cfg(target_os = "macos")]
        Action::Lock => run(
            "/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession",
            &["-suspend"],
        ),
        #[cfg(target_os = "macos")]
        Action::Shutdown => run(
            "osascript",
            &["-e", "tell application \"System Events\" to shut down"],
        ),
        #[cfg(target_os = "macos")]
        Action::Sleep => run("pmset", &["sleepnow"]),
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        _ => Err("This system action is not implemented on Linux yet".into()),
    }
}

fn run(program: &str, args: &[&str]) -> Result<String, String> {
    Command::new(program)
        .args(args)
        .spawn()
        .map(|_| format!("{} requested", program))
        .map_err(|error| format!("Could not run {}: {}", program, error))
}
