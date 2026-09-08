import { t } from '../i18n';
let snapshot: { left: number; total: number } | null = null;
/** Shared by the controller and visual fixture. The clock never depends on WebGL. */
export function paintDuelClock(el: HTMLElement, seconds: number, total: number, mine: boolean): void {
  const left = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
  snapshot = {left, total};
  document.querySelectorAll<HTMLElement>(".dialog-clock").forEach(node => updateMirror(node, left, total));
  el.className = `mp-clock show ${mine ? 'mine' : 'opp'}${left <= 5 ? ' warn' : ''}`;
  el.removeAttribute('aria-hidden');
  el.setAttribute('role', 'timer');
  el.setAttribute('aria-label', t('game.timer.sec').replace('{n}', String(left)));
  el.dataset.remaining = String(left);
  el.dataset.total = String(Math.max(1, total));
  el.style.setProperty('--remaining', String(Math.min(1, left / Math.max(1,total))));
  if (!el.querySelector('.tc-num')) el.innerHTML = '<span class="hourglass-anchor" aria-hidden="true"></span><span class="tc-dial"><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="tc-track" cx="30" cy="30" r="26"/><circle class="tc-progress" cx="30" cy="30" r="26" pathLength="1"/></svg><span class="tc-num"></span></span>';
  el.querySelector('.tc-num')!.textContent = `${left}`;
}

function updateMirror(node: HTMLElement, left: number, total: number): void {
  node.textContent = t('game.timer.sec').replace('{n}', String(left));
  node.classList.toggle('warn', left <= 5);
  node.style.setProperty('--remaining', String(Math.min(1, left / Math.max(1,total))));
}
export function attachDuelClock(parent: HTMLElement): void {
  const clock = document.createElement('div'); clock.className = 'dialog-clock'; clock.setAttribute('role','timer');
  if (snapshot) updateMirror(clock, snapshot.left, snapshot.total);
  parent.prepend(clock);
}
