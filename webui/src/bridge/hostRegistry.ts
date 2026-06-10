import { clamp } from "../lib/ids";

interface HostEntry {
  iframe: HTMLIFrameElement | null;
  ready: boolean;
  queue: unknown[];
  onHeight?: (px: number) => void;
}

/**
 * Per-provider registry of live card iframes, keyed by stable component id.
 * Owns the host↔card runtime bridge:
 *  - live `data` pushes are queued until the card iframe has loaded (or even
 *    registered), then flushed — so no payload is lost between a `render` and an
 *    immediately following `data` directive.
 *  - height reports (from the AUTOHEIGHT script) and Phase-2 actions are matched
 *    back to a card by comparing the message `source` window.
 */
export class CardHostRegistry {
  private hosts = new Map<string, HostEntry>();

  private ensure(id: string): HostEntry {
    let entry = this.hosts.get(id);
    if (!entry) {
      entry = { iframe: null, ready: false, queue: [] };
      this.hosts.set(id, entry);
    }
    return entry;
  }

  /** Called by ComponentHost on mount; attaches the iframe element. */
  attach(id: string, iframe: HTMLIFrameElement, onHeight?: (px: number) => void): void {
    const entry = this.ensure(id);
    entry.iframe = iframe;
    entry.onHeight = onHeight;
  }

  detach(id: string): void {
    this.hosts.delete(id);
  }

  /** New HTML assigned: iframe will reload, so hold pushes until the next load. */
  markLoading(id: string): void {
    const entry = this.hosts.get(id);
    if (entry) entry.ready = false;
  }

  /** Card iframe finished loading: flush any queued data. */
  markReady(id: string): void {
    const entry = this.ensure(id);
    entry.ready = true;
    while (entry.queue.length) this.post(entry, entry.queue.shift());
  }

  /** Push a live `data` payload to a card (queues if not ready). */
  push(id: string, payload: unknown): void {
    const entry = this.ensure(id);
    if (entry.ready && entry.iframe) this.post(entry, payload);
    else entry.queue.push(payload);
  }

  /** Resolve which card a message came from, by its source window. */
  idByWindow(win: unknown): string | null {
    for (const [id, entry] of this.hosts) {
      if (entry.iframe && entry.iframe.contentWindow === win) return id;
    }
    return null;
  }

  applyHeight(id: string, value: number): void {
    const entry = this.hosts.get(id);
    if (entry?.onHeight) entry.onHeight(clamp(Number(value) || 140, 64, 1400));
  }

  private post(entry: HostEntry, payload: unknown): void {
    try {
      entry.iframe?.contentWindow?.postMessage({ source: "genui", type: "data", payload }, "*");
    } catch {
      /* cross-origin sandbox can throw on teardown; ignore */
    }
  }
}
