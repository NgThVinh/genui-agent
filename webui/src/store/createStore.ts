import { createStore } from "zustand/vanilla";
import type { CardHostRegistry } from "../bridge/hostRegistry";
import { uid } from "../lib/ids";
import type { ChatMessage } from "../types/agui";
import type { GenuiDirective, Surface } from "../types/genui";
import type { CardInstance } from "../types/public";
import type { AppStateSnapshot } from "../types/state";

export type RunStatus = "ready" | "streaming" | "error";

export type TurnItem =
  | { kind: "text"; id: string; text: string }
  | { kind: "tool"; id: string; name: string }
  | { kind: "card"; cardId: string; frozen?: CardInstance };

export interface Turn {
  id: string;
  role: "user" | "assistant" | "error";
  items: TurnItem[];
}

export interface GenUIState {
  threadId: string;
  userTurn: number;
  status: RunStatus;
  model: string;
  turns: Turn[];
  history: ChatMessage[];
  registry: Record<string, CardInstance>;
  workspaceIds: string[];
  workspaceOpen: boolean;
  focusRequest: { id: string; ts: number } | null;
  currentTurnId: string | null;

  // run lifecycle
  setModel: (model: string) => void;
  setStatus: (status: RunStatus) => void;
  beginRun: () => void;
  addUserMessage: (text: string) => void;
  startAssistantTurn: () => void;
  appendAssistantText: (delta: string) => void;
  addToolChip: (name: string) => void;
  setError: (message: string) => void;
  endRun: () => void;

  // genui + state channel
  applyDirective: (directive: GenuiDirective) => void;
  reconcile: (snapshot?: AppStateSnapshot) => void;
  retireInline: () => void;
  buildState: () => AppStateSnapshot;

  // surface controls (user-initiated)
  setWorkspaceOpen: (open: boolean) => void;
  dismissCard: (id: string) => void;
}

export type GenUIStore = ReturnType<typeof createGenUIStore>;

