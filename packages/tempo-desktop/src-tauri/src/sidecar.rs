use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

pub struct SidecarHandle {
    child: Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>,
}

impl SidecarHandle {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
        }
    }
}

pub async fn start(app: &AppHandle) -> Result<(), anyhow::Error> {
    // In dev mode with an external sidecar, skip spawn.
    if std::env::var("TEMPO_DEV_SIDECAR").as_deref() == Ok("external") {
        app.emit("sync-ready", "dev-token").ok();
        return Ok(());
    }

    let sidecar_cmd = app.shell().sidecar("tempo-sync")?;
    let (mut rx, child) = sidecar_cmd.args(["serve"]).spawn()?;

    let handle = app.app_handle().clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            use tauri_plugin_shell::process::CommandEvent;
            if let CommandEvent::Stdout(line) = event {
                let line = String::from_utf8_lossy(&line).into_owned();
                if line.starts_with("TEMPO-READY") {
                    // Parse: TEMPO-READY token=<hex> port=<n>
                    if let Some(token) = line.split_whitespace()
                        .find(|s| s.starts_with("token="))
                        .and_then(|s| s.strip_prefix("token="))
                    {
                        // Stash in secure storage
                        let _ = crate::secure::store_token(token);
                        handle.emit("sync-ready", token).ok();
                    }
                }
            }
        }
    });

    // Store handle for shutdown
    if let Some(state) = app.try_state::<SidecarHandle>() {
        *state.child.lock().unwrap() = Some(child);
    }

    Ok(())
}

#[tauri::command]
pub fn restart_sync(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let _ = start(&app).await;
    });
}

pub fn shutdown(app: &AppHandle) {
    if let Some(state) = app.try_state::<SidecarHandle>() {
        if let Some(child) = state.child.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}
