import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { NotificationWindow } from "./NotificationWindow";
import "./styles.css";

const isTauri = "__TAURI_INTERNALS__" in window;

let isNotificationWindow = false;
if (isTauri) {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  isNotificationWindow = getCurrentWindow().label === "notification";
} else {
  isNotificationWindow =
    new URLSearchParams(window.location.search).get("window") === "notification";
}

if (isNotificationWindow) {
  document.documentElement.classList.add("notification-root");
  document.body.classList.add("notification-body");
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {isNotificationWindow ? <NotificationWindow /> : <App />}
  </StrictMode>,
);
