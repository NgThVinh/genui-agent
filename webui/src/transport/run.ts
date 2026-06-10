import { uid } from "../lib/ids";
import type { GenUIStore } from "../store/createStore";
import type { AGUIEvent, RunAgentInput } from "../types/agui";
import { parseSSEStream } from "./sse";

// Tool names that manifest as `genui` directives — they get no chat chip.
const UI_TOOLS = new Set(["render_card", "render_component", "push_data", "focus_card", "dismiss"]);

function dispatch(store: GenUIStore, ev: AGUIEvent): void {
  const s = store.getState();
  switch (ev.type) {
    case "TEXT_MESSAGE_START":
      s.startAssistantTurn();
      break;
    case "TEXT_MESSAGE_CONTENT":
    case "TEXT_MESSAGE_CHUNK":
      s.appendAssistantText(ev.delta ?? "");
      break;
    case "TOOL_CALL_START":
      if (ev.toolCallName && !UI_TOOLS.has(ev.toolCallName)) s.addToolChip(ev.toolCallName);
      break;
    case "CUSTOM":
      if (ev.name === "genui" && ev.value) s.applyDirective(ev.value);
      break;
    case "STATE_SNAPSHOT":
      s.reconcile(ev.snapshot);
      break;
    case "RUN_ERROR":
      s.setError(ev.message ?? "The agent reported an error.");
      break;
    default:
      break;
  }
}

/**
 * POST the current conversation to /agent and stream AG-UI events into the store.
 * The caller must have already staged the turn (addUserMessage / addActionMessage)
 * and called `beginRun()` so `buildState()` + `history` are current.
 */
export async function runAgent(store: GenUIStore, baseUrl: string): Promise<void> {
  const s = store.getState();
  const input: RunAgentInput = {
    threadId: s.threadId,
    runId: uid(),
    state: s.buildState(),
    messages: s.history,
    tools: [],
    context: [],
    forwardedProps: {},
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(input),
    });
  } catch {
    store.getState().setError("Couldn't reach the agent server. Is it running?");
    return;
  }
  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = " — " + (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    store.getState().setError(`Agent server returned ${res.status}${detail}`);
    return;
  }

  try {
    for await (const ev of parseSSEStream(res.body.getReader())) dispatch(store, ev);
  } catch {
    store.getState().setError("Lost connection to the event stream.");
    return;
  }

  store.getState().endRun();
}
