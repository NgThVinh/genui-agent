import styles from "./chat.module.css";

export function ToolChip({ name }: { name: string }) {
  return (
    <div className={styles.toolchip}>
      <span className={styles.gear}>⚙</span>
      <code>{name}</code>
    </div>
  );
}
