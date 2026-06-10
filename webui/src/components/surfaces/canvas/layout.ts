export const COLS = 2;
export const CARD_W = 280;
export const GAP = 22;
export const ORIGIN = 24;
export const EST_H = 200;

export interface Geo {
  x: number;
  y: number;
  w: number;
  col: number;
  /** When false, the card is manually resized: `h` is the explicit iframe height. */
  auto?: boolean;
  h?: number;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** Pick the shortest of `cols` (bottom y per column) and return the next slot. */
export function placeNext(colBottoms: number[]): { x: number; y: number; col: number } {
  let col = 0;
  for (let i = 1; i < colBottoms.length; i++) if (colBottoms[i] < colBottoms[col]) col = i;
  return { x: ORIGIN + col * (CARD_W + GAP), y: colBottoms[col], col };
}

export const clampScale = (s: number): number => Math.max(0.25, Math.min(2.5, s));
