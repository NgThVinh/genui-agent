import { useEffect, useRef } from "react";
import { AUTOHEIGHT } from "../../lib/autoheight";
import { useGenUIContext } from "../../provider/context";
import styles from "./ComponentHost.module.css";

interface ComponentHostProps {
  id: string;
  html: string;
  /** Auto-size to content height (default). Set false when a surface controls height. */
  autoSize?: boolean;
  /** Explicit iframe height (px) used when `autoSize` is false (e.g. a resized card). */
  height?: number;
  /** Show the raw HTML source instead of the rendered iframe. */
  showSource?: boolean;
  /** Notified with the clamped content height when auto-sizing. */
  onHeight?: (px: number) => void;
}

/**
 * The single sandboxed-iframe wrapper used by every surface. Renders agent HTML
 * in an `allow-scripts` (no same-origin) iframe with the AUTOHEIGHT reporter
 * appended, registers with the per-provider CardHostRegistry for the data/height
 * bridge, and flushes queued `data` pushes on load.
 */
export function ComponentHost({ id, html, autoSize = true, height, showSource = false, onHeight }: ComponentHostProps) {
  const { hostRegistry } = useGenUIContext();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const heightCb = autoSize
      ? (px: number) => {
          el.style.height = `${px}px`;
          onHeight?.(px);
        }
      : undefined;
    hostRegistry.attach(id, el, heightCb);
    return () => hostRegistry.detach(id);
  }, [id, hostRegistry, autoSize, onHeight, showSource]);

  // New HTML → hold data pushes until the reload's `load` fires.
  useEffect(() => {
    hostRegistry.markLoading(id);
  }, [id, html, hostRegistry]);

  if (showSource) {
    return <pre className={styles.source}>{html || "(no content yet)"}</pre>;
  }

  return (
    <iframe
      ref={iframeRef}
      className={styles.frame}
      sandbox="allow-scripts"
      title={`Component: ${id}`}
      srcDoc={html + AUTOHEIGHT}
      onLoad={() => hostRegistry.markReady(id)}
      style={autoSize ? { height: 60 } : height ? { height } : undefined}
    />
  );
}
