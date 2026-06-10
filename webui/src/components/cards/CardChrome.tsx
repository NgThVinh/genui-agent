import { type HTMLAttributes, type ReactNode, useState } from "react";
import { useGenUIContext } from "../../provider/context";
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
  /** Explicit iframe height (px) when not auto-sizing (resized HTML card). */
  height?: number;
  onHeight?: (px: number) => void;
  /** Spread onto the header (e.g. canvas drag pointer handlers). */
  headerProps?: HTMLAttributes<HTMLDivElement>;
  /** Extra header controls (before source/close), e.g. a focus button. */
  headerExtra?: ReactNode;
}

/** Shared card chrome (header + body), composed by every surface. The body is a
 *  sandboxed iframe for `type:"html"`, or a typed registry component otherwise. */
export function CardChrome({ inst, tag, onClose, autoSize, height, onHeight, headerProps, headerExtra }: CardChromeProps) {
  const { components, emitAction } = useGenUIContext();
  const [showSource, setShowSource] = useState(false);
  const isHtml = inst.type === "html";
  const badge = inst.status === "done" ? "✓" : inst.status === "error" ? "!" : "";
  const def = isHtml ? undefined : components[inst.type];

  return (
    <div className={styles.card} data-status={inst.status}>
      <div className={styles.head} {...headerProps}>
        <span className={styles.badge}>{badge}</span>
        <span className={styles.title}>{inst.title}</span>
        {tag ? <span className={styles.tag}>{tag}</span> : null}
        {headerExtra}
        {isHtml ? (
          <button className={styles.btn} aria-pressed={showSource} title="View source" onClick={() => setShowSource((s) => !s)}>
            &lt;/&gt;
          </button>
        ) : null}
        {onClose ? (
          <button className={styles.btn} title="Remove" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>
      <div className={styles.body}>
        {isHtml ? (
          <ComponentHost
            id={inst.id}
            html={inst.html}
            autoSize={autoSize ?? true}
            height={height}
            showSource={showSource}
            onHeight={onHeight}
          />
        ) : def ? (
          <def.render
            id={inst.id}
            props={inst.props}
            data={inst.data}
            status={inst.status}
            emitAction={(action, payload) => emitAction({ id: inst.id, action, payload })}
          />
        ) : (
          <div className={styles.unknown}>Unknown component type: {inst.type}</div>
        )}
      </div>
    </div>
  );
}
