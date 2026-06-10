import { useAgentRun } from "../../transport/useAgentRun";
import styles from "./chat.module.css";
import { SCENES } from "./scenes";

/** Empty-state greeting with a gallery of one-tap scene demos. */
export function Welcome() {
  const { send } = useAgentRun();
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeMark} aria-hidden="true" />
      <h2 className={styles.welcomeTitle}>How can I help?</h2>
      <p className={styles.welcomeSub}>
        I explain things visually — pick a demo and watch it build, or just ask your own question.
      </p>
      <div className={styles.gallery}>
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={styles.sceneCard}
            title={scene.prompt}
            onClick={() => void send(scene.prompt)}
          >
            <span className={styles.sceneIcon} aria-hidden="true">
              {scene.icon}
            </span>
            <span className={styles.sceneTitle}>{scene.title}</span>
            <span className={styles.sceneBlurb}>{scene.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
