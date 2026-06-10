import { type FormEvent, useState } from "react";
import type { GenUIComponentProps } from "../../types/public";
import styles from "./components.module.css";

interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "date";
  options?: string[];
  placeholder?: string;
}

/**
 * Form. props: { fields: [{name,label,type,options?}], submitLabel? }.
 * On submit, emits an "submit" action with the collected values back to the agent.
 */
export function Form({ props, status, emitAction }: GenUIComponentProps) {
  const p = (props as { fields?: Field[]; submitLabel?: string } | null) ?? {};
  const fields = p.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const submitted = status === "done";

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    emitAction("submit", values);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {fields.map((f) => (
        <label className={styles.field} key={f.name}>
          <span className={styles.fieldLabel}>{f.label}</span>
          {f.type === "select" ? (
            <select className={styles.input} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}>
              <option value="" disabled>
                Select…
              </option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={styles.input}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
        </label>
      ))}
      <button className={styles.submit} type="submit" disabled={submitted}>
        {submitted ? "Submitted" : (p.submitLabel ?? "Submit")}
      </button>
    </form>
  );
}
