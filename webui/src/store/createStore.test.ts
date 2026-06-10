import { describe, expect, it } from "vitest";
import { CardHostRegistry } from "../bridge/hostRegistry";
import type { GenuiDirective } from "../types/genui";
import { createGenUIStore, type GenUIStore } from "./createStore";

const mk = (): GenUIStore => createGenUIStore(new CardHostRegistry(), "t");
const render = (over: Partial<GenuiDirective>): GenuiDirective => ({ v: 1, op: "render", ...over });

describe("applyDirective render", () => {
  it("mounts an inline card into the current assistant turn", () => {
    const s = mk();
    s.getState().startAssistantTurn();
    s.getState().appendAssistantText("hello");
    s.getState().applyDirective(render({ id: "note", surface: "inline", html: "<p>x</p>", title: "Note" }));

    const st = s.getState();
    expect(st.registry.note.surface).toBe("inline");
    const turn = st.turns.at(-1)!;
    expect(turn.items.map((i) => i.kind)).toEqual(["text", "card"]);
  });

  it("activates the canvas overlay for canvas cards", () => {
    const s = mk();
    s.getState().applyDirective(render({ id: "c1", surface: "canvas", html: "<p>1</p>" }));
    expect(s.getState().canvasIds).toEqual(["c1"]);
    expect(s.getState().canvasOverlayActive).toBe(true);
  });

  it("treats dock as a singleton (new dock replaces old)", () => {
    const s = mk();
    s.getState().applyDirective(render({ id: "d1", surface: "dock", html: "<p>1</p>" }));
    s.getState().applyDirective(render({ id: "d2", surface: "dock", html: "<p>2</p>" }));
    expect(s.getState().dockId).toBe("d2");
    expect(s.getState().registry.d1).toBeUndefined();
    expect(s.getState().registry.d2).toBeDefined();
  });

  it("updates in place by id and keeps surface immutable", () => {
    const s = mk();
    s.getState().applyDirective(render({ id: "c", surface: "canvas", html: "<p>1</p>", status: "active" }));
    s.getState().applyDirective(render({ id: "c", surface: "inline", status: "done", title: "T2" }));
    const inst = s.getState().registry.c;
    expect(inst.surface).toBe("canvas"); // immutable
    expect(inst.status).toBe("done");
    expect(inst.title).toBe("T2");
    expect(inst.html).toBe("<p>1</p>"); // html omitted on update → unchanged
    expect(s.getState().canvasIds).toEqual(["c"]); // not duplicated
  });
});

describe("assistant turn interleaving", () => {
  it("seals the text bubble when a card is inserted, then starts a new bubble", () => {
    const s = mk();
    s.getState().startAssistantTurn();
    s.getState().appendAssistantText("a");
    s.getState().applyDirective(render({ id: "k", surface: "inline", html: "<p/>" }));
    s.getState().appendAssistantText("b");
    const items = s.getState().turns.at(-1)!.items;
    expect(items.map((i) => i.kind)).toEqual(["text", "card", "text"]);
    expect(items[0]).toMatchObject({ text: "a" });
    expect(items[2]).toMatchObject({ text: "b" });
  });
});

describe("retireInline", () => {
  it("freezes inline cards into their turn item and drops them from the registry", () => {
    const s = mk();
    s.getState().startAssistantTurn();
    s.getState().applyDirective(render({ id: "n", surface: "inline", html: "<p>x</p>", title: "N" }));
    s.getState().retireInline();
    const st = s.getState();
    expect(st.registry.n).toBeUndefined(); // gone from live registry
    const item = st.turns.at(-1)!.items.find((i) => i.kind === "card");
    expect(item).toMatchObject({ kind: "card", cardId: "n", frozen: { html: "<p>x</p>", title: "N" } });
  });
});

describe("reconcile", () => {
  it("syncs title/status and removes server-absent non-inline cards", () => {
    const s = mk();
    s.getState().applyDirective(render({ id: "keep", surface: "canvas", html: "<p/>", status: "active" }));
    s.getState().applyDirective(render({ id: "gone", surface: "dock", html: "<p/>" }));
    s.getState().reconcile({ ui: { components: [{ id: "keep", surface: "canvas", title: "K!", status: "done", turn: 0 }] }, turn: 1 });
    const st = s.getState();
    expect(st.registry.gone).toBeUndefined();
    expect(st.registry.keep.title).toBe("K!");
    expect(st.registry.keep.status).toBe("done");
  });
});

describe("buildState", () => {
  it("emits descriptor-only components (no html) plus the turn counter", () => {
    const s = mk();
    s.getState().addUserMessage("hi"); // userTurn → 1
    s.getState().applyDirective(render({ id: "c", surface: "canvas", html: "<p>big</p>", title: "C" }));
    const snap = s.getState().buildState();
    expect(snap.turn).toBe(1);
    expect(snap.ui.components).toEqual([{ id: "c", surface: "canvas", title: "C", status: "info", turn: 1 }]);
    expect(JSON.stringify(snap)).not.toContain("big");
  });
});

describe("dismiss", () => {
  it("removes by id, by surface, and all", () => {
    const s = mk();
    const seed = () => {
      s.getState().applyDirective(render({ id: "a", surface: "canvas", html: "<p/>" }));
      s.getState().applyDirective(render({ id: "b", surface: "canvas", html: "<p/>" }));
      s.getState().applyDirective(render({ id: "c", surface: "dock", html: "<p/>" }));
    };
    seed();
    s.getState().applyDirective({ v: 1, op: "dismiss", id: "a" });
    expect(Object.keys(s.getState().registry).sort()).toEqual(["b", "c"]);

    s.getState().applyDirective({ v: 1, op: "dismiss", surface: "canvas" });
    expect(Object.keys(s.getState().registry)).toEqual(["c"]);
    expect(s.getState().canvasIds).toEqual([]);
    expect(s.getState().canvasOverlayActive).toBe(false);

    s.getState().applyDirective({ v: 1, op: "dismiss" });
    expect(Object.keys(s.getState().registry)).toEqual([]);
    expect(s.getState().dockId).toBeNull();
  });
});
