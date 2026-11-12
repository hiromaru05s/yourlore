// Native, one-shot GIFs over the original poster. Each board owns only its
// opponent's three clips; a fresh object URL starts repeated hits at frame zero.
type Action = 'hurt' | 'mana' | 'heal';
const length: Record<Action, number> = {hurt: 820, mana: 1470, heal: 1350};
const mounted = new Map<HTMLElement, ReturnType<typeof create>>();
let reduced: MediaQueryList | undefined;
let skipped = false;

function create(ring: HTMLElement, poster: string) {
  const host = ring.querySelector<HTMLElement>('.avatar')!;
  const stem = poster.slice(poster.lastIndexOf('/') + 1, -5);
  const abort = new AbortController();
  const cache = new Map<Action, Promise<Blob>>();
  let request = 0, timer = 0, active: Action | undefined, pending: Action | undefined;
  let layer: HTMLImageElement | undefined, url: string | undefined;
  function read(action: Action) {
    let clip = cache.get(action);
    if (!clip) {
      clip = fetch('/art/npcs/reactions-v1/' + stem + '/' + action + '.gif', {signal: abort.signal})
        .then(r => { if (!r.ok) throw Error('Missing portrait reaction'); return r.blob(); })
        .catch(e => { cache.delete(action); throw e; });
      cache.set(action, clip);
    }
    return clip;
  }
  function stop() {
    request++; clearTimeout(timer); active = pending = undefined;
    layer?.remove(); layer = undefined;
    if (url) URL.revokeObjectURL(url);
    url = undefined;
  }
  function play(action: Action) {
    if (skipped || reduced?.matches || document.hidden || !ring.isConnected) return;
    if (active === 'hurt' && action !== 'hurt') { pending = action; return; }
    const serial = ++request;
    active = action;
    clearTimeout(timer);
    void read(action).then(blob => {
      if (serial !== request || !ring.isConnected) return;
      const next = new Image();
      next.alt = ''; next.setAttribute('aria-hidden', 'true'); next.dataset.npcReaction = action;
      next.style.pointerEvents = 'none';
      const old = layer, oldUrl = url;
      url = URL.createObjectURL(blob); layer = next;
      // The poster remains in place while the new image decodes.
      next.onload = () => {
        if (serial !== request || !ring.isConnected) return;
        host.append(next);
        next.animate([{opacity:0},{opacity:1}],{duration:65});
        timer = window.setTimeout(() => { const queued = pending; stop(); if (queued) play(queued); }, length[action]);
      };
      next.onerror = () => { if (serial === request) stop(); };
      next.src = url;
      old?.remove(); if (oldUrl) URL.revokeObjectURL(oldUrl);
    }).catch(() => { if (serial === request) stop(); });
  }
  if (!reduced?.matches && !document.hidden && !skipped)
    for (const action of ['hurt', 'mana', 'heal'] as const) void read(action).catch(() => {});
  return {play, stop, dispose() { stop(); abort.abort(); cache.clear(); }};
}
function reset() { for (const motion of mounted.values()) motion.stop(); }
export function mountNpcReaction(ring: HTMLElement, poster: string) {
  if (!mounted.size) {
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener('change', reset);
    document.addEventListener('visibilitychange', reset);
  }
  mounted.set(ring, create(ring, poster));
}
export function playNpcReaction(side: 'me' | 'opp', action: Action) {
  const ring = document.querySelector<HTMLElement>(side === 'me' ? '#portraitMe .pt-ring' : '#portraitOpp .pt-ring');
  if (ring) mounted.get(ring)?.play(action);
}
export function skipNpcReactions(on: boolean) { skipped = on; if (on) reset(); }
export function disposeNpcReactions(root: HTMLElement) {
  for (const [ring, motion] of mounted) if (ring === root || root.contains(ring)) {
    motion.dispose(); mounted.delete(ring);
  }
  if (!mounted.size) {
    reduced?.removeEventListener('change', reset); reduced = undefined;
    document.removeEventListener('visibilitychange', reset);
  }
}
