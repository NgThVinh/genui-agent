// UI-state mirrored over the AG-UI `state` channel (descriptors only, no HTML).
import type { ComponentStatus, Surface } from "./genui";

export interface UIComponentDescriptor {
  id: string;
  surface: Surface;
  title?: string | null;
  status?: ComponentStatus | null;
  turn: number;
}

export interface AppStateSnapshot {
  ui: { components: UIComponentDescriptor[] };
  turn: number;
}
