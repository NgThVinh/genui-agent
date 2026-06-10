import { type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, useCallback, useEffect, useRef, useState } from "react";
import { useGenUI } from "../../../hooks/useGenUI";
import { useGenUIContext } from "../../../provider/context";
import { CanvasCard } from "./CanvasCard";
import styles from "./canvas.module.css";
import { CARD_W, type Camera, clampScale, COLS, EST_H, GAP, type Geo, ORIGIN, placeNext } from "./layout";

type Interaction =
  | { type: "pan"; sx: number; sy: number; cx: number; cy: number }
  | { type: "drag"; id: string; sx: number; sy: number; ox: number; oy: number };

export function CanvasBoard({ cardIds, onClose }: { cardIds: string[]; onClose: () => void }) {
  const { store } = useGenUIContext();
  const registry = useGenUI((s) => s.registry);
  const focusRequest = useGenUI((s) => s.focusRequest);

  const [cam, setCam] = useState<Camera>({ x: ORIGIN, y: ORIGIN, scale: 1 });
  const [geo, setGeo] = useState<Record<string, Geo>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const heights = useRef<Record<string, number>>({});
  const interaction = useRef<Interaction | null>(null);

  // Place any newly arrived cards into the shortest column.
  useEffect(() => {
    setGeo((prev) => {
      const missing = cardIds.filter((id) => !prev[id]);
      if (missing.length === 0) return prev;
      const cols = new Array(COLS).fill(ORIGIN);
      for (const id of cardIds) {
        const g = prev[id];
        if (!g) continue;
        const b = g.y + (heights.current[id] ?? EST_H) + GAP;
        if (b > cols[g.col]) cols[g.col] = b;
      }
      const next = { ...prev };
      for (const id of missing) {
        const slot = placeNext(cols);
        next[id] = { x: slot.x, y: slot.y, w: CARD_W, col: slot.col };
        cols[slot.col] = slot.y + (heights.current[id] ?? EST_H) + GAP;
      }
      return next;
    });
  }, [cardIds]);

  const applyHeight = useCallback((id: string, px: number) => {
    heights.current[id] = px;
  }, []);

  // --- interactions ---
  const startPan = (e: ReactPointerEvent) => {
    if (e.target !== boardRef.current && (e.target as HTMLElement).dataset.world === undefined) return;
    interaction.current = { type: "pan", sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    setPanning(true);
    setSelected(null);
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const startDrag = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    const g = geo[id];
    if (!g) return;
    interaction.current = { type: "drag", id, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y };
    setSelected(id);
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    const it = interaction.current;
    if (!it) return;
    if (it.type === "pan") {
      setCam((c) => ({ ...c, x: it.cx + (e.clientX - it.sx), y: it.cy + (e.clientY - it.sy) }));
    } else {
      const dx = (e.clientX - it.sx) / cam.scale;
      const dy = (e.clientY - it.sy) / cam.scale;
      setGeo((prev) => ({ ...prev, [it.id]: { ...prev[it.id], x: it.ox + dx, y: it.oy + dy } }));
    }
  };
  const endInteraction = (e: ReactPointerEvent) => {
    interaction.current = null;
    setPanning(false);
    boardRef.current?.releasePointerCapture(e.pointerId);
  };
  const onWheel = (e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const rect = boardRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setCam((c) => {
        const ns = clampScale(c.scale * Math.exp(-e.deltaY * 0.0015));
        return { scale: ns, x: px - ((px - c.x) / c.scale) * ns, y: py - ((py - c.y) / c.scale) * ns };
      });
    } else {
      setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
    }
  };

  const zoomBy = (factor: number) =>
    setCam((c) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const px = (rect?.width ?? 0) / 2;
      const py = (rect?.height ?? 0) / 2;
      const ns = clampScale(c.scale * factor);
      return { scale: ns, x: px - ((px - c.x) / c.scale) * ns, y: py - ((py - c.y) / c.scale) * ns };
    });

  const fitAll = useCallback(() => {
    const rect = boardRef.current?.getBoundingClientRect();
    const ids = cardIds.filter((id) => geo[id]);
    if (!rect || ids.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of ids) {
      const g = geo[id];
      const h = heights.current[id] ?? EST_H;
      minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + h);
    }
    const pad = 40;
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const scale = clampScale(Math.min((rect.width - 2 * pad) / bw, (rect.height - 2 * pad) / bh));
    setCam({
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    });
  }, [cardIds, geo]);

  const tidy = () => {
    setGeo((prev) => {
      const cols = new Array(COLS).fill(ORIGIN);
      const next: Record<string, Geo> = {};
      for (const id of cardIds) {
        if (!prev[id]) continue;
        const slot = placeNext(cols);
        next[id] = { x: slot.x, y: slot.y, w: CARD_W, col: slot.col };
        cols[slot.col] = slot.y + (heights.current[id] ?? EST_H) + GAP;
      }
      return next;
    });
    requestAnimationFrame(fitAll);
  };

  // Focus directive → center the requested card.
  useEffect(() => {
    if (!focusRequest) return;
    const g = geo[focusRequest.id];
    const rect = boardRef.current?.getBoundingClientRect();
    if (!g || !rect) return;
    const h = heights.current[focusRequest.id] ?? EST_H;
    setCam((c) => ({
      scale: c.scale,
      x: rect.width / 2 - (g.x + g.w / 2) * c.scale,
      y: rect.height / 2 - (g.y + h / 2) * c.scale,
    }));
    setSelected(focusRequest.id);
  }, [focusRequest, geo]);

  return (
    <div
      ref={boardRef}
      className={styles.board}
      data-panning={panning}
      data-busy={interaction.current !== null}
      onPointerDown={startPan}
      onPointerMove={onMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      onWheel={onWheel}
    >
      <div className={styles.world} data-world style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})` }}>
        {cardIds.map((id) => {
          const inst = registry[id];
          const g = geo[id];
          if (!inst || !g) return null;
          return (
            <CanvasCard
              key={id}
              inst={inst}
              geo={g}
              selected={selected === id}
              onSelect={() => setSelected(id)}
              onHeaderPointerDown={(e) => startDrag(e, id)}
              onClose={() => store.getState().dismissCard(id)}
              onHeight={(px) => applyHeight(id, px)}
            />
          );
        })}
      </div>

      <button className={styles.close} title="Close workspace" onClick={onClose}>
        ×
      </button>

      <div className={styles.toolbar}>
        <button title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          −
        </button>
        <span className={styles.zoom}>{Math.round(cam.scale * 100)}%</span>
        <button title="Zoom in" onClick={() => zoomBy(1.2)}>
          +
        </button>
        <span className={styles.sep} />
        <button title="Fit all" onClick={fitAll}>
          ⤢
        </button>
        <button title="Tidy" onClick={tidy}>
          ▦
        </button>
      </div>
    </div>
  );
}
