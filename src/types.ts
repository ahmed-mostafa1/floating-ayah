export type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export type PauseUntil = "none" | "one-hour" | "tomorrow" | "manual";

export type AppSettings = {
  intervalMinutes: number;
  autoDismissSeconds: number;
  position: Position;
  fontFamily: string;
  autoStart: boolean;
  suppressDuringFullscreen: boolean;
  pauseUntil: PauseUntil;
};

export type Ayah = {
  surahId: number;
  ayahId: number;
  surahName: string;
  textUthmani: string;
  textEnglish: string;
};

export type AppState = {
  settings: AppSettings;
  currentAyah: Ayah;
};
