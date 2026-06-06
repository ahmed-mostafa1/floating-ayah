import { useEffect, useRef, useState } from "react";
import type { Ayah, AppSettings } from "./types";

function arabicStyle(fontFamily: string): { fontFamily?: string } {
  if (fontFamily === "Amiri") return { fontFamily: '"Amiri", serif' };
  if (fontFamily === "KFGQPC") return { fontFamily: '"KFGQPC Uthman Taha Naskh", "Amiri", serif' };
  return {};
}

type Props = {
  ayah: Ayah;
  settings: AppSettings;
  onNext: () => void;
  onPrevious: () => void;
  onDismiss: () => void;
  isPending?: boolean;
};

export function Notification({ ayah, settings, onNext, onPrevious, onDismiss, isPending = false }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(settings.autoDismissSeconds);
  const [copied, setCopied] = useState(false);
  const dismissedRef = useRef(false);

  // Deadline-based countdown: compute remaining time from a wall-clock deadline
  // on every tick rather than decrementing a counter. setInterval is throttled/
  // coalesced when this window is unfocused, so a counting timer drifts and the
  // card lingers past zero — recomputing against Date.now() stays accurate.
  useEffect(() => {
    dismissedRef.current = false;
    const deadline = Date.now() + settings.autoDismissSeconds * 1000;
    setSecondsLeft(settings.autoDismissSeconds);

    const tick = () => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0 && !dismissedRef.current) {
        dismissedRef.current = true;
        clearInterval(interval);
        onDismiss();
      }
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [ayah, settings.autoDismissSeconds, onDismiss]);

  function handleCopy() {
    const text = `${ayah.textUthmani}\n\n${ayah.textEnglish}\n\n— ${ayah.surahName} ${ayah.surahId}:${ayah.ayahId}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const progress = settings.autoDismissSeconds > 0
    ? (secondsLeft / settings.autoDismissSeconds) * 100
    : 0;

  return (
    <div className="notif-card" role="dialog" aria-label={`Ayah reminder: ${ayah.surahName} ${ayah.surahId}:${ayah.ayahId}`}>
      <div className="notif-header">
        <div className="notif-meta">
          <span className="notif-surah">{ayah.surahName}</span>
          <span className="notif-ref">{ayah.surahId}:{ayah.ayahId}</span>
        </div>
        <div className="notif-controls">
          <div className="notif-timer-ring" aria-label={`Closes in ${secondsLeft}s`} role="timer">
            <svg viewBox="0 0 36 36" className="notif-ring-svg">
              <circle cx="18" cy="18" r="15.9" className="notif-ring-track" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                className="notif-ring-fill"
                strokeDasharray={`${progress} 100`}
              />
            </svg>
            <span className="notif-timer-label">{secondsLeft}</span>
          </div>
          <button
            type="button"
            className="notif-close-btn"
            onClick={onDismiss}
            aria-label="Close notification"
            title="Close"
          >
            X
          </button>
        </div>
      </div>

      <p className="notif-arabic" dir="rtl" lang="ar" style={arabicStyle(settings.fontFamily)}>
        {ayah.textUthmani}
      </p>

      {settings.showEnglish && <p className="notif-english">{ayah.textEnglish}</p>}

      <p className="notif-progress-label">{ayah.globalIndex} / 6236</p>

      <div className="notif-progress-track" aria-hidden="true">
        <div className="notif-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="notif-actions">
        <button
          type="button"
          className="notif-btn notif-btn-ghost"
          onClick={onPrevious}
          disabled={isPending}
          aria-label="Previous Ayah"
        >
          ‹ Prev
        </button>
        <button
          type="button"
          className="notif-btn notif-btn-ghost"
          onClick={handleCopy}
          aria-label="Copy Ayah text"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          className="notif-btn notif-btn-primary"
          onClick={onNext}
          disabled={isPending}
          aria-label="Next Ayah"
        >
          {isPending ? "…" : "Next ›"}
        </button>
      </div>
    </div>
  );
}
