use std::{fs, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub interval_minutes: u16,
    pub auto_dismiss_seconds: u16,
    pub position: String,
    pub font_family: String,
    pub auto_start: bool,
    pub suppress_during_fullscreen: bool,
    pub pause_until: String,
    #[serde(default)]
    pub pause_expires_at: i64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            interval_minutes: 30,
            auto_dismiss_seconds: 30,
            position: "bottom-right".to_string(),
            font_family: "System".to_string(),
            auto_start: true,
            suppress_during_fullscreen: true,
            pause_until: "none".to_string(),
            pause_expires_at: 0,
        }
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AyahReference {
    pub surah_id: u16,
    pub ayah_id: u16,
}

impl Default for AyahReference {
    fn default() -> Self {
        Self {
            surah_id: 1,
            ayah_id: 1,
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredState {
    schema_version: u16,
    settings: AppSettings,
    current_ayah: AyahReference,
}

impl Default for StoredState {
    fn default() -> Self {
        Self {
            schema_version: 1,
            settings: AppSettings::default(),
            current_ayah: AyahReference::default(),
        }
    }
}

pub struct AppStore {
    path: PathBuf,
    state: Mutex<StoredState>,
}

impl AppStore {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let path = settings_path(app)?;
        let state = if path.exists() {
            let contents = fs::read_to_string(&path).map_err(|error| error.to_string())?;
            serde_json::from_str(&contents).unwrap_or_default()
        } else {
            StoredState::default()
        };

        let store = Self {
            path,
            state: Mutex::new(state),
        };
        store.save()?;

        Ok(store)
    }

    pub fn settings(&self) -> Result<AppSettings, String> {
        Ok(self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .settings
            .clone())
    }

    pub fn current_ayah(&self) -> Result<AyahReference, String> {
        Ok(self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .current_ayah)
    }

    pub fn update_settings(&self, settings: AppSettings) -> Result<AppSettings, String> {
        validate_settings(&settings)?;

        {
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            state.settings = settings.clone();
        }

        self.save()?;
        Ok(settings)
    }

    pub fn set_current_ayah(&self, ayah: AyahReference) -> Result<AyahReference, String> {
        if ayah.surah_id == 0 || ayah.ayah_id == 0 {
            return Err("Ayah reference must be greater than zero".to_string());
        }

        {
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            state.current_ayah = ayah;
        }

        self.save()?;
        Ok(ayah)
    }

    fn save(&self) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let state = self.state.lock().map_err(|error| error.to_string())?;
        let contents = serde_json::to_string_pretty(&*state).map_err(|error| error.to_string())?;
        fs::write(&self.path, contents).map_err(|error| error.to_string())
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .resolve(".", BaseDirectory::AppConfig)
        .map_err(|error| error.to_string())?;

    Ok(config_dir.join("settings.json"))
}

fn validate_settings(settings: &AppSettings) -> Result<(), String> {
    if !(1..=1440).contains(&settings.interval_minutes) {
        return Err("Interval must be between 1 and 1440 minutes".to_string());
    }

    if !(5..=300).contains(&settings.auto_dismiss_seconds) {
        return Err("Auto-dismiss must be between 5 and 300 seconds".to_string());
    }

    if !matches!(
        settings.position.as_str(),
        "bottom-right" | "bottom-left" | "top-right" | "top-left"
    ) {
        return Err("Unsupported notification position".to_string());
    }

    if !matches!(
        settings.pause_until.as_str(),
        "none" | "one-hour" | "tomorrow" | "manual"
    ) {
        return Err("Unsupported pause option".to_string());
    }

    Ok(())
}
