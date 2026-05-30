# Noor Remind

Noor Remind is a lightweight, offline-first desktop app that shows Quranic Ayah reminders at a user-controlled interval.

The app targets Windows, macOS, and Linux using Tauri v2, Rust, React, TypeScript, and Vite.

## Development

Install JavaScript dependencies:

```bash
npm install
```

Run the frontend shell in browser mode:

```bash
npm run dev
```

Generate the local development SQLite database:

```bash
npm run db:generate
```

Run the Tauri app after installing the Rust toolchain and Tauri prerequisites:

```bash
npm run tauri dev
```
