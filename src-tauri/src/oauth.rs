//! Native OAuth helpers: a one-shot loopback redirect listener and keychain
//! storage for the token bundle.
//!
//! REVIEWED-BUT-UNRUN: this compiles under the CI `cargo check` job but the
//! live OAuth round-trip and the OS keychain access must be verified on a real
//! machine (Windows Credential Manager / macOS Keychain / Linux Secret Service).

use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, Instant};

use keyring::Entry;
use serde::Serialize;

const KEYCHAIN_SERVICE: &str = "noticeable-calendar-alert";
const KEYCHAIN_ACCOUNT: &str = "google-oauth-token";

/// How long to wait for the browser to deliver the OAuth redirect before giving
/// up. Without this the accept() would block forever if the user closes the
/// consent tab, leaking the thread *and* keeping the port bound so the next
/// sign-in attempt fails with "address in use".
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(180);
/// Idle poll interval while waiting on the non-blocking listener.
const POLL_INTERVAL: Duration = Duration::from_millis(100);
/// Cap a single client read so a slow/partial connection can't wedge the loop.
const READ_TIMEOUT: Duration = Duration::from_secs(5);

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

    let deadline = Instant::now() + CAPTURE_TIMEOUT;
    loop {
        if Instant::now() >= deadline {
            return Err("Timed out waiting for the OAuth redirect".to_string());
        }
        match listener.accept() {
            Ok((stream, _addr)) => {
                // A connection that doesn't carry both code+state is a favicon
                // probe, a stray request, or a localhost CSRF poke — answer it
                // and keep waiting for the genuine redirect rather than letting
                // it consume our one shot.
                if let Some(redirect) = handle_connection(stream) {
                    return Ok(redirect);
                }
            }
            Err(ref err) if err.kind() == ErrorKind::WouldBlock => thread::sleep(POLL_INTERVAL),
            Err(err) => return Err(err.to_string()),
        }
    }
}

/// Read one HTTP request, reply, and return the `(code, state)` if present.
fn handle_connection(mut stream: TcpStream) -> Option<OauthRedirect> {
    // The stream is inherited non-blocking from the listener; restore blocking
    // reads but bound them with a timeout so a slow client can't hang us.
    let _ = stream.set_nonblocking(false);
    let _ = stream.set_read_timeout(Some(READ_TIMEOUT));

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

    let captured = matches!((&code, &state), (Some(_), Some(_)));
    write_response(&mut stream, captured);

    match (code, state) {
        (Some(code), Some(state)) => Some(OauthRedirect { code, state }),
        _ => None,
    }
}

/// Send a tiny HTML page so the browser tab shows a sensible result.
fn write_response(stream: &mut TcpStream, captured: bool) {
    let html = if captured {
        "<!doctype html><meta charset=utf-8>\
        <body style=\"font-family:system-ui;padding:3rem;text-align:center\">\
        <h2>Signed in \u{2713}</h2>\
        <p>You can close this tab and return to Noticeable Calendar Alert.</p>"
    } else {
        "<!doctype html><meta charset=utf-8>\
        <body style=\"font-family:system-ui;padding:3rem;text-align:center\">\
        <p>Waiting for sign-in\u{2026}</p>"
    };
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
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
