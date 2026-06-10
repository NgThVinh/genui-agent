import { useState } from "react";
import type { ChatLayout } from "../../types/public";
import { CanvasOverlay } from "../surfaces/GenUICanvas";
import { DockPanel } from "../surfaces/GenUIDock";
import chat from "./chat.module.css";
import { Composer } from "./Composer";
import { Launcher } from "./Launcher";
import { MessageList } from "./MessageList";
import { StatusBar } from "./StatusBar";

/**
 * The hero conversation UI. Fills its host container. Includes the dock panel
 * and the (invisible-until-active) canvas overlay anchored to the chat region.
 */
export function GenUIChat({ layout = "sidebar" }: { layout?: ChatLayout }) {
  if (layout === "floating") return <FloatingChat />;
  return <ChatShell layout={layout} />;
}

function ChatShell({ layout, onClose }: { layout: ChatLayout; onClose?: () => void }) {
  return (
    <div className={chat.shell} data-layout={layout}>
      <StatusBar onClose={onClose} />
      <div className={chat.messagesWrap}>
        <MessageList />
        <CanvasOverlay />
      </div>
      <DockPanel />
      <Composer />
    </div>
  );
}

function FloatingChat() {
  const [open, setOpen] = useState(false);
  if (!open) return <Launcher onClick={() => setOpen(true)} />;
  return (
    <div className={chat.floatingPanel}>
      <ChatShell layout="floating" onClose={() => setOpen(false)} />
    </div>
  );
}
