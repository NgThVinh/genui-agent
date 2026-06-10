import { createContext, useContext } from "react";
import type { CardHostRegistry } from "../bridge/hostRegistry";
import type { GenUIStore } from "../store/createStore";
import type { GenUIAction } from "../types/public";

export interface GenUIContextValue {
  store: GenUIStore;
  hostRegistry: CardHostRegistry;
  baseUrl: string;
  /** Register a listener for card actions (Phase-2 uplink). Returns an unsubscribe fn. */
  subscribeAction: (listener: (action: GenUIAction) => void) => () => void;
}

export const GenUIContext = createContext<GenUIContextValue | null>(null);

export function useGenUIContext(): GenUIContextValue {
  const ctx = useContext(GenUIContext);
  if (!ctx) throw new Error("GenUI components must be rendered inside <GenUIProvider>.");
  return ctx;
}
