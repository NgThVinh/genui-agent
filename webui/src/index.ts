// Public API barrel for @genui/react.
import "./theme/tokens.css";

// Provider + hooks
export { GenUIProvider, type GenUIProviderProps } from "./provider/GenUIProvider";
export { useGenUI } from "./hooks/useGenUI";
export { useGenUIActions } from "./hooks/useGenUIActions";
export { useAgentRun } from "./transport/useAgentRun";

// Surface components
export { GenUIChat } from "./components/chat/GenUIChat";
export { GenUICanvas } from "./components/surfaces/GenUICanvas";

// Store types (for advanced selectors)
export type { GenUIState, Turn, TurnItem, RunStatus } from "./store/createStore";

// Protocol + public types
export type { Surface, ComponentStatus, ComponentSize, GenuiDirective, GenuiOp } from "./types/genui";
export type { AppStateSnapshot, UIComponentDescriptor } from "./types/state";
export type { AGUIEvent, ChatMessage, RunAgentInput } from "./types/agui";
export type { GenUITheme, GenUIAction, ChatLayout, CardInstance } from "./types/public";

export const version = "0.1.0";
