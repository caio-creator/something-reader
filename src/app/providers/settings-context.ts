import { createContext, useContext } from "react";
import type { ReaderSettings } from "@core/model/types";

export type SettingsContextValue = {
  settings: ReaderSettings;
  update: (patch: Partial<ReaderSettings>) => void;
  loaded: boolean;
};

/**
 * The context lives apart from the provider component. Keeping them in one file
 * makes Fast Refresh mint a new context object whenever the component changes,
 * which strands every consumer that still holds the old one.
 */
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
};
