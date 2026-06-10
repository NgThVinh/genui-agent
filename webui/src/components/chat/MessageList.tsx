import { useEffect, useRef } from "react";
import { useGenUI } from "../../hooks/useGenUI";
import styles from "./chat.module.css";
import { MessageTurn } from "./MessageTurn";
import { Welcome } from "./Welcome";

export function MessageList() {
  const turns = useGenUI((s) => s.turns);
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep pinned to the latest message as the conversation grows / streams.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <div className={styles.messages} ref={ref} aria-live="polite">
      {turns.length === 0 ? (
        <Welcome />
      ) : (
        turns.map((turn) => <MessageTurn key={turn.id} turn={turn} />)
      )}
    </div>
  );
}
