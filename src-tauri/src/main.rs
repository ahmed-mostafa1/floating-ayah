mod db;
mod settings;

use db::{Ayah, QuranDb};
use serde::Serialize;
use settings::{AppSettings, AppStore, AyahReference};
use tauri::{Manager, State};

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
fn update_settings(store: State<AppStore>, settings: AppSettings) -> Result<AppSettings, String> {
    store.update_settings(settings)
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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db = QuranDb::open(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            let store = AppStore::open(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(db);
            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_state,
            get_next_ayah,
            get_previous_ayah,
            update_settings,
            set_current_ayah
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Noor Remind");
}
