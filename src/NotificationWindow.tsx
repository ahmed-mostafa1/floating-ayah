import { useEffect, useState, useTransition } from "react";
import { getAppState, getNextAyah, getPreviousAyah, dismissNotification } from "./tauri";
import { Notification } from "./Notification";
import type { AppSettings, Ayah } from "./types";

export function NotificationWindow() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    try {
      const state = await getAppState();
      setSettings(state.settings);
      setAyah(state.currentAyah);
    } catch {
      // If the DB read fails, silently dismiss rather than crashing
      await dismissNotification();
    }
  }

  useEffect(() => {
    refresh();

    // Re-fetch whenever Rust shows the window again
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("notification-show", () => refresh()).then((fn) => {
        unlisten = fn;
      });
    });

    return () => unlisten?.();
  }, []);

  function handleNext() {
    if (!ayah) return;
    startTransition(async () => {
      setAyah(await getNextAyah(ayah));
    });
  }

  function handlePrevious() {
    if (!ayah) return;
    startTransition(async () => {
      setAyah(await getPreviousAyah(ayah));
    });
  }

  async function handleDismiss() {
    await dismissNotification();
  }

  if (!ayah || !settings) {
    return null;
  }

  return (
    <div className="notif-window">
      <Notification
        ayah={ayah}
        settings={settings}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onDismiss={handleDismiss}
        isPending={isPending}
      />
    </div>
  );
}
