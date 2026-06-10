import { useMemo, useState } from "react";
import type { GenUIComponentProps } from "../../types/public";
import styles from "./components.module.css";

interface Column {
  key: string;
  label: string;
}
type Row = Record<string, unknown>;

/** Sortable table. props: { columns: [{key,label}], rows: [{...}] } */
export function Table({ props }: GenUIComponentProps) {
  const p = (props as { columns?: Column[]; rows?: Row[] } | null) ?? {};
  const columns = p.columns ?? [];
  const rows = p.rows ?? [];
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <div className={styles.pad}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} onClick={() => toggle(c.key)}>
                {c.label}
                {sort?.key === c.key ? <span className={styles.sortCaret}>{sort.dir === 1 ? "▲" : "▼"}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>{String(r[c.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
