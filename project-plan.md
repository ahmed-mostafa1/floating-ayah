# Noor-Remind Implementation Plan

## Background & Motivation
The goal is to build "Noor-Remind" (placeholder name), a lightweight, offline-first desktop application that periodically displays Quranic Ayahs to the user. It operates silently in the background, utilizing minimal system resources by leveraging Rust for the core logic and React for a modern, glassmorphism UI.

## Scope & Impact
*   **Framework:** Tauri v2 (Rust backend, React + Vite + TypeScript frontend).
*   **Data Source:** A 100% correct, pre-bundled SQLite database sourced directly from alquran.cloud (Uthmani text + Sahih International English translation).
*   **Translation Scope:** English only for v1, with the database structure kept simple but not hostile to future translation support.
*   **Environment:** 100% Offline. All fonts, styles (Tailwind), icons (Lucide via Shadcn), and data will be locally bundled.
*   **Behavior:** Runs primarily from the system tray. The floating notification auto-dismisses after a user-configured duration (default 30 seconds).
*   **Ayah Progression:** Ayahs progress sequentially from the user's configured start point, persisting the current position between app launches.
*   **Platforms:** Windows, macOS, and Linux are first-class targets from the start.
*   **Startup Behavior:** The app starts automatically with the system by default, with a user setting to disable this behavior.
*   **Do Not Disturb:** Reminders are suppressed during fullscreen apps, presentations, or gaming by default. Users can disable this protection in settings.
*   **Pause Support:** Users can pause reminders temporarily, including options such as 1 hour, until tomorrow, or until manually resumed.

## Key Files & Context
*   **Backend:** `src-tauri/src/main.rs`, `src-tauri/src/db.rs`, `src-tauri/src/timer.rs`, `src-tauri/src/tray.rs`, `src-tauri/src/settings.rs`.
*   **Frontend:** `src/App.tsx`, `src/main.tsx`, `src/tauri.ts`, `src/types.ts`, `src/styles.css`, `src/Notification.tsx`, `src/NotificationWindow.tsx`, `src/Settings.tsx`.
*   **Database Script:** `scripts/generate_db.py` — supports both `--download` (alquran.cloud API) and `--input <tsv>` modes.
*   **Database Output:** `resources/quran.sqlite` — contains all 6236 ayahs (Uthmani text + Sahih International).
*   **Fonts:** `public/assets/fonts/AmiriQuran.ttf`, `public/assets/fonts/Amiri-Regular.ttf`.
*   **Icons:** `src-tauri/icons/icon.ico`, `src-tauri/icons/32x32.png`, `src-tauri/icons/128x128.png`.

## Current Implementation Status
*   **Completed:** React + TypeScript + Vite scaffold, Tauri v2 scaffold, typed app settings/Ayah models, browser-mode mock Tauri bridge, responsive app shell.
*   **Completed:** Full Rust backend — `db.rs` (SQLite), `settings.rs` (persistence), `timer.rs` (background loop), `tray.rs` (system tray), `main.rs` (app entry, window setup).
*   **Completed:** `resources/quran.sqlite` with all 6236 ayahs downloaded from alquran.cloud (Uthmani text + Sahih International).
*   **Completed:** Sequential Ayah progression with wrap-around, position persistence.
*   **Completed:** Notification window (436×540px, always-on-top, transparent, no focus steal).
*   **Completed:** Settings panel — interval, auto-dismiss, position, Arabic font, autostart toggle, DND toggle, pause controls.
*   **Completed:** Start Point picker — dropdown of all 114 surahs + ayah number input, calls `set_current_ayah` command.
*   **Completed:** Pause expiry — "1 hour" and "until tomorrow" pauses auto-expire via stored Unix timestamp; checked on every timer tick.
*   **Completed:** Dynamic Arabic font — "System", "Amiri" (Amiri Quran variant), "KFGQPC" (if font file available) — applied as inline style on Arabic text.
*   **Completed:** `@font-face` declarations for Amiri (AmiriQuran.ttf bundled in `public/assets/fonts/`).
*   **Completed:** Global Ayah progress counter in notification (e.g., "42 / 6236").
*   **Completed:** App icon generated for Windows (`src-tauri/icons/icon.ico`).
*   **Pending:** Fullscreen detection for Do Not Disturb (settings toggle exists; detection logic not yet implemented in `timer.rs`).
*   **Pending:** KFGQPC Uthman Taha Naskh font file — needs to be sourced and placed in `public/assets/fonts/KFGQPC_Uthman_Taha_Naskh.ttf`.
*   **Pending:** Global keyboard shortcut for manual trigger (`tauri-plugin-global-shortcut`).
*   **Pending:** Graceful error fallback UI for database read failures.
*   **Pending:** Build pipeline verification (`.msi`/`.exe`/`.dmg`/`.AppImage`).

