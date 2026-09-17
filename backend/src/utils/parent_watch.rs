#[cfg(target_os = "linux")]
use std::env;

#[cfg(target_os = "linux")]
pub fn install_parent_watch() {
    let Some(parent_pid) = env::var("APICOSTGUARD_PARENT_PID")
        .ok()
        .and_then(|v| v.parse::<i32>().ok())
    else {
        return;
    };

    unsafe {
        libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM);

        if libc::kill(parent_pid, 0) != 0 {
            std::process::exit(0);
        }
    }
}

#[cfg(not(target_os = "linux"))]
pub fn install_parent_watch() {}
