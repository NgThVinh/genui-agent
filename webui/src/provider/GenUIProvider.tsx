import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { CardHostRegistry } from "../bridge/hostRegistry";
import { useGenuiBridge } from "../bridge/useGenuiBridge";
import { createGenUIStore, type GenUIStore } from "../store/createStore";
import { themeToVars } from "../theme/theme";
import { useConfig } from "../transport/useConfig";
import type { GenUIAction, GenUITheme } from "../types/public";
import { GenUIContext, type GenUIContextValue } from "./context";

export interface GenUIProviderProps {
  /** Base URL of the agent backend (default: same origin). */
  baseUrl?: string;
  /** CSS-variable theme overrides applied to the widget chrome. */
  theme?: GenUITheme;
  /** Optional stable conversation thread id. */
  threadId?: string;
  /** Called when a user interaction is emitted from inside a card (Phase 2). */
  onAction?: (action: GenUIAction) => void;
  children: ReactNode;
}

/**
 * Root of the SDK. Creates a per-instance store + card-host registry, runs the
 * config fetch, installs the host-window bridge, and scopes the `--genui-*`
 * theme. Renders a `display:contents` root so it never disturbs host layout.
 */
export function GenUIProvider({
  baseUrl = "",
  theme,
  threadId,
  onAction,
  children,
}: GenUIProviderProps) {
  // Created once per provider instance.
  const hostRegistryRef = useRef<CardHostRegistry>(undefined as unknown as CardHostRegistry);
  if (!hostRegistryRef.current) hostRegistryRef.current = new CardHostRegistry();
  const storeRef = useRef<GenUIStore>(undefined as unknown as GenUIStore);
  if (!storeRef.current) storeRef.current = createGenUIStore(hostRegistryRef.current, threadId);

  const listenersRef = useRef(new Set<(a: GenUIAction) => void>());
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const dispatchAction = useCallback((action: GenUIAction) => {
    onActionRef.current?.(action);
    for (const l of listenersRef.current) l(action);
  }, []);

  const subscribeAction = useCallback((listener: (a: GenUIAction) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const setModel = useCallback((m: string) => storeRef.current.getState().setModel(m), []);
  useConfig(baseUrl, setModel);
  useGenuiBridge(hostRegistryRef.current, dispatchAction);

  // Keep the agent's per-run thread id stable for the provider's lifetime.
  useEffect(() => {
    /* store + registry persist for provider lifetime; nothing to tear down here */
  }, []);

  const ctx: GenUIContextValue = useMemo(
    () => ({
      store: storeRef.current,
      hostRegistry: hostRegistryRef.current,
      baseUrl,
      subscribeAction,
    }),
    [baseUrl, subscribeAction],
  );

  return (
    <GenUIContext.Provider value={ctx}>
      <div className="genui-root" style={{ display: "contents", ...themeToVars(theme) }}>
        {children}
      </div>
    </GenUIContext.Provider>
  );
}
