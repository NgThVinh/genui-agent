import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { CardHostRegistry } from "../bridge/hostRegistry";
import { useGenuiBridge } from "../bridge/useGenuiBridge";
import { builtinComponents } from "../components/registry/builtins";
import { createGenUIStore, type GenUIStore } from "../store/createStore";
import { themeToVars } from "../theme/theme";
import { runAgent } from "../transport/run";
import { useConfig } from "../transport/useConfig";
import type { GenUIAction, GenUIComponentDef, GenUITheme } from "../types/public";
import { GenUIContext, type GenUIContextValue } from "./context";

export interface GenUIProviderProps {
  /** Base URL of the agent backend (default: same origin). */
  baseUrl?: string;
  /** CSS-variable theme overrides applied to the widget chrome. */
  theme?: GenUITheme;
  /** Optional stable conversation thread id. */
  threadId?: string;
  /** Typed components added to / overriding the built-ins (metric/chart/table/map/form). */
  components?: Record<string, GenUIComponentDef>;
  /** Called when a card emits an action. Return `true` to handle it and suppress the agent turn. */
  onAction?: (action: GenUIAction) => boolean | void;
  children: ReactNode;
}

/**
 * Root of the SDK. Creates a per-instance store + card-host registry, runs the
 * config fetch, installs the host-window bridge, scopes the `--genui-*` theme,
 * and provides the typed-component registry + the action-uplink path.
 */
export function GenUIProvider({
  baseUrl = "",
  theme,
  threadId,
  components,
  onAction,
  children,
}: GenUIProviderProps) {
  const hostRegistryRef = useRef<CardHostRegistry>(undefined as unknown as CardHostRegistry);
  if (!hostRegistryRef.current) hostRegistryRef.current = new CardHostRegistry();
  const storeRef = useRef<GenUIStore>(undefined as unknown as GenUIStore);
  if (!storeRef.current) storeRef.current = createGenUIStore(hostRegistryRef.current, threadId);

  const listenersRef = useRef(new Set<(a: GenUIAction) => void>());
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const subscribeAction = useCallback((listener: (a: GenUIAction) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  // A card interaction: notify observers, let the host suppress, else run a turn.
  const emitAction = useCallback(
    (a: GenUIAction) => {
      for (const l of listenersRef.current) l(a);
      const handled = onActionRef.current?.(a) === true;
      if (handled) return;
      const store = storeRef.current;
      if (store.getState().status === "streaming") return;
      store.getState().addActionMessage(a);
      store.getState().beginRun();
      void runAgent(store, baseUrl);
    },
    [baseUrl],
  );

  const registry = useMemo(() => ({ ...builtinComponents, ...(components ?? {}) }), [components]);

  const setModel = useCallback((m: string) => storeRef.current.getState().setModel(m), []);
  useConfig(baseUrl, setModel);
  useGenuiBridge(hostRegistryRef.current, emitAction);

  const ctx: GenUIContextValue = useMemo(
    () => ({
      store: storeRef.current,
      hostRegistry: hostRegistryRef.current,
      baseUrl,
      components: registry,
      emitAction,
      subscribeAction,
    }),
    [baseUrl, registry, emitAction, subscribeAction],
  );

  return (
    <GenUIContext.Provider value={ctx}>
      <div className="genui-root" style={{ display: "contents", ...themeToVars(theme) }}>
        {children}
      </div>
    </GenUIContext.Provider>
  );
}
