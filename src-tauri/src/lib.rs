use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewWindow,
};

/// Toggle mouse click-through for a window.
///
/// When `enabled` is `true`, the window ignores cursor events so clicks pass
/// through to whatever is underneath. The frontend turns this OFF while the
/// speech bubble is visible (so "Join Call" is clickable) and back ON once the
/// character walks away.
#[tauri::command]
fn set_click_through(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_click_through])
        .setup(|app| {
            // --- System tray ---------------------------------------------------
            let show_item = MenuItem::with_id(app, "show", "Test Overlay", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().expect("default icon").clone())
                .tooltip("Noticeable Calendar Alert")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("overlay") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // --- Overlay window ------------------------------------------------
            // The window is declared (hidden) in tauri.conf.json. Park it on the
            // right edge of the primary monitor and start in click-through mode.
            if let Some(overlay) = app.get_webview_window("overlay") {
                position_overlay_right(&overlay);
                let _ = overlay.set_ignore_cursor_events(true);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Anchor the overlay against the right edge of its current monitor.
fn position_overlay_right(window: &WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };

    let screen = monitor.size();
    let x = (screen.width as i32 - size.width as i32).max(0);
    let y = (screen.height as i32 - size.height as i32).max(0);

    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
}
