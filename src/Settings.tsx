import { useState } from "react";
import { updateSettings, setCurrentAyah } from "./tauri";
import type { AppSettings, Ayah, PauseUntil, Position } from "./types";

type Props = {
  settings: AppSettings;
  onUpdate: (next: AppSettings) => void;
  currentAyah: Ayah;
  onAyahChange: (ayah: Ayah) => void;
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

// 114 surahs: [id, name, ayah_count]
const SURAHS: readonly [number, string, number][] = [
  [1,"Al-Fatihah",7],[2,"Al-Baqarah",286],[3,"Ali 'Imran",200],[4,"An-Nisa'",176],
  [5,"Al-Ma'idah",120],[6,"Al-An'am",165],[7,"Al-A'raf",206],[8,"Al-Anfal",75],
  [9,"At-Tawbah",129],[10,"Yunus",109],[11,"Hud",123],[12,"Yusuf",111],
  [13,"Ar-Ra'd",43],[14,"Ibrahim",52],[15,"Al-Hijr",99],[16,"An-Nahl",128],
  [17,"Al-Isra'",111],[18,"Al-Kahf",110],[19,"Maryam",98],[20,"Ta-Ha",135],
  [21,"Al-Anbya'",112],[22,"Al-Hajj",78],[23,"Al-Mu'minun",118],[24,"An-Nur",64],
  [25,"Al-Furqan",77],[26,"Ash-Shu'ara'",227],[27,"An-Naml",93],[28,"Al-Qasas",88],
  [29,"Al-Ankabut",69],[30,"Ar-Rum",60],[31,"Luqman",34],[32,"As-Sajdah",30],
  [33,"Al-Ahzab",73],[34,"Saba'",54],[35,"Fatir",45],[36,"Ya-Sin",83],
  [37,"As-Saffat",182],[38,"Sad",88],[39,"Az-Zumar",75],[40,"Ghafir",85],
  [41,"Fussilat",54],[42,"Ash-Shura",53],[43,"Az-Zukhruf",89],[44,"Ad-Dukhan",59],
  [45,"Al-Jathiyah",37],[46,"Al-Ahqaf",35],[47,"Muhammad",38],[48,"Al-Fath",29],
  [49,"Al-Hujurat",18],[50,"Qaf",45],[51,"Adh-Dhariyat",60],[52,"At-Tur",49],
  [53,"An-Najm",62],[54,"Al-Qamar",55],[55,"Ar-Rahman",78],[56,"Al-Waqi'ah",96],
  [57,"Al-Hadid",29],[58,"Al-Mujadila",22],[59,"Al-Hashr",24],[60,"Al-Mumtahanah",13],
  [61,"As-Saf",14],[62,"Al-Jumu'ah",11],[63,"Al-Munafiqun",11],[64,"At-Taghabun",18],
  [65,"At-Talaq",12],[66,"At-Tahrim",12],[67,"Al-Mulk",30],[68,"Al-Qalam",52],
  [69,"Al-Haqqah",52],[70,"Al-Ma'arij",44],[71,"Nuh",28],[72,"Al-Jinn",28],
  [73,"Al-Muzzammil",20],[74,"Al-Muddaththir",56],[75,"Al-Qiyamah",40],[76,"Al-Insan",31],
  [77,"Al-Mursalat",50],[78,"An-Naba'",40],[79,"An-Nazi'at",46],[80,"Abasa",42],
  [81,"At-Takwir",29],[82,"Al-Infitar",19],[83,"Al-Mutaffifin",36],[84,"Al-Inshiqaq",25],
  [85,"Al-Buruj",22],[86,"At-Tariq",17],[87,"Al-A'la",19],[88,"Al-Ghashiyah",26],
  [89,"Al-Fajr",30],[90,"Al-Balad",20],[91,"Ash-Shams",15],[92,"Al-Layl",21],
  [93,"Ad-Duha",11],[94,"Ash-Sharh",8],[95,"At-Tin",8],[96,"Al-Alaq",19],
  [97,"Al-Qadr",5],[98,"Al-Bayyinah",8],[99,"Az-Zalzalah",8],[100,"Al-Adiyat",11],
  [101,"Al-Qari'ah",11],[102,"At-Takathur",8],[103,"Al-Asr",3],[104,"Al-Humazah",9],
  [105,"Al-Fil",5],[106,"Quraysh",4],[107,"Al-Ma'un",7],[108,"Al-Kawthar",3],
  [109,"Al-Kafirun",6],[110,"An-Nasr",3],[111,"Al-Masad",5],[112,"Al-Ikhlas",4],
  [113,"Al-Falaq",5],[114,"An-Nas",6],
];

export function Settings({ settings, onUpdate, currentAyah, onAyahChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [pickerSurah, setPickerSurah] = useState(currentAyah.surahId);
  const [pickerAyah, setPickerAyah] = useState(currentAyah.ayahId);
  const [jumpSaving, setJumpSaving] = useState(false);
  const [jumpConfirmed, setJumpConfirmed] = useState(false);

  const maxAyahs = SURAHS.find(([id]) => id === pickerSurah)?.[2] ?? 7;

  async function commit(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };

    // Compute pause expiry when pauseUntil changes
    if (patch.pauseUntil !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      if (patch.pauseUntil === "one-hour") {
        next.pauseExpiresAt = now + 3600;
      } else if (patch.pauseUntil === "tomorrow") {
        const secondsPerDay = 86400;
        next.pauseExpiresAt = (Math.floor(now / secondsPerDay) * secondsPerDay) + secondsPerDay;
      } else {
        next.pauseExpiresAt = 0;
      }
    }

    setSaving(true);
    try {
      const saved = await updateSettings(next);
      onUpdate(saved);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStartPoint() {
    const clampedAyah = Math.min(Math.max(1, pickerAyah), maxAyahs);
    setJumpSaving(true);
    try {
      const ayah = await setCurrentAyah(pickerSurah, clampedAyah);
      onAyahChange(ayah);
      setJumpConfirmed(true);
      setTimeout(() => setJumpConfirmed(false), 2000);
    } finally {
      setJumpSaving(false);
    }
  }

  function handleSurahChange(id: number) {
    const newMax = SURAHS.find(([sid]) => sid === id)?.[2] ?? 1;
    setPickerSurah(id);
    setPickerAyah(Math.min(pickerAyah, newMax));
  }

  return (
    <div className="settings-panel">
      <header className="settings-header">
        <p className="eyebrow">Configuration</p>
        <h2>Reminder Settings</h2>
        {saving && <span className="settings-saving">Saving…</span>}
      </header>

      {/* Start Point */}
      <section className="settings-section">
        <label className="settings-label">Reading Position</label>
        <p className="settings-desc">
          Currently at <strong>{currentAyah.surahName} {currentAyah.surahId}:{currentAyah.ayahId}</strong>
        </p>
        <div className="start-point-row">
          <select
            className="start-point-select"
            value={pickerSurah}
            onChange={(e) => handleSurahChange(Number(e.target.value))}
            aria-label="Select Surah"
          >
            {SURAHS.map(([id, name, count]) => (
              <option key={id} value={id}>{id}. {name} ({count})</option>
            ))}
          </select>
          <input
            type="number"
            className="start-point-ayah"
            min={1}
            max={maxAyahs}
            value={pickerAyah}
            onChange={(e) => setPickerAyah(Math.min(Math.max(1, Number(e.target.value)), maxAyahs))}
            aria-label="Ayah number"
          />
          <button
            type="button"
            className="primary-button"
            onClick={handleSetStartPoint}
            disabled={jumpSaving}
          >
            {jumpConfirmed ? "Set!" : jumpSaving ? "…" : "Jump to"}
          </button>
        </div>
      </section>

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
