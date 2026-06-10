import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useGenUI } from "../../../hooks/useGenUI";
import { useGenUIContext } from "../../../provider/context";
import { CanvasCard } from "./CanvasCard";
import styles from "./canvas.module.css";
import { CARD_W, type Camera, clampScale, COLS, EST_H, GAP, type Geo, ORIGIN, placeNext } from "./layout";

const HEADER = 38; // approx card header height, for bounds math
const PAD = 48; // keep this much of the content within view when clamping

type Interaction =
  | { type: "pan"; sx: number; sy: number; cx: number; cy: number }
  | { type: "drag"; id: string; sx: number; sy: number; ox: number; oy: number }
  | { type: "resize"; id: string; sx: number; sy: number; ow: number; oh: number };

export function CanvasBoard({ cardIds }: { cardIds: string[] }) {
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
  const followRef = useRef(true);
  const fitTok = useRef(0);

  const cardH = useCallback(
    (id: string) => {
      const g = geo[id];
      const inner = g?.auto === false ? (g.h ?? EST_H) : (heights.current[id] ?? EST_H);
      return inner + HEADER;
    },
    [geo],
  );

  const bounds = useCallback(() => {
    const ids = cardIds.filter((id) => geo[id]);
    if (ids.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of ids) {
      const g = geo[id];
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.w);
      maxY = Math.max(maxY, g.y + cardH(id));
    }
    return { minX, minY, maxX, maxY };
  }, [cardIds, geo, cardH]);

  // Clamp the camera so the content bbox can never leave the viewport.
  const clamp = useCallback(
    (c: Camera): Camera => {
      const rect = boardRef.current?.getBoundingClientRect();
      const b = bounds();
      if (!rect || !b) return c;
      const xmin = PAD - b.maxX * c.scale;
      const xmax = rect.width - PAD - b.minX * c.scale;
      const ymin = PAD - b.maxY * c.scale;
      const ymax = rect.height - PAD - b.minY * c.scale;
      const fit = (v: number, lo: number, hi: number) => (lo <= hi ? Math.max(lo, Math.min(hi, v)) : (lo + hi) / 2);
      return { scale: c.scale, x: fit(c.x, xmin, xmax), y: fit(c.y, ymin, ymax) };
    },
    [bounds],
  );

  const fitAll = useCallback(
    (reenableFollow = false) => {
      if (reenableFollow) followRef.current = true;
      const rect = boardRef.current?.getBoundingClientRect();
      const b = bounds();
      if (!rect || !b) return;
      const bw = Math.max(1, b.maxX - b.minX);
      const bh = Math.max(1, b.maxY - b.minY);
      const scale = clampScale(Math.min((rect.width - 2 * PAD) / bw, (rect.height - 2 * PAD) / bh));
      setCam({
        scale,
        x: rect.width / 2 - ((b.minX + b.maxX) / 2) * scale,
        y: rect.height / 2 - ((b.minY + b.maxY) / 2) * scale,
      });
    },
    [bounds],
  );

  const scheduleFit = useCallback(() => {
    const tok = ++fitTok.current;
    requestAnimationFrame(() => {
      if (tok === fitTok.current && followRef.current) fitAll();
    });
  }, [fitAll]);

  // Place newly arrived cards into the shortest column; auto-fit if following.
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
        next[id] = { x: slot.x, y: slot.y, w: CARD_W, col: slot.col, auto: true };
        cols[slot.col] = slot.y + (heights.current[id] ?? EST_H) + GAP;
      }
      return next;
    });
    if (followRef.current) scheduleFit();
  }, [cardIds, scheduleFit]);

  const applyHeight = useCallback(
    (id: string, px: number) => {
      heights.current[id] = px;
      if (followRef.current) scheduleFit();
    },
    [scheduleFit],
  );

  // --- interactions ---
  const startPan = (e: ReactPointerEvent) => {
    if (e.target !== boardRef.current && (e.target as HTMLElement).dataset.world === undefined) return;
    interaction.current = { type: "pan", sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    followRef.current = false;
    setPanning(true);
    setSelected(null);
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const startDrag = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    const g = geo[id];
    if (!g) return;
    followRef.current = false;
    interaction.current = { type: "drag", id, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y };
    setSelected(id);
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const startResize = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    const g = geo[id];
    if (!g) return;
    followRef.current = false;
    interaction.current = {
      type: "resize",
      id,
      sx: e.clientX,
      sy: e.clientY,
      ow: g.w,
      oh: g.auto === false ? (g.h ?? EST_H) : (heights.current[id] ?? EST_H),
    };
    setSelected(id);
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    const it = interaction.current;
    if (!it) return;
    if (it.type === "pan") {
      setCam((c) => clamp({ ...c, x: it.cx + (e.clientX - it.sx), y: it.cy + (e.clientY - it.sy) }));
    } else if (it.type === "drag") {
      const dx = (e.clientX - it.sx) / cam.scale;
      const dy = (e.clientY - it.sy) / cam.scale;
      setGeo((prev) => ({ ...prev, [it.id]: { ...prev[it.id], x: it.ox + dx, y: it.oy + dy } }));
    } else {
      const w = Math.max(200, it.ow + (e.clientX - it.sx) / cam.scale);
      const h = Math.max(120, it.oh + (e.clientY - it.sy) / cam.scale);
      setGeo((prev) => ({ ...prev, [it.id]: { ...prev[it.id], w, h, auto: false } }));
    }
  };
  const endInteraction = (e: ReactPointerEvent) => {
    interaction.current = null;
    setPanning(false);
    boardRef.current?.releasePointerCapture(e.pointerId);
  };
  const onWheel = (e: ReactWheelEvent) => {
    followRef.current = false;
    if (e.ctrlKey || e.metaKey) {
      const rect = boardRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setCam((c) => {
        const ns = clampScale(c.scale * Math.exp(-e.deltaY * 0.0015));
        return clamp({ scale: ns, x: px - ((px - c.x) / c.scale) * ns, y: py - ((py - c.y) / c.scale) * ns });
      });
    } else {
      setCam((c) => clamp({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
    }
  };

  const zoomBy = (factor: number) =>
    setCam((c) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const px = (rect?.width ?? 0) / 2;
      const py = (rect?.height ?? 0) / 2;
      const ns = clampScale(c.scale * factor);
      followRef.current = false;
      return clamp({ scale: ns, x: px - ((px - c.x) / c.scale) * ns, y: py - ((py - c.y) / c.scale) * ns });
    });

  const tidy = () => {
    setGeo((prev) => {
      const cols = new Array(COLS).fill(ORIGIN);
      const next: Record<string, Geo> = {};
      for (const id of cardIds) {
        if (!prev[id]) continue;
        const slot = placeNext(cols);
        next[id] = { x: slot.x, y: slot.y, w: CARD_W, col: slot.col, auto: prev[id].auto, h: prev[id].h };
        cols[slot.col] = slot.y + cardH(id) + GAP;
      }
      return next;
    });
    requestAnimationFrame(() => fitAll(true));
  };

  // Focus directive → center the requested card (without enabling follow).
  useEffect(() => {
    if (!focusRequest) return;
    const g = geo[focusRequest.id];
    const rect = boardRef.current?.getBoundingClientRect();
    if (!g || !rect) return;
    followRef.current = false;
    setCam((c) => clamp({ scale: c.scale, x: rect.width / 2 - (g.x + g.w / 2) * c.scale, y: rect.height / 2 - (g.y + cardH(focusRequest.id) / 2) * c.scale }));
    setSelected(focusRequest.id);
  }, [focusRequest, geo, clamp, cardH]);

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
              onGripPointerDown={(e) => startResize(e, id)}
              onClose={() => store.getState().dismissCard(id)}
              onHeight={(px) => applyHeight(id, px)}
            />
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <button title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          −
        </button>
        <span className={styles.zoom}>{Math.round(cam.scale * 100)}%</span>
        <button title="Zoom in" onClick={() => zoomBy(1.2)}>
          +
        </button>
        <span className={styles.sep} />
        <button title="Fit all & auto-follow" onClick={() => fitAll(true)}>
          ⤢
        </button>
        <button title="Tidy layout" onClick={tidy}>
          ▦
        </button>
      </div>
    </div>
  );
}
