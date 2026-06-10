import { useGenUI } from "../../hooks/useGenUI";
import { useGenUIContext } from "../../provider/context";
import { CardChrome } from "../cards/CardChrome";
import styles from "./GenUIDock.module.css";

/**
 * The pinned, singleton reference card. Rendered inside <GenUIChat> by default;
 * also exported as <GenUIDock> for hosts that want to place it elsewhere. Renders
 * nothing (takes no space) when no dock card is mounted.
 */
export function DockPanel() {
  const { store } = useGenUIContext();
  const dockId = useGenUI((s) => s.dockId);
  const collapsed = useGenUI((s) => s.dockCollapsed);
  const inst = useGenUI((s) => (dockId ? s.registry[dockId] : undefined));

  if (!dockId || !inst) return null;

  return (
    <section className={styles.dock} data-collapsed={collapsed}>
      <div className={styles.head}>
        <span className={styles.dotBadge} data-status={inst.status} />
        <span className={styles.label}>Dock</span>
        <span className={styles.title}>{inst.title}</span>
        <button
          className={styles.btn}
          title={collapsed ? "Expand" : "Collapse"}
          onClick={() => store.getState().toggleDockCollapsed()}
        >
          {collapsed ? "▴" : "▾"}
        </button>
        <button className={styles.btn} title="Close" onClick={() => store.getState().dismissCard(dockId)}>
          ×
        </button>
      </div>
      {!collapsed ? (
        <div className={styles.body}>
          <CardChrome inst={inst} />
        </div>
      ) : null}
    </section>
  );
}

/** Public alias for host-placed usage. */
export const GenUIDock = DockPanel;
