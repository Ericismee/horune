import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "@horune/design-system/fonts";
import "@horune/design-system/styles.css";
import "@horune/theme-renderer/styles.css";
import "@horune/theme-studio/styles.css";
import "./app.css";
import { App } from "./App";

const overlaySurface = new URLSearchParams(window.location.search).get("surface") === "overlay"
  || ("__TAURI_INTERNALS__" in window && getCurrentWindow().label === "overlay");
if (overlaySurface) {
  document.documentElement.classList.add("overlay-surface");
  document.body.classList.add("overlay-surface");
  document.getElementById("root")?.classList.add("overlay-surface");
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
