import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, AppState, Ayah } from "./types";

const mockAyahs: Ayah[] = [
  {
    surahId: 1,
    ayahId: 1,
    globalIndex: 1,
    surahName: "Al-Fatihah",
    textUthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    textEnglish: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  },
  {
    surahId: 1,
    ayahId: 2,
    globalIndex: 2,
    surahName: "Al-Fatihah",
    textUthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
    textEnglish: "All praise is due to Allah, Lord of the worlds.",
  },
  {
    surahId: 1,
    ayahId: 3,
    globalIndex: 3,
    surahName: "Al-Fatihah",
    textUthmani: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    textEnglish: "The Entirely Merciful, the Especially Merciful.",
  },
];

const mockState: AppState = {
  settings: {
    intervalMinutes: 30,
    autoDismissSeconds: 30,
    position: "bottom-right",
    fontFamily: "System",
    autoStart: true,
    suppressDuringFullscreen: true,
    pauseUntil: "none",
    pauseExpiresAt: 0,
  },
  currentAyah: mockAyahs[0],
};

const isTauri = "__TAURI_INTERNALS__" in window;

export async function getAppState(): Promise<AppState> {
  if (isTauri) {
    return invoke<AppState>("get_app_state");
  }

  return mockState;
}

export async function getNextAyah(current: Ayah): Promise<Ayah> {
  if (isTauri) {
    return invoke<Ayah>("get_next_ayah", {
      currentSurahId: current.surahId,
      currentAyahId: current.ayahId,
    });
  }

  const currentIndex = mockAyahs.findIndex(
    (ayah) => ayah.surahId === current.surahId && ayah.ayahId === current.ayahId,
  );
  return mockAyahs[(currentIndex + 1) % mockAyahs.length];
}

export async function getPreviousAyah(current: Ayah): Promise<Ayah> {
  if (isTauri) {
    return invoke<Ayah>("get_previous_ayah", {
      currentSurahId: current.surahId,
      currentAyahId: current.ayahId,
    });
  }

  const currentIndex = mockAyahs.findIndex(
    (ayah) => ayah.surahId === current.surahId && ayah.ayahId === current.ayahId,
  );
  return mockAyahs[(currentIndex - 1 + mockAyahs.length) % mockAyahs.length];
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  if (isTauri) {
    return invoke<AppSettings>("update_settings", { settings });
  }
  return settings;
}

export async function setCurrentAyah(surahId: number, ayahId: number): Promise<Ayah> {
  if (isTauri) {
    return invoke<Ayah>("set_current_ayah", { surahId, ayahId });
  }
  return mockAyahs[0];
}

export async function dismissNotification(): Promise<void> {
  if (isTauri) {
    return invoke("dismiss_notification");
  }
}

export async function resetNotificationTimeout(): Promise<void> {
  if (isTauri) {
    return invoke("reset_notification_timeout");
  }
}
