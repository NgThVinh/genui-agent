import type { Chart as ChartInstance } from "chart.js";
import { useEffect, useRef, useState } from "react";
import type { GenUIComponentProps } from "../../types/public";
import styles from "./components.module.css";

interface Series {
  name: string;
  data: number[];
}
interface ChartProps {
  kind?: "line" | "bar" | "area";
  labels?: (string | number)[];
  series?: Series[];
  height?: number;
}

const PALETTE = ["#5b58f0", "#34d0c4", "#ff6b5a", "#f5a623", "#9b59b6", "#2ecc71"];

/** Chart.js chart (lazy-loaded). props: { kind, labels, series:[{name,data}], height? } */
export function Chart({ props, data }: GenUIComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const [ready, setReady] = useState(false);

  // Live `data` (push_data) merges over the initial props.
  const merged: ChartProps = { ...((props as ChartProps) ?? {}), ...((data as ChartProps) ?? {}) };
  const kind = merged.kind ?? "line";
  const height = merged.height ?? 240;
  const key = JSON.stringify(merged);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buildData = () => {
    const series = merged.series ?? [];
    return {
      labels: merged.labels ?? [],
      datasets: series.map((s, i) => ({
        label: s.name,
        data: s.data,
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length] + (kind === "bar" ? "cc" : "33"),
        fill: kind === "area",
        tension: 0.3,
      })),
    };
  };

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const { default: ChartJS } = await import("chart.js/auto");
      if (disposed || !canvasRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartRef.current = new ChartJS(canvasRef.current, {
        type: kind === "area" ? "line" : kind,
        data: buildData(),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: (merged.series ?? []).length > 1 } },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      setReady(true);
    })();
    return () => {
      disposed = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    c.data = buildData();
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className={styles.chartBox} style={{ height }}>
      {!ready ? <div className={styles.skeleton}>Loading chart…</div> : null}
      <canvas ref={canvasRef} style={{ display: ready ? "block" : "none" }} />
    </div>
  );
}
