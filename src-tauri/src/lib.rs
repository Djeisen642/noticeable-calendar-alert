mod oauth;

use tauri::{
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow,
};

/// Holds the single tray auth item so the frontend can relabel it as the
/// sign-in state changes (e.g. flip to "Sign out" after a successful sign-in).
struct AuthMenuItem(MenuItem<tauri::Wry>);

/// Holds the two disabled status lines at the top of the tray menu so the
/// frontend can keep them current (connection/sync health + next meeting).
struct StatusMenuItems {
    connection: MenuItem<tauri::Wry>,
    meeting: MenuItem<tauri::Wry>,
}

/// Relabel the tray auth item to reflect the current sign-in state.
///
/// The frontend owns the auth state and the label text (see `lib/tray.ts`); we
/// just apply it. `MenuItem` exposes `set_text` but not per-item visibility, so
/// a single toggling item is how we avoid showing sign-in *and* sign-out at once.
#[tauri::command]
fn set_auth_menu_label(label: String, item: tauri::State<'_, AuthMenuItem>) -> Result<(), String> {
    item.0.set_text(label).map_err(|err| err.to_string())
}

/// Update the two disabled tray status lines. Text is composed in the frontend
/// (see `formatTrayStatus` in `lib/tray.ts`); we only apply it here.
#[tauri::command]
fn set_tray_status(
    connection: String,
    meeting: String,
    items: tauri::State<'_, StatusMenuItems>,
) -> Result<(), String> {
    items
        .connection
        .set_text(connection)
        .map_err(|err| err.to_string())?;
    items
        .meeting
        .set_text(meeting)
        .map_err(|err| err.to_string())
}

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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            set_click_through,
            set_auth_menu_label,
            set_tray_status,
            oauth::oauth_capture,
            oauth::token_save,
            oauth::token_load,
            oauth::token_clear,
        ])
        .setup(|app| {
            // --- System tray ---------------------------------------------------
            // Two disabled status lines (kept current via `set_tray_status`) sit
            // above a single item that toggles between sign-in and sign-out. The
            // frontend relabels that item via `set_auth_menu_label` as the state
            // changes, so the menu never shows both actions at once.
            let status_conn =
                MenuItem::with_id(app, "status_conn", "Not signed in", false, None::<&str>)?;
            let status_meeting = MenuItem::with_id(
                app,
                "status_meeting",
                "Sign in to see meetings",
                false,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let auth_item =
                MenuItem::with_id(app, "auth", "Sign in with Google", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Test Overlay", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &status_conn as &dyn IsMenuItem<tauri::Wry>,
                    &status_meeting,
                    &separator,
                    &auth_item,
                    &show_item,
                    &quit_item,
                ],
            )?;

            // Keep handles to the mutable items so the update commands can reach
            // them after setup returns.
            app.manage(AuthMenuItem(auth_item.clone()));
            app.manage(StatusMenuItems {
                connection: status_conn.clone(),
                meeting: status_meeting.clone(),
            });

            let mut tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Noticeable Calendar Alert")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "auth" => {
                        // The overlay webview decides sign-in vs sign-out from
                        // its own state and runs the interactive OAuth flow.
                        let _ = app.emit("google-auth-toggle", ());
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("overlay") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });

            // The icon set is generated via `npm run tauri icon` and isn't
            // committed, so degrade gracefully instead of panicking if absent.
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }

            tray.build(app)?;

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
