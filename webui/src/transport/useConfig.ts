import { useEffect } from "react";

/** Fetch the active model from GET /config and push it into the store. */
export function useConfig(baseUrl: string, setModel: (model: string) => void): void {
  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/config`)
      .then((r) => r.json())
      .then((c: { model?: string }) => {
        if (!cancelled) setModel(c.model ?? "unknown");
      })
      .catch(() => {
        if (!cancelled) setModel("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, setModel]);
}
