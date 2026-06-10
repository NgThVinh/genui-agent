import { useGenUI } from "../../hooks/useGenUI";
import { useGenUIContext } from "../../provider/context";
import { CanvasBoard } from "./canvas/CanvasBoard";
import styles from "./canvas/canvas.module.css";

/**
 * The canvas surface: a transparent overlay anchored over the chat region.
 * Invisible/absent (fully click-through) until canvas cards exist, then it
 * activates and renders the pan/zoom board on top of the conversation.
 * Rendered inside <GenUIChat> by default; also exported as <GenUICanvas> for
 * hosts that want to anchor it over their own relatively-positioned container.
 */
export function CanvasOverlay() {
  const { store } = useGenUIContext();
  const active = useGenUI((s) => s.canvasOverlayActive);
  const canvasIds = useGenUI((s) => s.canvasIds);

  if (!active || canvasIds.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <CanvasBoard cardIds={canvasIds} onClose={() => store.getState().setCanvasOverlayActive(false)} />
    </div>
  );
}

/** Public alias for host-placed usage (anchor over a relative container). */
export const GenUICanvas = CanvasOverlay;
