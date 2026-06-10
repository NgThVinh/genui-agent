import { type KeyboardEvent, useRef, useState } from "react";
import { useGenUI } from "../../hooks/useGenUI";
import { useAgentRun } from "../../transport/useAgentRun";
import styles from "./chat.module.css";

export function Composer() {
  const { send } = useAgentRun();
  const streaming = useGenUI((s) => s.status === "streaming");
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const value = text;
    setText("");
    requestAnimationFrame(grow);
    void send(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.box}>
        <textarea
          ref={taRef}
          className={styles.textarea}
          rows={1}
          placeholder="Ask the assistant…"
          value={text}
          disabled={streaming}
          onChange={(e) => {
            setText(e.target.value);
            grow();
          }}
          onKeyDown={onKeyDown}
        />
        <button
          className={styles.send}
          title="Send (Enter)"
          aria-label="Send"
          disabled={streaming || !text.trim()}
          onClick={submit}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
