import '../styles/loreCursor.css';

// The split silver rim and its shards share the pointer's contact point.
const angles = [8, 65, 116, 170, 224, 279, 322];
const splinters = angles.map((angle, i) => `
  <g transform="rotate(${angle})"><g class="splinter">
    <path d="M0 -4.5 1.5 0 0 3.2 -1.3 1Z" fill="${i % 3 === 0 ? '#f5d69a' : '#a5deef'}"/>
    <path d="M0 -4.5 0 2.2 -1.3 1Z" fill="#f8fdff"/>
  </g></g>`).join('');
const burstArt = `<svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
  <g class="wave" stroke-dasharray="24 1">
    <circle cx="36" cy="36" r="22" pathLength="100" stroke="#315c78" stroke-width="2.7"/>
    <circle cx="36" cy="36" r="22.4" pathLength="100" stroke="#c7f1ff" stroke-width="1.35"/>
    <circle cx="36" cy="36" r="19.8" pathLength="100" stroke="#f2d9a7" stroke-width=".7"/>
  </g>
  <g transform="translate(36 36)">${splinters}</g>
  <path class="contact" d="m36 28 1.6 5.9 4.6 2.1-4.6 1.6L36 44l-1.6-6.4L28 36l6.4-2.1Z" fill="#fff3ce"/>
</svg>`;

export function installLoreCursor(): () => void {
  const root = document.documentElement;
  const dial = document.createElement('div');
  dial.className = 'lore-cursor-dial';
  dial.setAttribute('aria-hidden', 'true');
  document.body.append(dial);
  let lastDialog: Element | null = null;
  const fine = matchMedia('(any-pointer: fine)');
  const events = new AbortController();
  const bursts = new Set<HTMLElement>();
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

    const burst = document.createElement('div');
    burst.className = 'lore-cursor-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = (event.clientX - 36) + 'px';
    burst.style.top = (event.clientY - 36) + 'px';
    burst.innerHTML = burstArt;
    document.body.append(burst);
    // A manual popover paints above native shop/tutorial dialogs without taking focus.
    if (typeof burst.showPopover === 'function') {
      burst.popover = 'manual';
      burst.showPopover();
    }
    bursts.add(burst);
    const finish = () => { bursts.delete(burst); burst.remove(); };
    burst.addEventListener('animationend', e => { if (e.target === burst) finish(); });
    burst.addEventListener('animationcancel', e => { if (e.target === burst) finish(); });
  }, options);
  return () => {
    events.abort(); hide(); dial.remove();
    for (const burst of bursts) burst.remove();
    bursts.clear();
  };
}
