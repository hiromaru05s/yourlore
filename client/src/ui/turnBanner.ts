import {drawTurnSigil, TURN_BANNER_MS} from './turnSigil';
import {t} from '../i18n';

let active: (() => void) | undefined;
export function cancelTurnBanner(): void { active?.(); }

/** One owned clock; replacement, fast-forward and scene disposal all cancel it. */
export function mountTurnBanner(mine: boolean, turn?: number): void {
  cancelTurnBanner();
  if (document.hidden) return;
  const title = t(mine ? 'fx.yourturn' : 'fx.oppturn');
  const subtitle = (mine ? 'YOUR TURN' : 'OPPONENT’S TURN') +
    (turn == null ? '' : `  ·  ${String(turn).padStart(2, '0')}`);
  const host = document.createElement('div');
  host.className = 'fx-turn-sigil';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-label', `${title}${turn == null ? '' : ` TURN ${turn}`}`);
  host.style.cssText = 'position:fixed;inset:0;z-index:175;pointer-events:none';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.append(canvas);
  document.body.append(host);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const start = performance.now();
  let raf = 0;
  let disposed = false;
  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    clearTimeout(deadline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', cleanup);
    host.remove();
    canvas.width = canvas.height = 0;
    if (active === cleanup) active = undefined;
  };
  const onVisibility = (): void => { if (document.hidden) cleanup(); };
  const frame = (now: number): void => {
    if (disposed) return;
    if (!host.isConnected || now - start >= TURN_BANNER_MS) { cleanup(); return; }
    drawTurnSigil(canvas, mine ? 'me' : 'opp', now - start, {title, subtitle}, motion.matches);
    raf = requestAnimationFrame(frame);
  };
  // Also releases resources when rAF is throttled or the host is externally removed.
  const deadline = setTimeout(cleanup, TURN_BANNER_MS + 100);
  active = cleanup;
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', cleanup);
  raf = requestAnimationFrame(frame);
}
