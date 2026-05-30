import { useEffect, useState, useTransition } from "react";
import { getAppState, getNextAyah, getPreviousAyah } from "./tauri";
import { Notification } from "./Notification";
import { Settings } from "./Settings";
import type { AppSettings, Ayah } from "./types";

type LoadState = "loading" | "ready" | "error";
type Tab = "reminder" | "settings";

function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("reminder");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    getAppState()
      .then((state) => {
        if (cancelled) return;
        setSettings(state.settings);
        setAyah(state.currentAyah);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load app state.");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleNextAyah() {
    if (!ayah) return;
    startTransition(async () => {
      setAyah(await getNextAyah(ayah));
    });
  }

  function handlePreviousAyah() {
    if (!ayah) return;
    startTransition(async () => {
      setAyah(await getPreviousAyah(ayah));
    });
  }

  if (loadState === "loading") {
    return <main className="app-shell status-shell">Loading…</main>;
  }

  if (loadState === "error" || !settings || !ayah) {
    return (
      <main className="app-shell status-shell">
        {errorMessage ?? "Noor Remind could not start."}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-dot" />
          <span className="app-brand-name">Noor Remind</span>
        </div>
        <nav className="app-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reminder"}
            className={`app-tab ${tab === "reminder" ? "app-tab-active" : ""}`}
            onClick={() => setTab("reminder")}
          >
            Reminder
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "settings"}
            className={`app-tab ${tab === "settings" ? "app-tab-active" : ""}`}
            onClick={() => setTab("settings")}
          >
            Settings
          </button>
        </nav>
        <div className="app-header-fill" />
      </header>

      {tab === "reminder" && (
        <section className="workspace-grid">
          <article className="notification-preview-panel" aria-label="Notification preview">
            <p className="eyebrow" style={{ marginBottom: "18px" }}>Preview</p>
            <Notification
              ayah={ayah}
              settings={settings}
              onNext={handleNextAyah}
              onPrevious={handlePreviousAyah}
              onDismiss={handleNextAyah}
              isPending={isPending}
            />
          </article>

          <aside className="card settings-card" aria-label="Reminder settings summary">
            <p className="eyebrow">Current Settings</p>
            <h2>Active configuration</h2>
            <dl className="settings-list">
              <div>
                <dt>Interval</dt>
                <dd>{settings.intervalMinutes} min</dd>
              </div>
              <div>
                <dt>Auto-dismiss</dt>
                <dd>{settings.autoDismissSeconds}s</dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>{settings.position.replace("-", " ")}</dd>
              </div>
              <div>
                <dt>Auto start</dt>
                <dd>{settings.autoStart ? "On" : "Off"}</dd>
              </div>
              <div>
                <dt>Do Not Disturb</dt>
                <dd>{settings.suppressDuringFullscreen ? "On" : "Off"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{settings.pauseUntil === "none" ? "Active" : "Paused"}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: "20px", width: "100%" }}
              onClick={() => setTab("settings")}
            >
              Edit Settings
            </button>
          </aside>
        </section>
      )}

      {tab === "settings" && (
        <Settings
          settings={settings}
          onUpdate={(next) => setSettings(next)}
        />
      )}
    </main>
  );
}

export default App;
