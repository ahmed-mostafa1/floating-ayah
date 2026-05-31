# Noor Remind

A lightweight, offline-first desktop app that shows Quranic Ayah reminders at a configurable interval. Runs silently in the system tray and displays a floating glassmorphism card — no internet connection required after first setup.

Built with **Tauri v2**, **Rust**, **React**, **TypeScript**, and **Vite**. Targets Windows, macOS, and Linux.

---

## Features

- **6236 ayahs** — full Quran (Uthmani text + Sahih International translation), bundled in an offline SQLite database
- **Sequential reading** — ayahs advance in order; position persists between launches
- **System tray** — runs silently in the background; left-click to show, right-click for menu
- **Floating notification card** — glassmorphism UI, Arabic (RTL) + English, auto-dismisses after a configurable duration
- **Global shortcut** — `Ctrl+Shift+A` shows the next ayah instantly (without waiting for the timer)
- **Do Not Disturb** — suppresses reminders while a fullscreen app, game, or presentation is active
- **Pause controls** — pause for 1 hour, until tomorrow, or manually; auto-resumes after the set duration
- **Start Point** — jump to any of the 114 surahs / any ayah within it at any time
- **Arabic fonts** — three options bundled offline: system font, Amiri (Amiri Quran variant), KFGQPC Uthman Taha Naskh
- **Auto-start** — launches with the system by default (user-configurable)

---

## Install (Windows)

Download the latest release from the [releases page](../../releases):

| File | Format |
|---|---|
| `Noor Remind_x.x.x_x64_en-US.msi` | Windows Installer |
| `Noor Remind_x.x.x_x64-setup.exe` | NSIS standalone installer |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/) (WebView2 on Windows, Xcode on macOS)

### Setup

```bash
npm install
```

### Run in browser mode (no Tauri runtime, mock data)

```bash
npm run dev
# → http://127.0.0.1:1420
```

### Populate the full Quran database

```bash
npm run db:download        # download all 6236 ayahs from alquran.cloud
# or for development only:
npm run db:generate        # seed from local TSV (Al-Fatihah only)
```

### Run the full Tauri app

```bash
npm run tauri dev          # hot-reload Rust + frontend
```

### Build installers

```bash
npm run tauri build        # produces .msi and .exe in src-tauri/target/release/bundle/
```

---

## Project Structure

```
src/                   React + TypeScript frontend
  App.tsx              Main dashboard (Reminder / Settings tabs)
  Notification.tsx     Floating notification card component
  NotificationWindow.tsx  Notification window (separate Tauri window)
  Settings.tsx         Settings panel with all controls
  tauri.ts             Tauri command bridge + browser mock
  types.ts             Shared TypeScript types

src-tauri/src/         Rust backend
  main.rs              App entry point, window setup, Tauri commands
  db.rs                SQLite access (Ayah queries)
  settings.rs          Persistent settings + reading position
  timer.rs             Background reminder loop + fullscreen detection
  tray.rs              System tray setup and menu events

resources/
  quran.sqlite         Bundled SQLite database (6236 ayahs)

public/assets/fonts/   Bundled Arabic fonts (offline)
  AmiriQuran.ttf
  Amiri-Regular.ttf
  KFGQPC_Uthman_Taha_Naskh.otf

scripts/
  generate_db.py       Database generation script (--download or --input TSV)
```

---

## License

Apache 2.0
