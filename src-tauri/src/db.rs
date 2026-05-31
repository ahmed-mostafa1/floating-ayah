use std::{path::PathBuf, sync::Mutex};

use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ayah {
    pub surah_id: u16,
    pub ayah_id: u16,
    pub global_index: i64,
    pub surah_name: String,
    pub text_uthmani: String,
    pub text_english: String,
}

pub struct QuranDb {
    connection: Mutex<Connection>,
}

impl QuranDb {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let path = database_path(app)?;
        let connection = Connection::open(path).map_err(|error| error.to_string())?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn first_ayah(&self) -> Result<Ayah, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        query_single_ayah(
            &connection,
            r#"
            SELECT a.surah_id, a.ayah_id, a.global_index, s.name_latin, a.text_uthmani, a.text_english
            FROM ayahs a
            INNER JOIN surahs s ON s.id = a.surah_id
            ORDER BY a.global_index ASC
            LIMIT 1
            "#,
            [],
        )
    }

    pub fn ayah_by_reference(&self, surah_id: u16, ayah_id: u16) -> Result<Ayah, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        query_single_ayah(
            &connection,
            r#"
            SELECT a.surah_id, a.ayah_id, a.global_index, s.name_latin, a.text_uthmani, a.text_english
            FROM ayahs a
            INNER JOIN surahs s ON s.id = a.surah_id
            WHERE a.surah_id = ?1 AND a.ayah_id = ?2
            LIMIT 1
            "#,
            params![surah_id, ayah_id],
        )
    }

    pub fn next_ayah(&self, current_surah_id: u16, current_ayah_id: u16) -> Result<Ayah, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        let current_index = global_index(&connection, current_surah_id, current_ayah_id)?;

        let next_ayah = query_single_ayah(
            &connection,
            r#"
            SELECT a.surah_id, a.ayah_id, a.global_index, s.name_latin, a.text_uthmani, a.text_english
            FROM ayahs a
            INNER JOIN surahs s ON s.id = a.surah_id
            WHERE a.global_index > ?1
            ORDER BY a.global_index ASC
            LIMIT 1
            "#,
            params![current_index],
        );

        match next_ayah {
            Ok(ayah) => Ok(ayah),
            Err(_) => {
                drop(connection);
                self.first_ayah()
            }
        }
    }

    pub fn previous_ayah(
        &self,
        current_surah_id: u16,
        current_ayah_id: u16,
    ) -> Result<Ayah, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        let current_index = global_index(&connection, current_surah_id, current_ayah_id)?;

        let previous_ayah = query_single_ayah(
            &connection,
            r#"
            SELECT a.surah_id, a.ayah_id, a.global_index, s.name_latin, a.text_uthmani, a.text_english
            FROM ayahs a
            INNER JOIN surahs s ON s.id = a.surah_id
            WHERE a.global_index < ?1
            ORDER BY a.global_index DESC
            LIMIT 1
            "#,
            params![current_index],
        );

        match previous_ayah {
            Ok(ayah) => Ok(ayah),
            Err(_) => {
                drop(connection);
                self.last_ayah()
            }
        }
    }

    fn last_ayah(&self) -> Result<Ayah, String> {
        let connection = self.connection.lock().map_err(|error| error.to_string())?;
        query_single_ayah(
            &connection,
            r#"
            SELECT a.surah_id, a.ayah_id, a.global_index, s.name_latin, a.text_uthmani, a.text_english
            FROM ayahs a
            INNER JOIN surahs s ON s.id = a.surah_id
            ORDER BY a.global_index DESC
            LIMIT 1
            "#,
            [],
        )
    }
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_path = app
        .path()
        .resolve("quran.sqlite", BaseDirectory::Resource)
        .map_err(|error| error.to_string())?;

    if resource_path.exists() {
        return Ok(resource_path);
    }

    let current_dir_resource_path = std::env::current_dir()
        .map_err(|error| error.to_string())?
        .join("resources")
        .join("quran.sqlite");

    if current_dir_resource_path.exists() {
        return Ok(current_dir_resource_path);
    }

    let workspace_resource_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("resources")
        .join("quran.sqlite");

    if workspace_resource_path.exists() {
        return Ok(workspace_resource_path);
    }

    Err(
        "quran.sqlite was not found in bundled resources or the local resources directory"
            .to_string(),
    )
}

fn global_index(connection: &Connection, surah_id: u16, ayah_id: u16) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT global_index FROM ayahs WHERE surah_id = ?1 AND ayah_id = ?2",
            params![surah_id, ayah_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())
}

fn query_single_ayah<P>(connection: &Connection, sql: &str, params: P) -> Result<Ayah, String>
where
    P: rusqlite::Params,
{
    connection
        .query_row(sql, params, |row| {
            Ok(Ayah {
                surah_id: row.get(0)?,
                ayah_id: row.get(1)?,
                global_index: row.get(2)?,
                surah_name: row.get(3)?,
                text_uthmani: row.get(4)?,
                text_english: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())
}
