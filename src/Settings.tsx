import { useState } from "react";
import { updateSettings } from "./tauri";
import type { AppSettings, PauseUntil, Position } from "./types";

type Props = {
  settings: AppSettings;
  onUpdate: (next: AppSettings) => void;
};

const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const DISMISS_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "System", label: "System" },
  { value: "Amiri", label: "Amiri" },
  { value: "KFGQPC", label: "KFGQPC Uthman Taha Naskh" },
];
const PAUSE_OPTIONS: { value: PauseUntil; label: string }[] = [
  { value: "none", label: "Active" },
  { value: "one-hour", label: "1 Hour" },
  { value: "tomorrow", label: "Until Tomorrow" },
  { value: "manual", label: "Manual" },
];
const POSITION_OPTIONS: { value: Position; label: string; icon: string }[] = [
  { value: "top-left", label: "Top Left", icon: "↖" },
  { value: "top-right", label: "Top Right", icon: "↗" },
  { value: "bottom-left", label: "Bottom Left", icon: "↙" },
  { value: "bottom-right", label: "Bottom Right", icon: "↘" },
];

export function Settings({ settings, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);

  async function commit(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSaving(true);
    try {
      const saved = await updateSettings(next);
      onUpdate(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-panel">
      <header className="settings-header">
        <p className="eyebrow">Configuration</p>
        <h2>Reminder Settings</h2>
        {saving && <span className="settings-saving">Saving…</span>}
      </header>

      {/* Interval */}
      <section className="settings-section">
        <label className="settings-label">Reminder Interval</label>
        <div className="chip-row">
          {INTERVAL_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              className={`chip ${settings.intervalMinutes === m ? "chip-active" : ""}`}
              onClick={() => commit({ intervalMinutes: m })}
            >
              {m < 60 ? `${m}m` : `${m / 60}h`}
            </button>
          ))}
        </div>
      </section>

      {/* Auto-dismiss */}
      <section className="settings-section">
        <label className="settings-label">Auto-dismiss After</label>
        <div className="chip-row">
          {DISMISS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${settings.autoDismissSeconds === s ? "chip-active" : ""}`}
              onClick={() => commit({ autoDismissSeconds: s })}
            >
              {s}s
            </button>
          ))}
        </div>
      </section>

      {/* Position */}
      <section className="settings-section">
        <label className="settings-label">Notification Position</label>
        <div className="position-grid">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`position-cell ${settings.position === opt.value ? "position-cell-active" : ""}`}
              onClick={() => commit({ position: opt.value })}
              aria-label={opt.label}
            >
              <span className="position-icon">{opt.icon}</span>
              <span className="position-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Font */}
      <section className="settings-section">
        <label className="settings-label">Arabic Font</label>
        <div className="chip-row">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip ${settings.fontFamily === f.value ? "chip-active" : ""}`}
              onClick={() => commit({ fontFamily: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="settings-section settings-toggles">
        <div className="toggle-row">
          <div>
            <p className="toggle-title">Launch at Login</p>
            <p className="toggle-desc">Start Noor Remind automatically when you log in.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoStart}
            className={`toggle ${settings.autoStart ? "toggle-on" : ""}`}
            onClick={() => commit({ autoStart: !settings.autoStart })}
          />
        </div>

        <div className="toggle-row">
          <div>
            <p className="toggle-title">Do Not Disturb</p>
            <p className="toggle-desc">Suppress reminders during fullscreen apps, games, and presentations.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.suppressDuringFullscreen}
            className={`toggle ${settings.suppressDuringFullscreen ? "toggle-on" : ""}`}
            onClick={() => commit({ suppressDuringFullscreen: !settings.suppressDuringFullscreen })}
          />
        </div>
      </section>

      {/* Pause */}
      <section className="settings-section">
        <label className="settings-label">Reminders</label>
        <div className="chip-row">
          {PAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip ${settings.pauseUntil === opt.value ? "chip-active" : ""}`}
              onClick={() => commit({ pauseUntil: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {settings.pauseUntil !== "none" && (
          <p className="settings-hint">Reminders are paused. Set to "Active" to resume.</p>
        )}
      </section>
    </div>
  );
}
