# Noor-Remind Implementation Plan

## Background & Motivation
The goal is to build "Noor-Remind" (placeholder name), a lightweight, offline-first desktop application that periodically displays Quranic Ayahs to the user. It operates silently in the background, utilizing minimal system resources by leveraging Rust for the core logic and React for a modern, glassmorphism UI.

## Scope & Impact
*   **Framework:** Tauri v2 (Rust backend, React + Vite + TypeScript frontend).
*   **Data Source:** A 100% correct, pre-bundled SQLite database sourced directly from Tanzil.net (Uthmani text) and Sahih International (English translation).
*   **Translation Scope:** English only for v1, with the database structure kept simple but not hostile to future translation support.
*   **Environment:** 100% Offline. All fonts, styles (Tailwind), icons (Lucide via Shadcn), and data will be locally bundled.
*   **Behavior:** Runs primarily from the system tray. The floating notification auto-dismisses after a user-configured duration (default 30 seconds).
*   **Ayah Progression:** Ayahs progress sequentially from the user's configured start point, persisting the current position between app launches.
*   **Platforms:** Windows, macOS, and Linux are first-class targets from the start.
*   **Startup Behavior:** The app starts automatically with the system by default, with a user setting to disable this behavior.
*   **Do Not Disturb:** Reminders are suppressed during fullscreen apps, presentations, or gaming by default. Users can disable this protection in settings.
*   **Pause Support:** Users can pause reminders temporarily, including options such as 1 hour, until tomorrow, or until manually resumed.

## Key Files & Context
*   **Backend:** `src-tauri/src/main.rs`, `src-tauri/src/db.rs`, `src-tauri/src/timer.rs`, `src-tauri/src/tray.rs`.
*   **Frontend:** `src/App.tsx`, `src/Settings.tsx`, `src/Notification.tsx`.
*   **Database Script:** `scripts/generate_db.py` or `.js` (to download Tanzil data and output `quran.sqlite`).
*   **Assets:** `src/assets/fonts/Amiri-Regular.ttf`, `src/assets/fonts/KFGQPC_Uthman_Taha_Naskh.ttf`.

## Implementation Steps

### Phase 1: Project Scaffolding & Offline Setup
1.  Initialize a new Tauri v2 project with React, TypeScript, and Vite.
2.  Install Tailwind CSS and configure headless UI components (shadcn/ui). Ensure no external CDNs are used.
3.  Download and bundle the necessary fonts locally using CSS `@font-face`.

### Phase 2: Database Generation (The Tanzil Script)
1.  Create a standalone script to download the raw XML/TXT dataset from Tanzil.net (Uthmani text and Sahih International translation).
2.  Parse the dataset to ensure 100% accuracy.
3.  Generate a `quran.sqlite` database file containing `surah_id`, `ayah_id`, `text_uthmani`, `text_english`, and related metadata.
4.  Bundle `quran.sqlite` into the Tauri application's `resources` directory for instant offline access.

### Phase 3: Rust Backend & Core Logic
1.  **System Tray:** Implement Tauri v2 System Tray functionality to keep the app running without a main window.
2.  **State Management:** Use Rust to track the current Ayah index sequentially and load/save settings via `tauri-plugin-store`.
3.  **Timer Thread:** Implement a background `tokio` timer that triggers the notification window based on the user's interval setting.
4.  **Window Management:**
    *   Create a hidden, transparent, frameless, "Always-on-Top" notification window.
    *   Implement logic to handle the "Safe Area" calculation for positioning (e.g., Bottom Right), including multi-monitor and DPI scaling behavior.
    *   Ensure the notification window uses `accept_focus: false` to prevent stealing keyboard focus.
5.  **Auto Start:** Integrate platform-specific startup behavior so the app launches on login by default, while respecting the user's setting.
6.  **Do Not Disturb Detection:** Suppress reminders when fullscreen apps, presentations, or gaming are detected, unless the user disables this behavior.
7.  **Pause Scheduling:** Support temporary pause windows and resume reminders automatically when the pause expires.

### Phase 4: Frontend Development
1.  **Settings Dashboard:**
    *   Build controls for Interval (e.g., 5 mins, 30 mins), Auto-dismiss duration (default 30s), Start Point (Surah/Ayah), Position, Font, Auto Start, Do Not Disturb behavior, and Pause controls.
    *   Show the current sequential reading position and allow the user to reset it to a selected Surah/Ayah.
2.  **Notification Floating Card:**
    *   Implement a glassmorphism design (blur, semi-transparent background) using Tailwind.
    *   Handle dynamic resizing based on Ayah length.
    *   Implement Next/Prev and Copy buttons.
    *   Add a visual progress bar or countdown indicating the auto-dismiss timer.
    *   Add RTL/LTR dynamic support.

### Phase 5: Polish & Deployment
1.  **Global Shortcuts:** Integrate `tauri-plugin-global-shortcut` for manual triggering.
2.  **Graceful Errors:** Add fallback UI for database read failures.
3.  **Build Pipelines:** Configure `tauri.conf.json` for building `.msi` / `.exe` (Windows), `.dmg` (macOS), and `.AppImage` (Linux) installers.
4.  **Platform Behavior QA:** Validate startup, tray, window positioning, fullscreen suppression, and installer behavior on Windows, macOS, and Linux.

## Verification & Testing
*   **Offline Check:** Disconnect from the internet, clear caches, and ensure the app loads fonts, icons, and text perfectly.
*   **Focus Verification:** Ensure the notification window does not interrupt typing in other applications.
*   **Resource Profiling:** Verify the Rust background thread uses less than 20MB of RAM while idling.
*   **Data Integrity Check:** Cross-reference a random sample of Ayahs in the generated SQLite file against Tanzil.net manually.
*   **Sequential Progression Check:** Verify reminders advance Ayahs in order, persist position after restart, and resume correctly after pause.
*   **Startup Check:** Verify the app launches on login by default on Windows, macOS, and Linux, and that disabling the setting works.
*   **Do Not Disturb Check:** Verify reminders are suppressed during fullscreen apps, presentations, or gaming by default, and shown when the setting is disabled.
*   **Pause Check:** Verify pause durations suppress reminders and automatically resume after expiry.
