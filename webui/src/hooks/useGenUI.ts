import { useStore } from "zustand";
import { useGenUIContext } from "../provider/context";
import type { GenUIState } from "../store/createStore";

/**
 * Subscribe to the GenUI store with a selector, e.g.
 * `const status = useGenUI((s) => s.status)`. Use narrow selectors to limit
 * re-renders (avoid returning fresh object literals without a shallow compare).
 */
export function useGenUI<T>(selector: (state: GenUIState) => T): T {
  const { store } = useGenUIContext();
  return useStore(store, selector);
}
