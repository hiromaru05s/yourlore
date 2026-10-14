import { FRAME_BACK } from "../../shared/cards";
import { captureCardSurface, CARD_PADDING } from "../cardSurface";
import { projectedPlacement } from "../boardProjection";
import { TorsionRenderer, type Pose, type Scene } from "./renderer";
import { COST, IMPACT, END } from "./timing";

type Options = {
  source: HTMLElement;
  targets: HTMLElement[];
  side: "me" | "opp";
  exiled: Set<string>;
  from: DOMRect;
  signal: AbortSignal;
  onCost: () => void;
  onImpact: () => void;
};
const jobs = new Set<() => void>();
export function cancelMassacres() {
  for (const cancel of [...jobs]) cancel();
}
function pose(node: HTMLElement, id: string): Pose {
  const m = projectedPlacement(node, 100, 100),
    p = (x: number, y: number) => {
      const q = m.transformPoint(new DOMPoint(x, y));
      return { x: q.x / q.w, y: q.y / q.w };
    };
  const a = p(0, 0),
    b = p(100, 0),
    c = p(0, 100);
  return {
    x: (b.x + c.x) / 2,
    y: (b.y + c.y) / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y),
    h: Math.hypot(c.x - a.x, c.y - a.y),
    id,
  };
}
async function face(node: HTMLElement, source: boolean, host: HTMLElement) {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.removeAttribute("data-uid");
  copy.classList.remove(
    "is-played",
    "fx-field-ghost",
    "fx-card-flight",
    "cast-reveal",
  );
  copy.style.cssText =
    "position:relative;width:180px;height:280px;--cw:180px;--ch:280px;transform:none;opacity:1;visibility:visible";
  host.append(copy);
  try {
    await Promise.all(
      [...copy.querySelectorAll("img")].map((img) =>
        img.decode().catch(() => {}),
      ),
    );
    const surface = await captureCardSurface(copy, FRAME_BACK, true, false);
    if (!surface.face) throw Error("Massacre surface unavailable");
    const out = document.createElement("canvas"),
      pad = (surface.face.width * CARD_PADDING) / (1 + 2 * CARD_PADDING);
    out.width = source ? 520 : 420;
    out.height = source
      ? Math.round((520 * surface.face.height) / surface.face.width)
      : Math.round((420 * 280) / 180);
    const c = out.getContext("2d")!;
    if (source) c.drawImage(surface.face, 0, 0, out.width, out.height);
    else
      c.drawImage(
        surface.face,
        pad,
        pad,
        surface.face.width - 2 * pad,
        surface.face.height - 2 * pad,
        0,
        0,
        out.width,
        out.height,
      );
    return out;
  } finally {
    copy.remove();
  }
}
/** One effect owns the public source, resource sacrifice and all direct victims. */
export function playMassacre(o: Options): Promise<boolean> {
  if (o.signal.aborted || document.hidden || !o.targets.length)
    return Promise.resolve(false);
  return new Promise((resolve) => {
    const saved = o.targets.map((n) => n.style.visibility);
    let frame = 0,
      done = false,
      started = false,
      cost = false,
      impact = false,
      renderer: TorsionRenderer | undefined;
    const host = document.createElement("div");
    host.className = "game massacre-capture";
    host.style.cssText =
      "position:fixed;left:-4000px;top:0;width:180px;pointer-events:none";
    document.body.append(host);
    const canvas = document.createElement("canvas");
    canvas.className = "massacre-torsion-fx";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:190";
    const finish = (complete = started) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      canvas.remove();
      host.remove();
      renderer?.dispose();
      o.signal.removeEventListener("abort", abort);
      jobs.delete(abort);
      if (complete) {
        if (!cost) o.onCost();
        o.targets.forEach((n) => n.remove());
      } else o.targets.forEach((n, i) => (n.style.visibility = saved[i]));
      resolve(complete);
    };
    const abort = () => finish();
    let timeout = setTimeout(abort, 18000);
    jobs.add(abort);
    o.signal.addEventListener("abort", abort, { once: true });
    const invalid = () =>
      done ||
      o.signal.aborted ||
      document.hidden ||
      o.targets.some((n) => !n.isConnected);
    void (async () => {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const captures = await Promise.all([
        face(o.source, true, host),
        ...o.targets.map((n) => face(n, false, host)),
      ]);
      const faces = new Map<string, HTMLCanvasElement>([
        ["MASSACRE", captures[0]],
        ...captures
          .slice(1)
          .map((c, i) => [`target-${i}`, c] as [string, HTMLCanvasElement]),
      ]);
      if (invalid()) {
        finish();
        return;
      }
      const center = (selector: string) => {
        const r = document.querySelector(selector)?.getBoundingClientRect();
        return {
          x: r ? r.x + r.width / 2 : innerWidth * 0.15,
          y: r ? r.y + r.height / 2 : innerHeight * 0.7,
        };
      };
      const w = Math.min(90, innerWidth * 0.17),
        scene: Scene = {
          width: innerWidth,
          height: innerHeight,
          source: {
            x: o.from.x + o.from.width / 2,
            y: o.from.y + o.from.height / 2,
            w,
            h: w * 1.55,
            id: "MASSACRE",
          },
          targets: o.targets.map((n, i) => ({
            ...pose(n, `target-${i}`),
            destination: center(
              o.exiled.has(n.dataset.uid ?? "")
                ? `#rift-${o.side === "me" ? "opp" : "me"}`
                : `#pile-${o.side === "me" ? "opp" : "my"}Disc`,
            ),
          })),
          mana: center(`#portrait${o.side === "me" ? "Me" : "Opp"} .pt-mana`),
          grave: center(`#pile-${o.side === "me" ? "opp" : "my"}Disc`),
          ownGrave: center(`#pile-${o.side === "me" ? "my" : "opp"}Disc`),
        };
      renderer = new TorsionRenderer();
      const config = {
        variant: 2,
        ms: 1400,
        count: o.targets.length,
        side: o.side === "me" ? 0 : 1,
        dark: false,
        reduced,
      };
      // Compile the selected surface and band shaders before hiding the live cards.
      renderer.render(
        faces,
        config,
        Math.round(innerWidth),
        Math.round(innerHeight),
        scene,
      );
      renderer.render(
        faces,
        { ...config, ms: 0 },
        Math.round(innerWidth),
        Math.round(innerHeight),
        scene,
      );
      if (invalid()) {
        finish();
        return;
      }
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      const c = canvas.getContext("2d");
      if (!c) {
        finish(false);
        return;
      }
      document.body.append(canvas);
      o.targets.forEach((n) => (n.style.visibility = "hidden"));
      started = true;
      clearTimeout(timeout);
      timeout = setTimeout(abort, END + 2000);
      const start = performance.now(),
        end = reduced ? 1150 : END,
        hit = reduced ? 850 : IMPACT;
      const tick = (now: number) => {
        if (invalid()) {
          finish();
          return;
        }
        const ms = Math.max(0, now - start);
        canvas.dataset.time = String(Math.round(ms));
        if (ms >= COST && !cost) {
          cost = true;
          o.onCost();
        }
        if (ms >= hit && !impact) {
          impact = true;
          o.onImpact();
        }
        if (ms >= end) {
          finish(true);
          return;
        }
        try {
          renderer!.render(
            faces,
            { ...config, ms },
            canvas.width,
            canvas.height,
            scene,
          );
          c.clearRect(0, 0, canvas.width, canvas.height);
          c.drawImage(renderer!.renderer.domElement, 0, 0);
        } catch {
          finish();
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      tick(start);
    })().catch((error) => {
      console.warn("[massacre] presentation fallback", error);
      finish(false);
    });
  });
}
window.addEventListener("resize", cancelMassacres);
window.addEventListener("pagehide", cancelMassacres);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelMassacres();
});
