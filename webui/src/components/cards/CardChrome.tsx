import { type HTMLAttributes, type ReactNode, useState } from "react";
import type { CardInstance } from "../../types/public";
import { ComponentHost } from "../host/ComponentHost";
import styles from "./CardChrome.module.css";

interface CardChromeProps {
  inst: CardInstance;
  /** Small uppercase tag in the header (e.g. "inline"). */
  tag?: string;
  /** Show a close button wired to this handler. */
  onClose?: () => void;
  autoSize?: boolean;
  onHeight?: (px: number) => void;
  /** Spread onto the header (e.g. canvas drag pointer handlers). */
  headerProps?: HTMLAttributes<HTMLDivElement>;
  /** Extra header controls (before source/close), e.g. a focus button. */
  headerExtra?: ReactNode;
}

/** Shared card chrome (header + sandboxed body), composed by every surface. */
export function CardChrome({ inst, tag, onClose, autoSize, onHeight, headerProps, headerExtra }: CardChromeProps) {
  const [showSource, setShowSource] = useState(false);
  const badge = inst.status === "done" ? "✓" : inst.status === "error" ? "!" : "";

  return (
    <div className={styles.card} data-status={inst.status}>
      <div className={styles.head} {...headerProps}>
        <span className={styles.badge}>{badge}</span>
        <span className={styles.title}>{inst.title}</span>
        {tag ? <span className={styles.tag}>{tag}</span> : null}
        {headerExtra}
        <button
          className={styles.btn}
          aria-pressed={showSource}
          title="View source"
          onClick={() => setShowSource((s) => !s)}
        >
          &lt;/&gt;
        </button>
        {onClose ? (
          <button className={styles.btn} title="Remove" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>
      <div className={styles.body}>
        <ComponentHost
          id={inst.id}
          html={inst.html}
          autoSize={autoSize ?? true}
          showSource={showSource}
          onHeight={onHeight}
        />
      </div>
    </div>
  );
}
