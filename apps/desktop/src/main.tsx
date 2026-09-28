import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@horune/design-system/fonts";
import "@horune/design-system/styles.css";
import "@horune/theme-renderer/styles.css";
import "@horune/theme-studio/styles.css";
import "./app.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
