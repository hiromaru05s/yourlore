/** Activate stationary touch/pen releases without depending on a synthesized
 * mouse click. Keep native mouse/keyboard activation and cancel scroll gestures. */
export function bindTouchActivation(root: HTMLElement, selector: string): () => void {
  const events = new (root.ownerDocument.defaultView?.AbortController ?? AbortController)();
  let press: { id: number; target: HTMLElement; x: number; y: number; at: number } | undefined;
  let completed: { target: HTMLElement; at: number } | undefined;
  const target = (event: Event) => event.target instanceof Element
    ? event.target.closest<HTMLElement>(selector) : null;
  const enabled = (el: HTMLElement | null): el is HTMLElement => !!el && root.contains(el)
    && !(el instanceof HTMLButtonElement && el.disabled) && !el.closest('[inert]');
  root.addEventListener('pointerdown', event => {
    press = undefined; completed = undefined;
    const el = target(event);
    if (event.isPrimary && event.button === 0 && event.pointerType !== 'mouse' && enabled(el)) {
      press = { id: event.pointerId, target: el, x: event.clientX, y: event.clientY, at: performance.now() };
    }
  }, { signal: events.signal });
  root.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press = undefined;
  }, { signal: events.signal });
  root.addEventListener('pointercancel', () => { press = undefined; }, { signal: events.signal });
  root.addEventListener('scroll', () => { press = undefined; }, { capture: true, signal: events.signal });
  root.addEventListener('pointerup', event => {
    const p = press; press = undefined;
    if (!p || p.id !== event.pointerId || target(event) !== p.target || !enabled(p.target)
      || performance.now() - p.at > 800 || Math.hypot(event.clientX - p.x, event.clientY - p.y) > 10) return;
    completed = { target: p.target, at: performance.now() };
    p.target.click();
  }, { signal: events.signal });
  root.addEventListener('click', event => {
    // .click() and keyboard activation have detail=0. Consume only the trailing
    // compatibility click, including Safari versions that label it as a mouse.
    if (event.detail && completed?.target === target(event) && performance.now() - completed.at < 800) {
      event.preventDefault(); event.stopImmediatePropagation(); completed = undefined;
    }
  }, { capture: true, signal: events.signal });
  return () => { events.abort(); press = undefined; completed = undefined; };
}
