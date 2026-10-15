// ============================================================
// LORE — pointer-tracked 3D card tilt + glare (desktop only).
// Sets CSS vars (--rx/--ry for rotation, --gx/--gy for the glare
// hotspot) on the hovered hand/market card; game.css applies them.
// One delegated listener pair — no per-card handlers.
// ============================================================

const SELECTOR = "#hand .card, .market-cards .card";
const MAX_RY = 14; // deg, left-right
const MAX_RX = 12; // deg, up-down

export function initCardTilt(): void {
  if (typeof matchMedia === "undefined" || !matchMedia("(pointer: fine)").matches) return;
  let live: HTMLElement | null = null;
  let frame=0,clientX=0,clientY=0;

  const clear = (): void => {
    cancelAnimationFrame(frame);frame=0;
    if (!live) return;
    live.classList.remove("tilt-live");
    for (const v of ["--rx", "--ry", "--gx", "--gy"]) live.style.removeProperty(v);
    live = null;
  };

  document.addEventListener("pointerover", (e) => {
    const card = (e.target as HTMLElement | null)?.closest?.(SELECTOR) as HTMLElement | null;
    if (card === live) return;
    clear();
    if (card) { live = card; card.classList.add("tilt-live"); }
  }, { passive: true });

  const paint = (): void => {
    frame=0;
    if (!live) return;
    if (!live.isConnected) { clear(); return; } // board re-rendered under the cursor
    const r = live.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    live.style.setProperty("--ry", ((px - 0.5) * MAX_RY).toFixed(2) + "deg");
    live.style.setProperty("--rx", ((0.5 - py) * MAX_RX).toFixed(2) + "deg");
    live.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
    live.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
  };
  document.addEventListener("pointermove", (e) => {
    if(!live)return;
    clientX=e.clientX;clientY=e.clientY;
    if(!frame)frame=requestAnimationFrame(paint);
  }, { passive: true });

  document.addEventListener("pointerdown", clear, { passive: true, capture: true });
}
