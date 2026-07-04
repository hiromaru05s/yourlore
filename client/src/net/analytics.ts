// ============================================================
// LORE — analytics facade over PostHog.
// Dormant unless POSTHOG_KEY is set: init() no-ops, and every
// capture/identify becomes a safe no-op, so the rest of the app
// can call these unconditionally.
// PostHog handles acquisition, retention, funnels and UTM source
// attribution out of the box; we only add a few game events.
// ============================================================
import { POSTHOG_KEY, POSTHOG_HOST } from "../config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PH = { capture: (e: string, p?: Record<string, unknown>) => void; identify: (id: string, p?: Record<string, unknown>) => void; reset: () => void };
let ph: PH | null = null;

/** Inject the PostHog snippet once, if configured. Called at boot. */
export function initAnalytics(): void {
  if (!POSTHOG_KEY || ph) return;
  // official PostHog loader snippet (minified), then init
  (function (t: any, e: any) {
    let p: any, o: any;
    t.posthog = e; e._i = []; e.init = function (k: string, cfg: any) {
      function g(obj: any, m: string) { obj[m] = function () { obj.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; }
      p = t.createElement("script"); p.type = "text/javascript"; p.async = true;
      p.src = (cfg.api_host || POSTHOG_HOST) + "/static/array.js";
      o = t.getElementsByTagName("script")[0]; o.parentNode.insertBefore(p, o);
      const methods = "capture identify reset register people.set onFeatureFlags".split(" ");
      for (let i = 0; i < methods.length; i++) g(e, methods[i]);
      e._i.push([k, cfg]);
    };
  })(document, (window as any).posthog || []);
  (window as any).posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: true, persistence: "localStorage+cookie" });
  ph = (window as any).posthog as PH;
}

export function aCapture(event: string, props?: Record<string, unknown>): void {
  try { ph?.capture(event, props); } catch { /* ignore */ }
}
export function aIdentify(userId: string, props?: Record<string, unknown>): void {
  try { ph?.identify(userId, props); } catch { /* ignore */ }
}
export function aReset(): void {
  try { ph?.reset(); } catch { /* ignore */ }
}
