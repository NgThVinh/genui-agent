import type { CSSProperties } from "react";
import type { GenUITheme } from "../types/public";

/** Convert a GenUITheme into inline `--genui-*` CSS custom properties. */
export function themeToVars(theme?: GenUITheme): CSSProperties {
  if (!theme) return {};
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (value != null) vars[`--genui-${key}`] = value;
  }
  return vars as CSSProperties;
}
