import { useGenUI } from "../../hooks/useGenUI";
import { useGenUIContext } from "../../provider/context";
import styles from "./chat.module.css";

export function StatusBar({ onClose }: { onClose?: () => void }) {
  const { store } = useGenUIContext();
  const model = useGenUI((s) => s.model);
  const status = useGenUI((s) => s.status);
  const canvasCount = useGenUI((s) => s.workspaceIds.length);
  const workspaceOpen = useGenUI((s) => s.workspaceOpen);

  return (
    <div className={styles.head}>
      <span className={styles.brand}>
        <span className={styles.glyph} aria-hidden="true" />
        Assistant
      </span>
      <span className={styles.spacer} />
      {canvasCount > 0 ? (
        <button
          className={styles.iconBtn}
          data-on={workspaceOpen}
          title={workspaceOpen ? "Hide workspace" : "Show workspace"}
          aria-label="Toggle workspace"
          onClick={() => store.getState().setWorkspaceOpen(!workspaceOpen)}
        >
          ▥ {canvasCount}
        </button>
      ) : null}
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
