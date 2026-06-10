import { type PointerEvent as ReactPointerEvent, type RefObject, useRef, useState } from "react";
import { useGenUI } from "../../hooks/useGenUI";
import { useGenUIContext } from "../../provider/context";
import type { ChatLayout } from "../../types/public";
import { GenUICanvas } from "../surfaces/GenUICanvas";
import chat from "./chat.module.css";
import { Composer } from "./Composer";
import { Launcher } from "./Launcher";
import { MessageList } from "./MessageList";
import { StatusBar } from "./StatusBar";

const MIN_CONVERSATION = 340;
const MIN_WORKSPACE = 300;
const DEFAULT_WORKSPACE = 460;

/**
 * The hero conversation UI. Fills its host container. When the agent puts cards
 * on the canvas, an attached, resizable **workspace pane** opens beside the
 * conversation (never an overlay) — the chat stays fully usable.
 */
export function GenUIChat({ layout = "sidebar" }: { layout?: ChatLayout }) {
  if (layout === "floating") return <FloatingChat />;
  return <ChatShell layout={layout} />;
}

function ChatShell({ layout, onClose }: { layout: ChatLayout; onClose?: () => void }) {
  const open = useGenUI((s) => s.workspaceOpen && s.workspaceIds.length > 0);
  const [wsWidth, setWsWidth] = useState(DEFAULT_WORKSPACE);
  const shellRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={shellRef} className={chat.shell} data-layout={layout} data-open={open}>
      <div className={chat.conversation}>
        <StatusBar onClose={onClose} />
        <MessageList />
        <Composer />
      </div>
      {open ? (
        <>
          <Divider shellRef={shellRef} setWidth={setWsWidth} />
          <WorkspacePane width={wsWidth} />
        </>
      ) : null}
    </div>
  );
}

function Divider({ shellRef, setWidth }: { shellRef: RefObject<HTMLDivElement | null>; setWidth: (w: number) => void }) {
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desired = rect.right - ev.clientX;
      const max = Math.max(MIN_WORKSPACE, rect.width - MIN_CONVERSATION);
      setWidth(Math.min(Math.max(desired, MIN_WORKSPACE), max));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return <div className={chat.divider} role="separator" aria-orientation="vertical" onPointerDown={onPointerDown} />;
}

function WorkspacePane({ width }: { width: number }) {
  const { store } = useGenUIContext();
  return (
    <section className={chat.workspacePane} style={{ flexBasis: width }}>
      <div className={chat.paneHead}>
        <span className={chat.paneTitle}>Workspace</span>
        <span className={chat.spacer} />
        <button
          className={chat.iconBtn}
          title="Close workspace"
          aria-label="Close workspace"
          onClick={() => store.getState().setWorkspaceOpen(false)}
        >
          ×
        </button>
      </div>
      <div className={chat.boardArea}>
        <GenUICanvas />
      </div>
    </section>
  );
}

function FloatingChat() {
  const [open, setOpen] = useState(false);
  const wide = useGenUI((s) => s.workspaceOpen && s.workspaceIds.length > 0);
  if (!open) return <Launcher onClick={() => setOpen(true)} />;
  return (
    <div className={chat.floatingPanel} data-wide={wide}>
      <ChatShell layout="floating" onClose={() => setOpen(false)} />
    </div>
  );
}
