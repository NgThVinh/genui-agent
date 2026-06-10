import { useGenUI } from "../../hooks/useGenUI";
import type { Turn } from "../../store/createStore";
import { InlineSurface } from "../surfaces/InlineSurface";
import styles from "./chat.module.css";
import { TextBubble } from "./TextBubble";
import { ToolChip } from "./ToolChip";

/** Renders one conversation turn's items in stream order (text, tool chips, inline cards). */
export function MessageTurn({ turn }: { turn: Turn }) {
  return (
    <div className={styles.turn} data-role={turn.role}>
      {turn.items.map((item) => {
        if (item.kind === "text") {
          const role = turn.role === "action" ? "assistant" : turn.role;
          return <TextBubble key={item.id} role={role} text={item.text} />;
        }
        if (item.kind === "tool") {
          return <ToolChip key={item.id} name={item.name} />;
        }
        if (item.kind === "action") {
          return (
            <div key={item.id} className={styles.actionChip}>
              ⤷ {item.label}
            </div>
          );
        }
        return <CardItem key={item.cardId} cardId={item.cardId} frozen={item.frozen} />;
      })}
    </div>
  );
}

// Inline cards render from the live registry while active, falling back to the
// frozen snapshot captured at turn end (so the transcript survives retirement).
function CardItem({ cardId, frozen }: { cardId: string; frozen?: import("../../types/public").CardInstance }) {
  const live = useGenUI((s) => s.registry[cardId]);
  const inst = live ?? frozen;
  if (!inst) return null;
  return <InlineSurface inst={inst} />;
}
