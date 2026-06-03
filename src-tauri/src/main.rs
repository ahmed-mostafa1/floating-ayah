#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod settings;
mod timer;
mod tray;

use db::{Ayah, QuranDb};
use serde::Serialize;
use settings::{AppSettings, AppStore, AyahReference};
use tauri::{AppHandle, Manager, State, WebviewWindowBuilder, WebviewUrl};

const AUTOSTART_ARG: &str = "--hidden";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    settings: AppSettings,
    current_ayah: Ayah,
}

#[tauri::command]
fn get_app_state(db: State<QuranDb>, store: State<AppStore>) -> Result<AppState, String> {
    let settings = store.settings()?;
    let current_reference = store.current_ayah()?;
    let current_ayah = db
        .ayah_by_reference(current_reference.surah_id, current_reference.ayah_id)
        .or_else(|_| db.first_ayah())?;

    Ok(AppState {
        settings,
        current_ayah,
    })
}

#[tauri::command]
fn get_next_ayah(
    db: State<QuranDb>,
    store: State<AppStore>,
    current_surah_id: u16,
    current_ayah_id: u16,
) -> Result<Ayah, String> {
    let ayah = db.next_ayah(current_surah_id, current_ayah_id)?;
    store.set_current_ayah(AyahReference {
        surah_id: ayah.surah_id,
        ayah_id: ayah.ayah_id,
    })?;
    Ok(ayah)
}

#[tauri::command]
fn get_previous_ayah(
    db: State<QuranDb>,
    store: State<AppStore>,
    current_surah_id: u16,
    current_ayah_id: u16,
) -> Result<Ayah, String> {
    let ayah = db.previous_ayah(current_surah_id, current_ayah_id)?;
    store.set_current_ayah(AyahReference {
        surah_id: ayah.surah_id,
        ayah_id: ayah.ayah_id,
    })?;
    Ok(ayah)
}

#[tauri::command]
fn update_settings(
    app: AppHandle,
    store: State<AppStore>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let updated = store.update_settings(settings.clone())?;
    sync_autostart(&app, settings.auto_start);
    Ok(updated)
}

#[tauri::command]
fn set_current_ayah(
    db: State<QuranDb>,
    store: State<AppStore>,
    surah_id: u16,
    ayah_id: u16,
) -> Result<Ayah, String> {
    let ayah = db.ayah_by_reference(surah_id, ayah_id)?;
    store.set_current_ayah(AyahReference { surah_id, ayah_id })?;
    Ok(ayah)
}

#[tauri::command]
fn dismiss_notification(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("notification") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reset_notification_timeout(app: AppHandle) {
    timer::reset_notification_timeout(&app);
}

fn sync_autostart(app: &AppHandle, enable: bool) {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enable {
        let _ = manager.enable();
    } else {
        let _ = manager.disable();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        timer::advance_and_notify(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let launched_hidden = std::env::args().any(|arg| arg == AUTOSTART_ARG);

            let db = QuranDb::open(app.handle())
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            let store = AppStore::open(app.handle())
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            app.manage(db);
            app.manage(store);

            // Pre-create hidden notification window — reused every reminder cycle
            WebviewWindowBuilder::new(
                app,
                "notification",
                WebviewUrl::App("/".into()),
            )
            .title("")
            .inner_size(366.0, 430.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(false)
            .resizable(false)
            .build()?;

            // Tray
            tray::setup_tray(app.handle())
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

            // Background reminder timer
            timer::start(app.handle().clone());

            // Global shortcut: Ctrl+Shift+A → show next ayah (non-fatal if already taken)
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let _ = app.handle().global_shortcut().register("Ctrl+Shift+A");

            // Close to tray instead of quit
            let main_window = app.get_webview_window("main").unwrap();
            let win = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win.hide();
                }
            });

            if launched_hidden {
                let _ = main_window.hide();
            } else {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }

            // Apply auto-start setting on first run
            let initial_auto_start = app
                .state::<AppStore>()
                .settings()
                .map(|s| s.auto_start)
                .unwrap_or(true);
            sync_autostart(app.handle(), initial_auto_start);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_state,
            get_next_ayah,
            get_previous_ayah,
            update_settings,
            set_current_ayah,
            dismiss_notification,
            reset_notification_timeout,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Noor Remind");
}
