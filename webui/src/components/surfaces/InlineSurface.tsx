import type { CardInstance } from "../../types/public";
import { CardChrome } from "../cards/CardChrome";
import styles from "./InlineSurface.module.css";

/** A card mounted as a block inside the assistant message stream. */
export function InlineSurface({ inst }: { inst: CardInstance }) {
  return (
    <div className={styles.wrap}>
      <CardChrome inst={inst} tag="inline" />
    </div>
  );
}
