import { invoke } from "@tauri-apps/api/core";
import type { AppState, Ayah } from "./types";

const mockAyahs: Ayah[] = [
  {
    surahId: 1,
    ayahId: 1,
    surahName: "Al-Fatihah",
    textUthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
    textEnglish: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  },
  {
    surahId: 1,
    ayahId: 2,
    surahName: "Al-Fatihah",
    textUthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
    textEnglish: "All praise is due to Allah, Lord of the worlds.",
  },
  {
    surahId: 1,
    ayahId: 3,
    surahName: "Al-Fatihah",
    textUthmani: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
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
