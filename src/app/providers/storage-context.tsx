import { createContext, useContext, type ReactNode } from "react";
import { idbStorage } from "@core/storage/idb";
import type { Storage } from "@core/storage/types";

const Context = createContext<Storage>(idbStorage);
export const StorageProvider = ({ children, storage = idbStorage }: { children: ReactNode; storage?: Storage }) =>
  <Context.Provider value={storage}>{children}</Context.Provider>;
export const useStorage = () => useContext(Context);
