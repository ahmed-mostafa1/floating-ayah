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
    crate::timer::advance_and_notify(app);
}

fn set_pause(app: &AppHandle, value: &str) {
    use crate::settings::AppStore;
    use crate::timer::now_unix;
    let store = app.state::<AppStore>();
    if let Ok(mut settings) = store.settings() {
        let now = now_unix();
        settings.pause_until = value.to_string();
        settings.pause_expires_at = match value {
            "one-hour" => now + 3600,
            "tomorrow" => {
                let seconds_per_day = 86400i64;
                (now / seconds_per_day) * seconds_per_day + seconds_per_day
            }
            _ => 0,
        };
        let _ = store.update_settings(settings);
    }
}
