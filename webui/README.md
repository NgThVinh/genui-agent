# @genui/react

Conversation-first Generative UI React SDK for the genui-agent backend.

The chat is the hero; Generative UI is a supporting layer. The agent drives three
surfaces over the AG-UI stream, which the SDK remaps to host-placed React components:

- **inline** — a card rendered as a block inside the assistant message stream.
- **dock** — a pinned, collapsible singleton reference card.
- **canvas** — a transparent, click-through overlay anchored over the chat that
  activates (pan/zoom board) only when canvas cards arrive.

## Install & use

```tsx
import { GenUIProvider, GenUIChat } from "@genui/react";
import "@genui/react/styles.css";

export function App() {
  return (
    <GenUIProvider baseUrl="https://your-agent-host" theme={{ accent: "#6c5ce7" }} onAction={(a) => console.log(a)}>
      {/* fills its container — host controls the box */}
      <aside style={{ width: 420, height: "100vh" }}>
        <GenUIChat layout="sidebar" /> {/* "sidebar" | "page" | "floating" */}
      </aside>
    </GenUIProvider>
  );
}
```

`<GenUIChat>` already includes the dock and the canvas overlay. For custom
layouts you can also place `<GenUIDock>` / `<GenUICanvas>` yourself, or build a
fully custom UI with the `useGenUI(selector)` and `useAgentRun()` hooks.

### Theming
Override any `--genui-*` token via the `theme` prop (e.g. `{ accent, font, radius }`)
or by targeting `.genui-root` in your CSS. The SDK ships no global reset, so it
won't collide with host styles. Agent HTML renders in sandboxed (`allow-scripts`,
no same-origin) iframes and is fully isolated.

## Backend contract (frozen)
- `POST /agent` — AG-UI SSE stream; `GET /config` — `{ model }`.
- `genui` CustomEvent directive: `{ v, op, id, surface, type:"html", title?, status?, html?, data?, size? }`.
- State channel: the SDK sends live component descriptors in `state` and reconciles `STATE_SNAPSHOT`.

## Develop

```bash
npm install
npm run dev          # playground on :5173 (proxies /agent,/config → :8000)
npm test             # vitest (store + transport)
npm run typecheck
npm run build        # library → dist/ (index.js, index.d.ts, genui.css)
npm run build:playground   # demo → dist-playground/ (served by the backend at /)
```

Run the backend separately: `cd ../agent && uv run dev` (or `uvicorn src.app:app --port 8000`).

## Layout

```
src/
  provider/   GenUIProvider + React context
  store/      Zustand store factory (registry, turns, surfaces, reconcile, buildState)
  transport/  SSE parser, useAgentRun, useConfig
  bridge/     CardHostRegistry + useGenuiBridge (height/data/action)
  components/  chat/*, host/ComponentHost, cards/CardChrome, surfaces/*
  theme/      --genui-* tokens + theme prop helper
playground/   local demo host page (not published)
```
