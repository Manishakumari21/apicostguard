use std::env;

/// If the backend was spawned by the desktop app, make the kernel deliver
/// SIGTERM when the parent process dies, so the gateway can never outlive its
/// parent - even if the parent crashes or is killed.
pub fn install_parent_watch() {
    let Some(parent_pid) = env::var("APICOSTGUARD_PARENT_PID")
        .ok()
        .and_then(|v| v.parse::<i32>().ok())
    else {
        return;
    };

    unsafe {
        libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM);
        // Race guard: the parent may have exited between our spawn and prctl.
        if libc::kill(parent_pid, 0) != 0 {
            std::process::exit(0);
        }
    }
}
