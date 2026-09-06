import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStorage } from "./storage-context";
import { anchorColor } from "@ui/anchor";
import { defaultSettings, type ReaderSettings } from "@core/model/types";
import { SettingsContext } from "./settings-context";

const READING_SIZES = { s: "17px", m: "19px", l: "22px" } as const;
const READING_FONTS = {
  sans: "var(--font-ui)",
  serif: "var(--font-read)",
  mono: "var(--font-mono)",
  dyslexic: "var(--font-dyslexic)",
} as const;
const EMPHASIS = {
  prominent: "var(--text)",
  normal: "color-mix(in srgb, var(--text) 84%, transparent)",
  subtle: "var(--text-2)",
} as const;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const { loadSettings, saveSettings } = useStorage();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setError(null);
    void loadSettings().then((saved) => {
      if (!live) return;
      setSettings(saved);
      setLoaded(true);
    }).catch((reason: unknown) => {
      if (live) setError(reason instanceof Error ? reason.message : "Could not access your library. Try again.");
    });
    return () => { live = false; };
  }, [attempt, loadSettings]);

  // Settings are CSS: every screen reads them through custom properties rather
  // than threading props down to every leaf.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty(
      "--anchor",
      anchorColor(settings.anchorColor, settings.theme),
    );
    root.style.setProperty("--reading-size", READING_SIZES[settings.fontSize]);
    root.style.setProperty("--reading-font", READING_FONTS[settings.font]);
    root.style.setProperty("--word-color", EMPHASIS[settings.emphasis]);
    root.style.setProperty("--measure", `${settings.measure / 2}rem`);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", settings.theme === "paper" ? "#F7F4EE" : settings.theme === "dim" ? "#111113" : "#000000");
  }, [settings]);

  // OpenDyslexic is a real download; only fetch it if someone chooses it.
  useEffect(() => {
    if (settings.font !== "dyslexic") return;
    void import("@fontsource/opendyslexic/latin-400.css");
  }, [settings.font]);

  useEffect(() => {
    if (!loaded) return;
    void saveSettings(settings).catch(() => setError("Could not save your preferences. Try again."));
  }, [settings, loaded, saveSettings]);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(() => ({ settings, update, loaded, error, retry }), [settings, update, loaded, error, retry]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
