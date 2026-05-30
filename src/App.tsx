import { useEffect, useState, useTransition } from "react";
import { getAppState, getNextAyah, getPreviousAyah } from "./tauri";
import { Notification } from "./Notification";
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

  function handlePreviousAyah() {
    if (!ayah) {
      return;
    }

    startTransition(async () => {
      const previousAyah = await getPreviousAyah(ayah);
      setAyah(previousAyah);
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
        <article className="notification-preview-panel" aria-label="Notification preview">
          <p className="eyebrow" style={{ marginBottom: "18px" }}>Notification Preview</p>
          <Notification
            ayah={ayah}
            settings={settings}
            onNext={handleNextAyah}
            onPrevious={handlePreviousAyah}
            onDismiss={() => handleNextAyah()}
            isPending={isPending}
          />
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
