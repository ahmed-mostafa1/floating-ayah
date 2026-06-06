use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{path::BaseDirectory, AppHandle, Manager};

use crate::{db::Ayah, timer::now_unix};

const SECONDS_PER_DAY: i64 = 86_400;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub today: i64,
    pub last_week: i64,
    pub last_month: i64,
    pub all_time: i64,
}

pub struct StatsStore {
    connection: Mutex<Connection>,
}

impl StatsStore {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let path = app
            .path()
            .resolve("stats.sqlite", BaseDirectory::AppConfig)
            .map_err(|error| error.to_string())?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let connection = Connection::open(path).map_err(|error| error.to_string())?;
        connection
            .execute(
                r#"
                CREATE TABLE IF NOT EXISTS appearances (
                    id INTEGER PRIMARY KEY,
                    global_index INTEGER NOT NULL,
                    surah_id INTEGER NOT NULL,
                    ayah_id INTEGER NOT NULL,
                    shown_at INTEGER NOT NULL
                )
                "#,
                [],
            )
            .map_err(|error| error.to_string())?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn record(&self, ayah: &Ayah) -> Result<(), String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO appearances (global_index, surah_id, ayah_id, shown_at) \
                 VALUES (?1, ?2, ?3, ?4)",
                params![ayah.global_index, ayah.surah_id, ayah.ayah_id, now_unix()],
            )
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    pub fn summary(&self) -> Result<StatsSummary, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        let now = now_unix();
        // Day boundaries use UTC-day arithmetic, consistent with the pause-until
        // logic in timer.rs / settings.rs.
        let start_of_today = (now / SECONDS_PER_DAY) * SECONDS_PER_DAY;

        let count_since = |threshold: i64| -> Result<i64, String> {
            connection
                .query_row(
                    "SELECT COUNT(*) FROM appearances WHERE shown_at >= ?1",
                    params![threshold],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())
        };

        Ok(StatsSummary {
            today: count_since(start_of_today)?,
            last_week: count_since(now - 7 * SECONDS_PER_DAY)?,
            last_month: count_since(now - 30 * SECONDS_PER_DAY)?,
            all_time: count_since(0)?,
        })
    }
}
