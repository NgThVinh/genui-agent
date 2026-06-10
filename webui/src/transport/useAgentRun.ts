import { useCallback } from "react";
import { useGenUIContext } from "../provider/context";
import { runAgent } from "./run";

/** Returns `send(text)` — stage a user message and stream an agent run. */
export function useAgentRun(): { send: (text: string) => Promise<void> } {
  const { store, baseUrl } = useGenUIContext();

  const send = useCallback(
    async (text: string) => {
      if (store.getState().status === "streaming") return;
      const trimmed = text.trim();
      if (!trimmed) return;
      store.getState().addUserMessage(trimmed);
      store.getState().beginRun();
      await runAgent(store, baseUrl);
    },
    [store, baseUrl],
  );

  return { send };
}
