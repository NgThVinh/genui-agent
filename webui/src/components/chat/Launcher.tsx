import styles from "./chat.module.css";

export function Launcher({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.launcher} title="Open assistant" aria-label="Open assistant" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1 3.6-11.3 8.38 8.38 0 0 1 12.5 7.4z" />
      </svg>
    </button>
  );
}
