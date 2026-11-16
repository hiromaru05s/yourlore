import '../styles/loreCursor.css';

import {clickLifetime, clickSurface, paintClick} from './clickBurst';

export function installLoreCursor(): () => void {
  const root = document.documentElement;
  const dial = document.createElement('div');
  dial.className = 'lore-cursor-dial';
  dial.setAttribute('aria-hidden', 'true');
  document.body.append(dial);
  let lastDialog: Element | null = null;
  const fine = matchMedia('(any-pointer: fine)');
  const events = new AbortController();
  const bursts = new Map<HTMLCanvasElement, {start: number; reduced: boolean; ctx: CanvasRenderingContext2D}>();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const draw = (now: number) => {
    frame = 0;
    for (const [canvas, burst] of bursts) {
      const duration = burst.reduced ? 125 : clickLifetime;
      const t = Math.max(0, (now - burst.start) / duration);
      if (t >= 1) {
        canvas.remove(); bursts.delete(canvas);
      } else paintClick(burst.ctx, t, burst.reduced);
    }
    if (bursts.size) frame = requestAnimationFrame(draw);
  };
  const fire = (x: number, y: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.className = 'lore-cursor-burst';
    canvas.dataset.clickStyle = 'flare';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = canvas.height = Math.ceil(clickSurface * Math.min(3, devicePixelRatio || 1));
    canvas.style.width = canvas.style.height = clickSurface + 'px';
    canvas.style.left = (x - clickSurface / 2) + 'px';
    canvas.style.top = (y - clickSurface / 2) + 'px';
    if (typeof canvas.showPopover === 'function') canvas.popover = 'manual';
    document.body.append(canvas);
    if (canvas.popover === 'manual') canvas.showPopover();
    const start = performance.now(), reduced = reducedMotion.matches;
    bursts.set(canvas, {start, reduced, ctx});
    paintClick(ctx, 0, reduced);
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const options = {capture: true, passive: true, signal: events.signal};
  const hide = () => { delete root.dataset.loreMouse; };
  const locate = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !fine.matches) { hide(); return; }
    dial.style.transform = `translate3d(${event.clientX - 18}px,${event.clientY - 18}px,0)`;
    if (!root.hasAttribute('data-lore-mouse')) root.dataset.loreMouse = '';
    const dialog = (event.target as Element | null)?.closest?.('dialog:modal');
    if (dialog && dialog !== lastDialog && typeof dial.showPopover === 'function') {
      // Keep viewport coordinates even above transformed native dialogs.
      dial.popover = 'manual';
      if (dial.matches(':popover-open')) dial.hidePopover();
      dial.showPopover();
    }
    lastDialog = dialog ?? null;
  };

  window.addEventListener('pointermove', locate, options);
  window.addEventListener('pointerover', locate, options);
  window.addEventListener('pointerout', e => { if (!e.relatedTarget) hide(); }, options);
  window.addEventListener('blur', hide, options);
  document.addEventListener('visibilitychange', hide, options);
  fine.addEventListener('change', hide, options);
  window.addEventListener('pointerdown', event => {
    locate(event);
    if (event.pointerType !== 'mouse' || event.button !== 0 || !fine.matches) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(':disabled, [aria-disabled="true"], [data-block-reason]')) return;
    if (getComputedStyle(target).cursor === 'none') return;

    fire(event.clientX, event.clientY);
  }, options);
  return () => {
    events.abort(); hide(); dial.remove();
    cancelAnimationFrame(frame);
    for (const canvas of bursts.keys()) canvas.remove();
    bursts.clear();
  };
}
