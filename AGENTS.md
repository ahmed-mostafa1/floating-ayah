# Repository Guidelines

## Project Overview

Noor Remind is a lightweight offline desktop app that shows Quran ayah reminders. The app uses a React + TypeScript + Vite frontend with a Tauri v2 Rust backend. It bundles `resources/quran.sqlite` and local Arabic fonts so the app can run without network access after setup.

## Key Paths

- `src/` contains the React UI, notification preview/window, settings panel, Tauri bridge, and shared types.
- `src-tauri/src/` contains the Rust backend: app setup, SQLite access, settings persistence, tray behavior, timer loop, and fullscreen suppression.
- `resources/quran.sqlite` is the bundled Quran database.
- `scripts/generate_db.py` can build the SQLite database from a TSV seed or by downloading the full dataset.
- `public/assets/fonts/` contains bundled Arabic fonts used by the UI.

## Development Commands

- `npm install` installs Node dependencies.
- `npm run dev` starts Vite browser mode on `127.0.0.1:1420` with the mock Tauri bridge.
- `npm run build` runs TypeScript checking and builds the frontend.
- `npm run tauri dev` starts the full Tauri app.
- `npm run tauri build` builds desktop installers.
- `npm run db:generate` creates a sample SQLite DB from `scripts/seed-quran.tsv`.
- `npm run db:download` downloads and creates the full 6236-ayah DB.

For Rust-only checks, run Cargo commands from `src-tauri/`, for example `cargo check`.

## Implementation Notes

- Prefer existing frontend patterns in `App.tsx`, `Settings.tsx`, `Notification.tsx`, and `styles.css` before adding new abstractions.
- The browser-mode mock lives in `src/tauri.ts`; keep it useful when changing command shapes so `npm run dev` remains productive.
- Settings are persisted by the Rust `AppStore`; frontend field names use camelCase and Rust settings use snake_case with serde renames.
- Reminder progression is sequential and persisted. Be careful when changing `get_next_ayah`, `get_previous_ayah`, or timer behavior because it affects tray actions, shortcuts, and notifications.
- Do Not Disturb fullscreen detection is implemented for Windows and intentionally returns `false` on other platforms.
- The notification window is separate from the main dashboard and receives a `notification-show` event with the current ayah payload to avoid stale UI.

## Verification

Run `npm run build` for frontend changes. Run `cargo check` from `src-tauri/` for backend changes. For end-to-end desktop behavior, use `npm run tauri dev`; for release packaging, use `npm run tauri build`.

