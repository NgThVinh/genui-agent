import { GenUIChat, GenUIProvider, type GenUIAction } from "../src/index";

// Demo harness: the full-page conversation UI against the backend (proxied to :8000).
export function App() {
  const onAction = (a: GenUIAction) => console.log("[host] card action:", a);

  return (
    <GenUIProvider baseUrl="" onAction={onAction} theme={{ accent: "#6c5ce7" }}>
      <div style={{ height: "100vh", width: "100vw" }}>
        <GenUIChat layout="page" />
      </div>
    </GenUIProvider>
  );
}
