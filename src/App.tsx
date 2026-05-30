import { useEffect, useState, useTransition } from "react";
import { getAppState, getNextAyah } from "./tauri";
import type { AppSettings, Ayah } from "./types";

type LoadState = "loading" | "ready" | "error";

function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    getAppState()
      .then((state) => {
        if (cancelled) {
          return;
        }

        setSettings(state.settings);
        setAyah(state.currentAyah);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load app state.");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleNextAyah() {
    if (!ayah) {
      return;
    }

    startTransition(async () => {
      const nextAyah = await getNextAyah(ayah);
      setAyah(nextAyah);
    });
  }

  if (loadState === "loading") {
    return <main className="app-shell status-shell">Loading Noor Remind...</main>;
  }

  if (loadState === "error" || !settings || !ayah) {
    return <main className="app-shell status-shell">{errorMessage ?? "Noor Remind could not start."}</main>;
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Noor Remind</p>
          <h1>Sequential Quran reminders, offline by design.</h1>
          <p className="hero-copy">
            This first implementation establishes the Tauri bridge, settings model, and reminder card layout before the database and tray timer are wired in.
          </p>
        </div>
        <div className="status-pill">MVP foundation</div>
      </section>

      <section className="workspace-grid">
        <article className="card notification-preview" aria-label="Current Ayah preview">
          <div className="card-header">
            <div>
              <p className="eyebrow">Current Ayah</p>
              <h2>
                {ayah.surahName} {ayah.surahId}:{ayah.ayahId}
              </h2>
            </div>
            <span className="countdown">{settings.autoDismissSeconds}s</span>
          </div>

          <p className="ayah-text" dir="rtl" lang="ar">
            {ayah.textUthmani}
          </p>
          <p className="translation-text">{ayah.textEnglish}</p>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" />
          </div>

          <div className="button-row">
            <button type="button" className="secondary-button">
              Previous
            </button>
            <button type="button" className="primary-button" onClick={handleNextAyah} disabled={isPending}>
              {isPending ? "Loading..." : "Next Ayah"}
            </button>
            <button type="button" className="secondary-button">
              Copy
            </button>
          </div>
        </article>

        <aside className="card settings-card" aria-label="Reminder settings summary">
          <p className="eyebrow">Settings</p>
          <h2>Default reminder behavior</h2>

          <dl className="settings-list">
            <div>
              <dt>Interval</dt>
              <dd>{settings.intervalMinutes} minutes</dd>
            </div>
            <div>
              <dt>Auto-dismiss</dt>
              <dd>{settings.autoDismissSeconds} seconds</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>{settings.position.replace("-", " ")}</dd>
            </div>
            <div>
              <dt>Auto start</dt>
              <dd>{settings.autoStart ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Do Not Disturb</dt>
              <dd>{settings.suppressDuringFullscreen ? "Suppress fullscreen" : "Always show"}</dd>
            </div>
            <div>
              <dt>Pause</dt>
              <dd>{settings.pauseUntil === "none" ? "Not paused" : settings.pauseUntil}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

export default App;
