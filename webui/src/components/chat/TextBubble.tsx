import styles from "./chat.module.css";

const ROLE_CLASS = { user: styles.user, assistant: styles.assistant, error: styles.error } as const;

export function TextBubble({ role, text }: { role: "user" | "assistant" | "error"; text: string }) {
  return <div className={`${styles.bubble} ${ROLE_CLASS[role]}`}>{text}</div>;
}
