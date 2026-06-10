import { createContext, useContext } from "react";
import type { CardHostRegistry } from "../bridge/hostRegistry";
import type { GenUIStore } from "../store/createStore";
import type { GenUIAction, GenUIComponentDef } from "../types/public";

export interface GenUIContextValue {
  store: GenUIStore;
  hostRegistry: CardHostRegistry;
  baseUrl: string;
  /** Effective typed-component registry (built-ins merged with host overrides). */
  components: Record<string, GenUIComponentDef>;
  /** Route a card interaction (host onAction first, then an agent turn). */
  emitAction: (action: GenUIAction) => void;
  /** Observe card actions (read-only). Returns an unsubscribe fn. */
  subscribeAction: (listener: (action: GenUIAction) => void) => () => void;
}

export const GenUIContext = createContext<GenUIContextValue | null>(null);

export function useGenUIContext(): GenUIContextValue {
  const ctx = useContext(GenUIContext);
  if (!ctx) throw new Error("GenUI components must be rendered inside <GenUIProvider>.");
  return ctx;
}
