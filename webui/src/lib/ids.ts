export const uid = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