## Implementation Steps

### Phase 1: Project Scaffolding & Offline Setup ✅
1. Initialize a new Tauri v2 project with React, TypeScript, and Vite. **Done.**
2. Bundle fonts locally using CSS `@font-face`. **Done** — AmiriQuran.ttf bundled; KFGQPC pending sourcing.
3. Prepare development prerequisites (Rust, MSVC Build Tools). **Done.**

### Phase 2: Database Generation ✅
1. Download Uthmani text + Sahih International via `scripts/generate_db.py --download`. **Done — 6236 ayahs.**
2. Validate and store in `resources/quran.sqlite`. **Done.**
3. Bundle in Tauri `resources`. **Configured in tauri.conf.json.**

### Phase 3: Rust Backend & Core Logic ✅
1. **SQLite Access:** `db.rs` — current, next, previous Ayah queries with global_index. **Done.**
2. **System Tray:** `tray.rs` — show/hide, next ayah, pause options, resume, quit. **Done.**
3. **State Management:** `settings.rs` — typed `AppSettings` + `AyahReference`, file-based persistence, schema versioning. **Done.**
4. **Timer Thread:** `timer.rs` — tokio async loop, pause-aware, auto-expires timed pauses. **Done.**
5. **Window Management:** Transparent, frameless, always-on-top, no-focus notification window at 436×540px. Position calculation with DPI scaling and multi-monitor support. **Done.**
6. **Auto Start:** `tauri-plugin-autostart` integrated, synced on settings change. **Done.**
7. **Do Not Disturb Detection:** Settings field exists, timer checks `suppress_during_fullscreen` flag, but actual fullscreen app detection is **pending** (requires platform-specific API calls).
8. **Pause Scheduling:** "1 hour" / "tomorrow" / "manual" pause modes with Unix timestamp expiry. Auto-cleared by timer. **Done.**

### Phase 4: Frontend Development ✅
1. **Settings Dashboard:** Interval, auto-dismiss, position grid, font selector, autostart toggle, DND toggle, pause controls, Start Point picker. **Done.**
2. **Notification Floating Card:** Glassmorphism card, Arabic text (RTL), English translation, progress ring timer, auto-dismiss progress bar, Ayah counter (X/6236), Next/Prev/Copy buttons. Dynamic Arabic font from settings. **Done.**

### Phase 5: Polish & Deployment
1. **Global Shortcuts:** `tauri-plugin-global-shortcut` for manual triggering. **Pending.**
2. **Graceful Errors:** Fallback UI for database read failures. **Pending.**
3. **DNF Detection:** Implement platform-specific fullscreen detection in `timer.rs`. **Pending.**
4. **KFGQPC Font:** Source and bundle `KFGQPC_Uthman_Taha_Naskh.ttf`. **Pending.**
5. **Build Pipelines:** Configure for `.msi`/`.exe` (Windows), `.dmg` (macOS), `.AppImage` (Linux). **Pending — need to run `npm run tauri build`.**
6. **Platform Behavior QA:** Validate startup, tray, window positioning, installer. **Pending.**

## Verification & Testing
*   **Frontend Build:** `npm run build` — **Passing.**
*   **Database Generation:** `npm run db:download` — **Passing (6236 ayahs).**
*   **Rust Check:** `cargo check` from `src-tauri` — **In progress (MSVC Build Tools now installed).**
*   **Offline Check:** Disconnect from internet; fonts, icons, and data should all load locally.
*   **Focus Verification:** Notification window must not interrupt typing.
*   **Resource Profiling:** Rust background thread should use <20MB RAM while idling.
*   **Sequential Progression Check:** Verify advance, wrap-around at ayah 6236, position persistence.
*   **Pause Check:** Verify "1 hour" and "until tomorrow" auto-expire; manual pause stays until cleared.
*   **Startup Check:** Verify autostart on Windows/macOS/Linux; disabling setting works.
