import { useEffect } from "react";
import type { GenUIAction } from "../types/public";
import type { CardHostRegistry } from "./hostRegistry";

interface BridgeMessage {
  source?: string;
  type?: string;
  value?: number;
  action?: string;
  payload?: unknown;
}

/**
 * The single host-window message listener. The SDK runs in the host window,
 * which is the `parent` of every (sandboxed) card iframe, so card messages land
 * here directly:
 *   - "genui-internal"/"height" → auto-size the matching card iframe
 *   - "genui"/"action"          → Phase-2 uplink, surfaced to the host `onAction`
 */
export function useGenuiBridge(
  hostRegistry: CardHostRegistry,
  onAction?: (action: GenUIAction) => void,
): void {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const m = e.data as BridgeMessage | null;
      if (!m || typeof m !== "object") return;
      if (m.source === "genui-internal" && m.type === "height") {
        const id = hostRegistry.idByWindow(e.source);
        if (id) hostRegistry.applyHeight(id, Number(m.value));
        return;
      }
      if (m.source === "genui" && m.type === "action") {
        const id = hostRegistry.idByWindow(e.source);
        if (id && onAction) onAction({ id, action: m.action ?? "", payload: m.payload });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [hostRegistry, onAction]);
}
