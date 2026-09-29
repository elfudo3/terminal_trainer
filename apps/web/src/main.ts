/** Entry point: styles, a storage guard, then the app. */
import "@terminal-trainer/ui/theme.css";
import "@terminal-trainer/ui/terminal.css";
import "./styles.css";
import { createWebApp } from "./app";

declare const __APP_VERSION__: string;

/** localStorage can throw (private mode, disabled storage); fall back to no persistence. */
function safeStorage(): Storage | undefined {
  try {
    localStorage.setItem("terminal-trainer.ping", "1");
    localStorage.removeItem("terminal-trainer.ping");
    return localStorage;
  } catch {
    return undefined;
  }
}

createWebApp(document.getElementById("app")!, { storage: safeStorage(), version: __APP_VERSION__ });
