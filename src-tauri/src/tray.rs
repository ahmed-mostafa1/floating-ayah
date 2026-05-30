use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Noor Remind", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next_ayah", "Next Ayah", true, None::<&str>)?;
    let pause_1h = MenuItem::with_id(app, "pause_1h", "Pause for 1 Hour", true, None::<&str>)?;
    let pause_tomorrow =
        MenuItem::with_id(app, "pause_tomorrow", "Pause Until Tomorrow", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume", "Resume Reminders", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Noor Remind", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show, &sep1, &next, &pause_1h, &pause_tomorrow, &resume, &sep2, &quit,
        ],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Noor Remind")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "show" => show_main_window(app),
        "next_ayah" => advance_and_notify(app),
        "pause_1h" => set_pause(app, "one-hour"),
        "pause_tomorrow" => set_pause(app, "tomorrow"),
        "resume" => set_pause(app, "none"),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn advance_and_notify(app: &AppHandle) {
    use crate::db::QuranDb;
    use crate::settings::{AppStore, AyahReference};

    let db = app.state::<QuranDb>();
    let store = app.state::<AppStore>();

    if let (Ok(current), ) = (store.current_ayah(), ) {
        if let Ok(next) = db.next_ayah(current.surah_id, current.ayah_id) {
            let _ = store.set_current_ayah(AyahReference {
                surah_id: next.surah_id,
                ayah_id: next.ayah_id,
            });
        }
    }

    crate::timer::show_notification(app);
}

fn set_pause(app: &AppHandle, value: &str) {
    use crate::settings::AppStore;
    let store = app.state::<AppStore>();
    if let Ok(mut settings) = store.settings() {
        settings.pause_until = value.to_string();
        let _ = store.update_settings(settings);
    }
}
