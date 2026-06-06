use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, LogicalPosition, Manager};

use crate::{
    db::QuranDb,
    settings::{AppStore, AyahReference},
    stats::StatsStore,
};

static NOTIFICATION_SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let interval_minutes = app
                .state::<AppStore>()
                .settings()
                .map(|s| s.interval_minutes)
                .unwrap_or(30);

            tokio::time::sleep(Duration::from_secs(u64::from(interval_minutes) * 60)).await;

            expire_pause_if_needed(&app);

            let settings = app
                .state::<AppStore>()
                .settings()
                .unwrap_or_default();

            if settings.pause_until != "none" {
                continue;
            }

            if settings.suppress_during_fullscreen && is_fullscreen_active() {
                continue;
            }

            advance_ayah(&app);
            show_notification(&app);
        }
    });
}

fn expire_pause_if_needed(app: &AppHandle) {
    let store = app.state::<AppStore>();
    if let Ok(mut settings) = store.settings() {
        if settings.pause_until != "none"
            && settings.pause_expires_at > 0
            && now_unix() >= settings.pause_expires_at
        {
            settings.pause_until = "none".to_string();
            settings.pause_expires_at = 0;
            let _ = store.update_settings(settings);
        }
    }
}

fn advance_ayah(app: &AppHandle) {
    let db = app.state::<QuranDb>();
    let store = app.state::<AppStore>();

    if let Ok(current) = store.current_ayah() {
        if let Ok(next) = db.next_ayah(current.surah_id, current.ayah_id) {
            let _ = store.set_current_ayah(AyahReference {
                surah_id: next.surah_id,
                ayah_id: next.ayah_id,
            });
        }
    }
}

/// Advance to the next ayah and show the notification immediately.
/// Used by the global shortcut and tray "Next Ayah" action.
pub fn advance_and_notify(app: &AppHandle) {
    advance_ayah(app);
    show_notification(app);
}

pub fn show_notification(app: &AppHandle) {
    let window = match app.get_webview_window("notification") {
        Some(w) => w,
        None => return,
    };

    if let Err(e) = position_window(app, &window) {
        eprintln!("Failed to position notification window: {e}");
    }

    // Fetch the current ayah to pass with the event so the frontend
    // never shows a stale ayah between window.show() and a round-trip command.
    let ayah_payload = {
        let db = app.state::<QuranDb>();
        let store = app.state::<AppStore>();
        store.current_ayah().ok().and_then(|r| {
            db.ayah_by_reference(r.surah_id, r.ayah_id).ok()
        })
    };

    if let Some(ayah) = &ayah_payload {
        let _ = app.state::<StatsStore>().record(ayah);
    }

    let _ = window.show();
    let _ = window.emit("notification-show", ayah_payload);

    reset_notification_timeout(app);
}

pub fn reset_notification_timeout(app: &AppHandle) {
    let auto_dismiss_seconds = app
        .state::<AppStore>()
        .settings()
        .map(|settings| settings.auto_dismiss_seconds)
        .unwrap_or(30);

    let sequence = NOTIFICATION_SEQUENCE.fetch_add(1, Ordering::Relaxed) + 1;
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(u64::from(auto_dismiss_seconds))).await;

        if NOTIFICATION_SEQUENCE.load(Ordering::Relaxed) != sequence {
            return;
        }

        if let Some(window) = app.get_webview_window("notification") {
            let _ = window.hide();
        }
    });
}

fn position_window(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let settings = app.state::<AppStore>().settings().unwrap_or_default();

    let monitor = window
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no primary monitor")?;

    let physical = monitor.size();
    let scale = monitor.scale_factor();
    let screen_w = physical.width as f64 / scale;
    let screen_h = physical.height as f64 / scale;

    let win_w = 366.0_f64;
    let win_h = 430.0_f64;
    let margin = 12.0_f64;
    let taskbar = 48.0_f64;

    let (x, y) = match settings.position.as_str() {
        "bottom-left" => (margin, screen_h - win_h - margin - taskbar),
        "top-right" => (screen_w - win_w - margin, margin),
        "top-left" => (margin, margin),
        _ => (screen_w - win_w - margin, screen_h - win_h - margin - taskbar),
    };

    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

// ── Do Not Disturb: fullscreen detection ────────────────────────────────────

#[cfg(target_os = "windows")]
fn is_fullscreen_active() -> bool {
    use windows_sys::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTOPRIMARY,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return false;
        }

        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY);

        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            rcMonitor: windows_sys::Win32::Foundation::RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            },
            rcWork: windows_sys::Win32::Foundation::RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            },
            dwFlags: 0,
        };

        if GetMonitorInfoW(monitor, &mut mi) == 0 {
            return false;
        }

        let mut rect = windows_sys::Win32::Foundation::RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        };

        if GetWindowRect(hwnd, &mut rect) == 0 {
            return false;
        }

        rect.left <= mi.rcMonitor.left
            && rect.top <= mi.rcMonitor.top
            && rect.right >= mi.rcMonitor.right
            && rect.bottom >= mi.rcMonitor.bottom
    }
}

#[cfg(not(target_os = "windows"))]
fn is_fullscreen_active() -> bool {
    false
}
