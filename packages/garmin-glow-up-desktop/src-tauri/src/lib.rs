pub mod menu;
pub mod secure;
pub mod sidecar;

use tauri::RunEvent;
use tauri_plugin_dialog::DialogExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(sidecar::SidecarHandle::new())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = sidecar::start(&handle).await {
                    log::error!("Sidecar start failed: {e}");
                    handle
                        .dialog()
                        .message(format!("Sync service failed to start: {e}"))
                        .show(|_| {});
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            secure::get_token,
            secure::clear_credentials,
            sidecar::restart_sync,
        ])
        .build(tauri::generate_context!())
        .expect("tauri build failed")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                sidecar::shutdown(app);
            }
        });
}
