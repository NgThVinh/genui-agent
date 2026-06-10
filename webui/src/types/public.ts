// Public types exposed to host apps.
import type { ComponentStatus, Surface } from "./genui";

/** CSS-variable theme overrides. Keys map to `--genui-<key>` custom properties. */
export interface GenUITheme {
  /** Accent / brand color (buttons, active states). */
  accent?: string;
  /** Base font family for the widget chrome. */
  font?: string;
  /** Corner radius for cards and bubbles, e.g. "12px". */
  radius?: string;
  /** Any additional `--genui-*` token (without the prefix). */
  [token: string]: string | undefined;
}

/** A user interaction emitted from inside a card (Phase 2 uplink seam). */
export interface GenUIAction {
  /** Id of the card that emitted the action. */
  id: string;
  action: string;
  payload?: unknown;
}

export type ChatLayout = "sidebar" | "page" | "floating";

/** A live (non-retired) on-screen component instance. */
export interface CardInstance {
  id: string;
  surface: Surface;
  title: string;
  status: ComponentStatus;
  turn: number;
  html: string;
}
