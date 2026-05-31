import { useEffect, useState, useTransition } from "react";
import { getAppState, getNextAyah, getPreviousAyah, dismissNotification } from "./tauri";
import { Notification } from "./Notification";
import type { AppSettings, Ayah } from "./types";

export function NotificationWindow() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh(incomingAyah?: Ayah) {
    try {
      const state = await getAppState();
      setSettings(state.settings);
      // Use the ayah passed directly from the Rust event when available
      // to avoid a stale-content flash while waiting for the command response.
      setAyah(incomingAyah ?? state.currentAyah);
    } catch {
      await dismissNotification();
    }
  }

  useEffect(() => {
    refresh();

    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<Ayah | null>("notification-show", (event) => {
        refresh(event.payload ?? undefined);
      }).then((fn) => {
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
