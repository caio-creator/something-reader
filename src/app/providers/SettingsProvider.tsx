import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadSettings, saveSettings } from "@core/storage/idb";
import { defaultSettings, NEUTRAL_ANCHOR, type ReaderSettings } from "@core/model/types";
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadSettings().then((saved) => {
      setSettings(saved);
      setLoaded(true);
    });
  }, []);

  // Settings are CSS: every screen reads them through custom properties rather
  // than threading props down to every leaf.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty(
      "--anchor",
      settings.anchorColor === NEUTRAL_ANCHOR ? "var(--text)" : settings.anchorColor,
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
    void saveSettings(settings);
  }, [settings, loaded]);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(() => ({ settings, update, loaded }), [settings, update, loaded]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