export function createGenUIStore(hostRegistry: CardHostRegistry, threadId: string = uid()) {
  return createStore<GenUIState>()((set, get) => {
    // --- internal helpers (operate on current state, return patches) ---

    const ensureAssistantTurn = (): { turns: Turn[]; currentTurnId: string } => {
      const { turns, currentTurnId } = get();
      if (currentTurnId) {
        const current = turns.find((t) => t.id === currentTurnId);
        if (current && current.role === "assistant") return { turns, currentTurnId };
      }
      const turn: Turn = { id: uid(), role: "assistant", items: [] };
      return { turns: [...turns, turn], currentTurnId: turn.id };
    };

    const dropFromSurfaces = (
      id: string,
      reg: Record<string, CardInstance>,
    ): Partial<GenUIState> => {
      const inst = reg[id];
      const next = { ...reg };
      delete next[id];
      hostRegistry.detach(id);
      const patch: Partial<GenUIState> = { registry: next };
      if (inst?.surface === "workspace") {
        const workspaceIds = get().workspaceIds.filter((c) => c !== id);
        patch.workspaceIds = workspaceIds;
        if (workspaceIds.length === 0) patch.workspaceOpen = false;
      }
      return patch;
    };

    const renderCard = (d: GenuiDirective): void => {
      const id = d.id;
      if (!id) return;
      const state = get();
      const existing = state.registry[id];

      if (existing) {
        const updated: CardInstance = { ...existing, turn: state.userTurn };
        if (d.title != null) updated.title = d.title;
        if (d.status != null) updated.status = d.status;
        if (d.html != null) updated.html = d.html;
        set({ registry: { ...state.registry, [id]: updated } });
        return;
      }

      const surface: Surface = d.surface ?? "workspace";
      const inst: CardInstance = {
        id,
        surface,
        title: d.title ?? id,
        status: d.status ?? "info",
        turn: state.userTurn,
        html: d.html ?? "",
      };
      const registry = { ...state.registry, [id]: inst };

      if (surface === "inline") {
        const { turns, currentTurnId } = ensureAssistantTurn();
        const turn = turns.find((t) => t.id === currentTurnId)!;
        const newTurns = turns.map((t) =>
          t.id === currentTurnId ? { ...turn, items: [...turn.items, { kind: "card" as const, cardId: id }] } : t,
        );
        set({ registry, turns: newTurns, currentTurnId });
      } else {
        set({ registry, workspaceIds: [...state.workspaceIds, id], workspaceOpen: true });
      }
    };

    const dismiss = (d: GenuiDirective): void => {
      const state = get();
      if (d.id) {
        set(dropFromSurfaces(d.id, state.registry));
        return;
      }
      if (d.surface) {
        let reg = state.registry;
        let patch: Partial<GenUIState> = {};
        for (const inst of Object.values(state.registry)) {
          if (inst.surface === d.surface) {
            const p = dropFromSurfaces(inst.id, reg);
            reg = p.registry ?? reg;
            patch = { ...patch, ...p, registry: reg };
          }
        }
        set(patch);
        return;
      }
      // clear everything
      for (const id of Object.keys(state.registry)) hostRegistry.detach(id);
      set({ registry: {}, workspaceIds: [], workspaceOpen: false });
    };

    return {
      threadId,
      userTurn: 0,
      status: "ready",
      model: "",
      turns: [],
      history: [],
      registry: {},
      workspaceIds: [],
      workspaceOpen: false,
      focusRequest: null,
      currentTurnId: null,

      setModel: (model) => set({ model }),
      setStatus: (status) => set({ status }),

      beginRun: () => set({ currentTurnId: null, status: "streaming" }),

      addUserMessage: (text) => {
        const turn: Turn = { id: uid(), role: "user", items: [{ kind: "text", id: uid(), text }] };
        set((s) => ({
          turns: [...s.turns, turn],
          history: [...s.history, { id: uid(), role: "user", content: text }],
          userTurn: s.userTurn + 1,
        }));
      },

      startAssistantTurn: () => {
        const turn: Turn = { id: uid(), role: "assistant", items: [] };
        set((s) => ({ turns: [...s.turns, turn], currentTurnId: turn.id }));
      },

      appendAssistantText: (delta) => {
        if (!delta) return;
        const { turns, currentTurnId } = ensureAssistantTurn();
        const turn = turns.find((t) => t.id === currentTurnId)!;
        const last = turn.items[turn.items.length - 1];
        let items: TurnItem[];
        if (last && last.kind === "text") {
          items = turn.items.map((it, i) =>
            i === turn.items.length - 1 && it.kind === "text" ? { ...it, text: it.text + delta } : it,
          );
        } else {
          // first text, or the previous item was a card (the "sealed" rule)
          items = [...turn.items, { kind: "text", id: uid(), text: delta }];
        }
        set({ turns: turns.map((t) => (t.id === currentTurnId ? { ...turn, items } : t)), currentTurnId });
      },

      addToolChip: (name) => {
        const { turns, currentTurnId } = ensureAssistantTurn();
        const turn = turns.find((t) => t.id === currentTurnId)!;
        const items: TurnItem[] = [...turn.items, { kind: "tool", id: uid(), name }];
        set({ turns: turns.map((t) => (t.id === currentTurnId ? { ...turn, items } : t)), currentTurnId });
      },

      setError: (message) => {
        const turn: Turn = { id: uid(), role: "error", items: [{ kind: "text", id: uid(), text: message }] };
        set((s) => ({ turns: [...s.turns, turn], status: "error", currentTurnId: null }));
      },

      endRun: () => {
        get().retireInline();
        // persist assistant text for conversation continuity
        const { turns, currentTurnId } = get();
        const turn = currentTurnId ? turns.find((t) => t.id === currentTurnId) : undefined;
        if (turn) {
          const text = turn.items
            .filter((it): it is Extract<TurnItem, { kind: "text" }> => it.kind === "text")
            .map((it) => it.text)
            .filter(Boolean)
            .join("\n\n");
          if (text.trim()) {
            set((s) => ({ history: [...s.history, { id: uid(), role: "assistant", content: text }] }));
          }
        }
        if (get().status !== "error") set({ status: "ready" });
      },

      applyDirective: (d) => {
        switch (d.op) {
          case "render":
            renderCard(d);
            break;
          case "data":
            if (d.id) hostRegistry.push(d.id, d.data);
            break;
          case "focus":
            if (d.id) set({ focusRequest: { id: d.id, ts: Date.now() } });
            break;
          case "dismiss":
            dismiss(d);
            break;
        }
      },

      reconcile: (snapshot) => {
        const comps = snapshot?.ui?.components ?? [];
        const byId = new Map(comps.map((c) => [c.id, c]));
        const state = get();
        let reg = { ...state.registry };
        let changed = false;
        for (const inst of Object.values(state.registry)) {
          if (inst.surface === "inline") continue;
          const c = byId.get(inst.id);
          if (!c) {
            set(dropFromSurfaces(inst.id, reg));
            reg = get().registry;
            changed = false; // already set
            continue;
          }
          const nextTitle = c.title ?? inst.title;
          const nextStatus = c.status ?? inst.status;
          if (nextTitle !== inst.title || nextStatus !== inst.status) {
            reg[inst.id] = { ...inst, title: nextTitle, status: nextStatus };
            changed = true;
          }
        }
        if (changed) set({ registry: reg });
      },

      retireInline: () => {
        const state = get();
        const inlineIds = Object.values(state.registry)
          .filter((s) => s.surface === "inline")
          .map((s) => s.id);
        if (inlineIds.length === 0) return;
        const idset = new Set(inlineIds);
        const turns = state.turns.map((t) => ({
          ...t,
          items: t.items.map((it) =>
            it.kind === "card" && idset.has(it.cardId) && !it.frozen
              ? { ...it, frozen: state.registry[it.cardId] }
              : it,
          ),
        }));
        const registry = { ...state.registry };
        for (const id of inlineIds) {
          delete registry[id];
          hostRegistry.detach(id);
        }
        set({ turns, registry });
      },

      buildState: () => {
        const { registry, userTurn } = get();
        return {
          ui: {
            components: Object.values(registry).map(({ id, surface, title, status, turn }) => ({
              id,
              surface,
              title,
              status,
              turn,
            })),
          },
          turn: userTurn,
        };
      },

      setWorkspaceOpen: (workspaceOpen) => set({ workspaceOpen }),
      dismissCard: (id) => set(dropFromSurfaces(id, get().registry)),
    };
  });
}
