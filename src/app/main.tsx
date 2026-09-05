import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ui/base.css";
import "@ui/components/components.css";
import "./screens.css";
import { App } from "./App";

// Only in a built app: in dev the service worker would serve stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
