use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Runtime,
};

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "sync-now", "Sync now", true, Some("CmdOrCtrl+R"))?,
            &MenuItem::with_id(app, "force-sync", "Force re-sync last 30d", true, Some("CmdOrCtrl+Shift+R"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "import-fit", "Import .fit file…", true, None::<&str>)?,
        ],
    )?;

    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "nav-1", "Today", true, Some("CmdOrCtrl+1"))?,
            &MenuItem::with_id(app, "nav-2", "Activity", true, Some("CmdOrCtrl+2"))?,
            &MenuItem::with_id(app, "nav-3", "Training Load", true, Some("CmdOrCtrl+3"))?,
            &MenuItem::with_id(app, "nav-4", "Calendar", true, Some("CmdOrCtrl+4"))?,
            &MenuItem::with_id(app, "nav-5", "Health", true, Some("CmdOrCtrl+5"))?,
            &MenuItem::with_id(app, "nav-6", "Progress", true, Some("CmdOrCtrl+6"))?,
        ],
    )?;

    let help = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &MenuItem::with_id(app, "show-logs", "Show logs", true, None::<&str>)?,
        ],
    )?;

    Menu::with_items(app, &[&file, &view, &help])
}
