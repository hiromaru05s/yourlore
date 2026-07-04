// ============================================================
// LORE — typed WebSocket wrapper. JSON in/out, simple lifecycle.
// In dev, Vite proxies /ws/* to the local wrangler dev server.
// ============================================================
export interface SockHandlers<TIn> {
  onMessage?(msg: TIn): void;
  onOpen?(): void;
  onClose?(): void;
  onError?(): void;
}

export class Sock<TIn = unknown, TOut = unknown> {
  private ws: WebSocket;
  handlers: SockHandlers<TIn>;

  constructor(path: string, handlers: SockHandlers<TIn> = {}) {
    this.handlers = handlers;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${proto}://${location.host}${path}`);
    this.ws.onopen = () => this.handlers.onOpen?.();
    this.ws.onclose = () => this.handlers.onClose?.();
    this.ws.onerror = () => this.handlers.onError?.();
    this.ws.onmessage = (e) => {
      try { this.handlers.onMessage?.(JSON.parse(e.data) as TIn); } catch { /* ignore malformed */ }
    };
  }

  send(msg: TOut): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  close(): void { try { this.ws.close(); } catch { /* noop */ } }
}
