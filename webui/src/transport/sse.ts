import type { AGUIEvent } from "../types/agui";

/**
 * Parse an AG-UI SSE stream into events. Frames are separated by a blank line;
 * `data:` lines within a frame are concatenated and JSON-parsed. Malformed
 * frames are skipped. (EventSource can't POST, so the caller uses fetch +
 * ReadableStream and hands us the reader.)
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<AGUIEvent> {
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data) continue;
      try {
        yield JSON.parse(data) as AGUIEvent;
      } catch {
        /* skip malformed frame */
      }
    }
  }
}
