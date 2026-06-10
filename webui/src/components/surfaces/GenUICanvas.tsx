import { useGenUI } from "../../hooks/useGenUI";
import { useGenUIContext } from "../../provider/context";
import { CardChrome } from "../cards/CardChrome";
import { CanvasBoard } from "./canvas/CanvasBoard";
import boardStyles from "./canvas/canvas.module.css";

/**
 * The workspace surface contents: fills the attached pane (`GenUIChat` provides
 * the sized, relative container). One card → a single focused panel; two or more
 * → the bounded, freeform pan/zoom board. Renders nothing when empty.
 */
export function CanvasWorkspace() {
  const { store } = useGenUIContext();
  const ids = useGenUI((s) => s.workspaceIds);
  const single = useGenUI((s) => (s.workspaceIds.length === 1 ? s.registry[s.workspaceIds[0]] : undefined));

  if (ids.length === 0) return null;

  if (ids.length === 1) {
    if (!single) return null;
    return (
      <div className={boardStyles.single}>
        <CardChrome inst={single} onClose={() => store.getState().dismissCard(single.id)} />
      </div>
    );
  }

  return <CanvasBoard cardIds={ids} />;
}

export const GenUICanvas = CanvasWorkspace;
