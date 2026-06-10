// AG-UI SSE events (loose shape — parsed from JSON) and the run input we POST.
import type { GenuiDirective } from "./genui";
import type { AppStateSnapshot } from "./state";

export interface AGUIEvent {
  type: string;
  name?: string;
  value?: GenuiDirective;
  delta?: string;
  messageId?: string;
  toolCallName?: string;
  snapshot?: AppStateSnapshot;
  message?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentInput {
  threadId: string;
  runId: string;
  state: AppStateSnapshot;
  messages: ChatMessage[];
  tools: unknown[];
  context: unknown[];
  forwardedProps: Record<string, unknown>;
}
