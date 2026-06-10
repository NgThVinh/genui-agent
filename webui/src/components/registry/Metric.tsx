import type { GenUIComponentProps } from "../../types/public";
import styles from "./components.module.css";

interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number | string;
}

/** KPI tiles. props: { items: [{label, value, unit?, delta?}] } */
export function Metric({ props }: GenUIComponentProps) {
  const items = ((props as { items?: MetricItem[] } | null)?.items ?? []) as MetricItem[];
  return (
    <div className={styles.metrics}>
      {items.map((it, i) => {
        const deltaNum = typeof it.delta === "number" ? it.delta : Number.parseFloat(String(it.delta ?? ""));
        const deltaClass = Number.isFinite(deltaNum) ? (deltaNum >= 0 ? styles.up : styles.down) : "";
        return (
          <div className={styles.tile} key={i}>
            <div className={styles.tileLabel}>{it.label}</div>
            <div className={styles.tileValue}>
              {it.value}
              {it.unit ? <span className={styles.tileUnit}>{it.unit}</span> : null}
            </div>
            {it.delta != null ? (
              <div className={`${styles.tileDelta} ${deltaClass}`}>
                {Number.isFinite(deltaNum) && deltaNum >= 0 ? "▲" : "▼"} {it.delta}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
