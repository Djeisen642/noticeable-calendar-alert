// Prevents an extra console window on Windows in release builds — this is a
// background tray utility, not a console app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    noticeable_calendar_alert_lib::run()
}
