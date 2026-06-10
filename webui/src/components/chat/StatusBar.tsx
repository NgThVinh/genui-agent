import { useGenUI } from "../../hooks/useGenUI";
import styles from "./chat.module.css";

export function StatusBar({ onClose }: { onClose?: () => void }) {
  const model = useGenUI((s) => s.model);
  const status = useGenUI((s) => s.status);
  return (
    <div className={styles.head}>
      <span className={styles.brand}>
        <span className={styles.glyph} aria-hidden="true" />
        Assistant
      </span>
      <span className={styles.spacer} />
      {model ? <span className={styles.model}>{model}</span> : null}
      <span className={styles.status} data-state={status}>
        <span className={styles.dot} />
        {status}
      </span>
      {onClose ? (
        <button className={styles.iconBtn} title="Close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      ) : null}
    </div>
  );
}
