import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ui/base.css";
import "@ui/components/components.css";
import "./screens.css";
import { App } from "./App";
import { voiceNotes } from "@core/voice/supertonic/diagnostics";
import { registerServiceWorker } from "./offline";

/*
 * The voice can fail in four places — download, initialization, synthesis,
 * output — and the audit spent two sessions unable to tell which. This hands
 * the trail to whoever is looking, in a console or in an end-to-end test.
 *
 * Stage names and error messages only: no sentence anyone reads is recorded,
 * nothing is sent anywhere, and it is forgotten when the tab closes.
 */
(globalThis as unknown as { somethingVoiceNotes?: typeof voiceNotes }).somethingVoiceNotes = voiceNotes;

// Only in a built app: in dev the service worker would serve stale modules.
if (import.meta.env.PROD) {
  registerServiceWorker(() => {
    // Settings asks `updateWaiting()` when it renders. Nothing interrupts a
    // reader mid-sentence to announce a new version of the page they are on.
    window.dispatchEvent(new CustomEvent("something:update"));
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
