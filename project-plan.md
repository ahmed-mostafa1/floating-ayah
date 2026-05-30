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
*   **Backend:** `src-tauri/src/main.rs` and `src-tauri/src/db.rs` currently exist. Planned modules: `src-tauri/src/timer.rs`, `src-tauri/src/tray.rs`, `src-tauri/src/settings.rs`.
*   **Frontend:** `src/App.tsx`, `src/main.tsx`, `src/tauri.ts`, `src/types.ts`, `src/styles.css` currently exist. Planned components: `src/Settings.tsx`, `src/Notification.tsx`.
*   **Database Script:** `scripts/generate_db.py` exists and currently supports a development seed TSV. Production source integration with Tanzil/Sahih data is still pending.
*   **Database Seed:** `scripts/seed-quran.tsv` exists for local development only.
*   **Database Output:** `resources/quran.sqlite` exists as a generated development database using the sample seed.
*   **Assets:** `src/assets/fonts/Amiri-Regular.ttf`, `src/assets/fonts/KFGQPC_Uthman_Taha_Naskh.ttf`.

## Current Implementation Status
*   **Completed:** React + TypeScript + Vite scaffold, Tauri v2 scaffold, initial typed app settings/Ayah models, browser-mode mock Tauri bridge, responsive app shell, README development instructions, and JavaScript dependency lockfile.
*   **Completed:** Rust toolchain installed via `winget` and available through the user Cargo path.
*   **Completed:** Development SQLite generation script added with validation, metadata, checksum, schema version, and a small Al-Fatihah seed dataset.
*   **Completed:** `resources/quran.sqlite` generated from the development seed.
*   **Completed:** Rust backend now uses `src-tauri/src/db.rs` to read the SQLite database and provide current, next, and previous Ayah commands.
*   **Blocked:** Visual Studio Build Tools/MSVC is still missing. First install attempt failed with `0x80070070` because `C:` has less than 1 GB free. Second attempt targeting `E:\VSBuildTools` failed with exit code `1602`.
*   **Verified:** `npm install`, `npm run db:generate`, `npm run build`, Tauri CLI availability, and Rust toolchain availability when `%USERPROFILE%\.cargo\bin` is in `PATH`.
*   **Next:** Free enough `C:` space for MSVC Build Tools, complete Tauri/Rust compilation, then implement settings persistence and tray behavior.

## Implementation Steps

### Phase 1: Project Scaffolding & Offline Setup
1.  Initialize a new Tauri v2 project with React, TypeScript, and Vite. **Status:** Done.
2.  Install Tailwind CSS and configure headless UI components (shadcn/ui). Ensure no external CDNs are used. **Status:** Deferred. Current UI uses plain CSS to keep the first scaffold minimal.
3.  Download and bundle the necessary fonts locally using CSS `@font-face`. **Status:** Pending.
4.  Prepare development prerequisites for Tauri/Rust. **Status:** Rust installed; MSVC Build Tools still pending on Windows.

### Phase 2: Database Generation (The Tanzil Script)
1.  Create a standalone script to download or ingest the raw XML/TXT dataset from Tanzil.net (Uthmani text and Sahih International translation). **Status:** In progress. Script exists with TSV ingestion and sample seed; trusted source download/integration is pending.
2.  Parse the dataset to ensure verified accuracy. **Status:** In progress. The script validates required fields, sort order, duplicate references, and full 6236 Ayah count unless sample mode is explicitly enabled.
3.  Generate a `quran.sqlite` database file containing `surah_id`, `ayah_id`, `global_index`, `text_uthmani`, `text_english`, Surah metadata, source checksum, schema version, and generated timestamp. **Status:** Done for development seed; pending for full trusted source data.
4.  Bundle `quran.sqlite` into the Tauri application's `resources` directory for instant offline access. **Status:** Configured in `src-tauri/tauri.conf.json`; final bundle verification is blocked by missing MSVC Build Tools.

### Phase 3: Rust Backend & Core Logic
1.  **SQLite Access:** Add Rust database access for `resources/quran.sqlite`, including current Ayah lookup and next/previous sequential lookup. **Status:** Implemented; compile verification is blocked by missing MSVC Build Tools.
2.  **System Tray:** Implement Tauri v2 System Tray functionality to keep the app running without a main window.
3.  **State Management:** Use Rust to track the current Ayah index sequentially and load/save settings via `tauri-plugin-store`.
4.  **Timer Thread:** Implement a background `tokio` timer that triggers the notification window based on the user's interval setting.
5.  **Window Management:**
    *   Create a hidden, transparent, frameless, "Always-on-Top" notification window.
    *   Implement logic to handle the "Safe Area" calculation for positioning (e.g., Bottom Right), including multi-monitor and DPI scaling behavior.
    *   Ensure the notification window uses `accept_focus: false` to prevent stealing keyboard focus.
6.  **Auto Start:** Integrate platform-specific startup behavior so the app launches on login by default, while respecting the user's setting.
7.  **Do Not Disturb Detection:** Suppress reminders when fullscreen apps, presentations, or gaming are detected, unless the user disables this behavior.
8.  **Pause Scheduling:** Support temporary pause windows and resume reminders automatically when the pause expires.

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
*   **Frontend Build Check:** Run `npm run build`. **Current status:** Passing.
*   **Database Generation Check:** Run `npm run db:generate`. **Current status:** Passing with development seed.
*   **Rust Check:** Run `cargo check` from `src-tauri`. **Current status:** Blocked by missing `link.exe` because MSVC Build Tools are not installed.
*   **Tauri Environment Check:** Run `npm run tauri -- info` with `%USERPROFILE%\.cargo\bin` in `PATH`. **Current status:** Rust detected, MSVC Build Tools still unresolved on Windows.
*   **Focus Verification:** Ensure the notification window does not interrupt typing in other applications.
*   **Resource Profiling:** Verify the Rust background thread uses less than 20MB of RAM while idling.
*   **Data Integrity Check:** Cross-reference a random sample of Ayahs in the generated SQLite file against Tanzil.net manually.
*   **Sequential Progression Check:** Verify reminders advance Ayahs in order, persist position after restart, and resume correctly after pause.
*   **Startup Check:** Verify the app launches on login by default on Windows, macOS, and Linux, and that disabling the setting works.
*   **Do Not Disturb Check:** Verify reminders are suppressed during fullscreen apps, presentations, or gaming by default, and shown when the setting is disabled.
*   **Pause Check:** Verify pause durations suppress reminders and automatically resume after expiry.
