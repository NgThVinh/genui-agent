import { type PointerEvent as ReactPointerEvent } from "react";
import type { CardInstance } from "../../../types/public";
import { CardChrome } from "../../cards/CardChrome";
import styles from "./canvas.module.css";
import type { Geo } from "./layout";

interface CanvasCardProps {
  inst: CardInstance;
  geo: Geo;
  selected: boolean;
  onHeaderPointerDown: (e: ReactPointerEvent) => void;
  onGripPointerDown: (e: ReactPointerEvent) => void;
  onSelect: () => void;
  onClose: () => void;
  onHeight: (px: number) => void;
}

/** A draggable, resizable, auto-sizing card positioned on the workspace board. */
export function CanvasCard({
  inst,
  geo,
  selected,
  onHeaderPointerDown,
  onGripPointerDown,
  onSelect,
  onClose,
  onHeight,
}: CanvasCardProps) {
  const resized = geo.auto === false;
  return (
    <div
      className={styles.card}
      data-selected={selected}
      style={{ transform: `translate(${geo.x}px, ${geo.y}px)`, width: geo.w }}
      onPointerDownCapture={onSelect}
    >
      <CardChrome
        inst={inst}
        onClose={onClose}
        autoSize={!resized}
        height={resized ? geo.h : undefined}
        onHeight={onHeight}
        headerProps={{ className: styles.dragHeader, onPointerDown: onHeaderPointerDown }}
      />
      <div className={styles.grip} title="Resize" onPointerDown={onGripPointerDown} />
    </div>
  );
}
