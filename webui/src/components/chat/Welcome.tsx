import { useAgentRun } from "../../transport/useAgentRun";
import styles from "./chat.module.css";

const SAMPLES = [
  "Explain how RAG works with a quick inline diagram",
  "Compare 3 vector databases — a card each on the canvas",
  "Pin a live latency monitor to the dock and stream it",
  "Lay out a system design: API, workers, queue, and DB",
];

/** Empty-state greeting with one-tap sample prompts. */
export function Welcome() {
  const { send } = useAgentRun();
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeMark} aria-hidden="true" />
      <h2 className={styles.welcomeTitle}>How can I help?</h2>
      <p className={styles.welcomeSub}>
        Ask anything. I can explain visually — a quick inline card, a pinned reference, or a canvas of
        comparisons.
      </p>
      <div className={styles.samples}>
        {SAMPLES.map((s) => (
          <button key={s} type="button" className={styles.sample} onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
