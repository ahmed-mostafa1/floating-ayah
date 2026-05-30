use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    interval_minutes: u16,
    auto_dismiss_seconds: u16,
    position: &'static str,
    font_family: &'static str,
    auto_start: bool,
    suppress_during_fullscreen: bool,
    pause_until: &'static str,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct Ayah {
    surah_id: u16,
    ayah_id: u16,
    surah_name: &'static str,
    text_uthmani: &'static str,
    text_english: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    settings: AppSettings,
    current_ayah: Ayah,
}

const SAMPLE_AYAHS: [Ayah; 3] = [
    Ayah {
        surah_id: 1,
        ayah_id: 1,
        surah_name: "Al-Fatihah",
        text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
        text_english: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    },
    Ayah {
        surah_id: 1,
        ayah_id: 2,
        surah_name: "Al-Fatihah",
        text_uthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
        text_english: "All praise is due to Allah, Lord of the worlds.",
    },
    Ayah {
        surah_id: 1,
        ayah_id: 3,
        surah_name: "Al-Fatihah",
        text_uthmani: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
        text_english: "The Entirely Merciful, the Especially Merciful.",
    },
];

#[tauri::command]
fn get_app_state() -> AppState {
    AppState {
        settings: AppSettings {
            interval_minutes: 30,
            auto_dismiss_seconds: 30,
            position: "bottom-right",
            font_family: "System",
            auto_start: true,
            suppress_during_fullscreen: true,
            pause_until: "none",
        },
        current_ayah: SAMPLE_AYAHS[0],
    }
}

#[tauri::command]
fn get_next_ayah(current_surah_id: u16, current_ayah_id: u16) -> Ayah {
    let current_index = SAMPLE_AYAHS
        .iter()
        .position(|ayah| ayah.surah_id == current_surah_id && ayah.ayah_id == current_ayah_id)
        .unwrap_or(0);

    SAMPLE_AYAHS[(current_index + 1) % SAMPLE_AYAHS.len()]
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_app_state, get_next_ayah])
        .run(tauri::generate_context!())
        .expect("failed to run Noor Remind");
}
