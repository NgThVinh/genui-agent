// The `genui` directive protocol (frozen backend contract). A CustomEvent named
// "genui" carries one of these as its `value`, discriminated by `op`.

export const PROTOCOL_VERSION = 1;

export type Surface = "inline" | "workspace";
export type ComponentStatus = "active" | "done" | "error" | "info";
export type ComponentSize = "sm" | "md" | "lg" | "full";
export type GenuiOp = "render" | "data" | "focus" | "dismiss";

export interface GenuiDirective {
  v: number;
  op: GenuiOp;
  id?: string;
  surface?: Surface;
  /** "html" for a free-form card, or a typed component name ("chart", "map", …). */
  type?: string;
  title?: string;
  status?: ComponentStatus;
  html?: string;
  /** Props for a typed component (render op). */
  props?: unknown;
  /** Payload for the data op (live stream). */
  data?: unknown;
  size?: ComponentSize;
}
