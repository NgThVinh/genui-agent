import { describe, expect, it } from "vitest";
import type { AGUIEvent } from "../types/agui";
import { parseSSEStream } from "./sse";

function streamOf(...chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  }).getReader();
}

async function collect(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<AGUIEvent[]> {
  const out: AGUIEvent[] = [];
  for await (const ev of parseSSEStream(reader)) out.push(ev);
  return out;
}

describe("parseSSEStream", () => {
  it("parses data frames split across chunk boundaries", async () => {
    const events = await collect(
      streamOf(
        'data: {"type":"RUN_STAR',
        'TED"}\n\ndata: {"type":"TEXT_MESSAGE_CONTENT","del',
        'ta":"hi"}\n\n',
      ),
    );
    expect(events.map((e) => e.type)).toEqual(["RUN_STARTED", "TEXT_MESSAGE_CONTENT"]);
    expect(events[1].delta).toBe("hi");
  });

  it("joins multi-line data: fields and skips malformed frames", async () => {
    const events = await collect(
      streamOf('data: {"type":"CUSTOM",\ndata: "name":"genui"}\n\ndata: not-json\n\ndata: {"type":"RUN_FINISHED"}\n\n'),
    );
    expect(events.map((e) => e.type)).toEqual(["CUSTOM", "RUN_FINISHED"]);
    expect(events[0].name).toBe("genui");
  });
});
