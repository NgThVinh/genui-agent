import { useEffect, useRef } from "react";
import { useGenUIContext } from "../provider/context";
import type { GenUIAction } from "../types/public";

/** Subscribe to card actions (Phase-2 uplink) without re-subscribing each render. */
export function useGenUIActions(listener: (action: GenUIAction) => void): void {
  const { subscribeAction } = useGenUIContext();
  const ref = useRef(listener);
  ref.current = listener;
  useEffect(() => subscribeAction((a) => ref.current(a)), [subscribeAction]);
}
