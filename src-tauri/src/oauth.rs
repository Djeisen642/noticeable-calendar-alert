//! Native OAuth helpers: a one-shot loopback redirect listener and keychain
//! storage for the token bundle.
//!
//! REVIEWED-BUT-UNRUN: this compiles under the CI `cargo check` job but the
//! live OAuth round-trip and the OS keychain access must be verified on a real
//! machine (Windows Credential Manager / macOS Keychain / Linux Secret Service).

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};

use keyring::Entry;
use serde::Serialize;

const KEYCHAIN_SERVICE: &str = "noticeable-calendar-alert";
const KEYCHAIN_ACCOUNT: &str = "google-oauth-token";

/// Give up if the redirect never arrives (user cancelled, browser failed, …)
/// so the listener thread and the bound port are always reclaimed.
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(180);
/// How long a single connected client may take to send its request line.
const CLIENT_READ_TIMEOUT: Duration = Duration::from_secs(5);
const ACCEPT_POLL_INTERVAL: Duration = Duration::from_millis(100);

const SUCCESS_HTML: &str = "<!doctype html><meta charset=utf-8>\
    <body style=\"font-family:system-ui;padding:3rem;text-align:center\">\
    <h2>Signed in \u{2713}</h2>\
    <p>You can close this tab and return to Noticeable Calendar Alert.</p>";

#[derive(Serialize)]
pub struct OauthRedirect {
    pub code: String,
    pub state: String,
}

/// Bind a loopback listener and resolve once the OAuth redirect arrives.
///
/// Runs the blocking accept on a worker thread so it doesn't stall the async
/// runtime. The frontend starts this *before* opening the consent browser tab.
#[tauri::command]
pub async fn oauth_capture(port: u16) -> Result<OauthRedirect, String> {
    tauri::async_runtime::spawn_blocking(move || capture_once(port))
        .await
        .map_err(|err| err.to_string())?
}

fn capture_once(port: u16) -> Result<OauthRedirect, String> {
    let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|err| err.to_string())?;
    listener.set_nonblocking(true).map_err(|err| err.to_string())?;

    // Accept connections until one carries the redirect, or we time out. This
    // tolerates stray local probes (favicon requests, port scanners) that would
    // otherwise derail a single blocking accept, and guarantees the thread/port
    // are released even if the user never completes consent.
    let deadline = Instant::now() + CAPTURE_TIMEOUT;
    loop {
        if Instant::now() >= deadline {
            return Err("Timed out waiting for the OAuth redirect".to_string());
        }
        match listener.accept() {
            Ok((stream, _addr)) => {
                if let Some(redirect) = handle_connection(stream) {
                    return Ok(redirect);
                }
                // No code in this request — keep waiting for the real redirect.
            }
            Err(ref err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(ACCEPT_POLL_INTERVAL);
            }
            Err(err) => return Err(err.to_string()),
        }
    }
}

/// Read one HTTP request and, if it carries `code` + `state`, answer with the
/// success page and return them. Returns `None` for anything else.
fn handle_connection(mut stream: TcpStream) -> Option<OauthRedirect> {
    let _ = stream.set_nonblocking(false);
    let _ = stream.set_read_timeout(Some(CLIENT_READ_TIMEOUT));

    let mut buffer = [0u8; 4096];
    let read = stream.read(&mut buffer).ok()?;
    let request = String::from_utf8_lossy(&buffer[..read]);

    // The request line looks like: `GET /?code=...&state=... HTTP/1.1`.
    let target = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("");
    let query = target.split_once('?').map_or("", |(_, q)| q);

    let mut code = None;
    let mut state = None;
    for pair in query.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            let decoded = urlencoding::decode(value)
                .map(|cow| cow.into_owned())
                .unwrap_or_default();
            match key {
                "code" => code = Some(decoded),
                "state" => state = Some(decoded),
                _ => {}
            }
        }
    }

    let (code, state) = (code?, state?);

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        SUCCESS_HTML.len(),
        SUCCESS_HTML
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();

    Some(OauthRedirect { code, state })
}

fn entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|err| err.to_string())
}

/// Persist the serialized token bundle in the OS keychain.
#[tauri::command]
pub fn token_save(value: String) -> Result<(), String> {
    entry()?.set_password(&value).map_err(|err| err.to_string())
}

/// Load the serialized token bundle, or `None` if the user hasn't signed in.
#[tauri::command]
pub fn token_load() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

/// Delete the stored token (used on sign-out or after a hard 401).
#[tauri::command]
pub fn token_clear() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}
