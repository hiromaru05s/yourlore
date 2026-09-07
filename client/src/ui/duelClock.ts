import { t } from '../i18n';
/** Shared by the controller and visual fixture. The clock never depends on WebGL. */
export function paintDuelClock(el: HTMLElement, seconds: number, total: number, mine: boolean): void {
  const left = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
  el.className = `mp-clock show ${mine ? 'mine' : 'opp'}${left <= 5 ? ' warn' : ''}`;
  el.removeAttribute('aria-hidden');
  el.setAttribute('role', 'timer');
  el.setAttribute('aria-label', t('game.timer.sec').replace('{n}', String(left)));
  el.dataset.remaining = String(left);
  el.dataset.total = String(Math.max(1, total));
  if (!el.querySelector('.tc-num')) el.innerHTML = '<span class="hourglass-anchor" aria-hidden="true"></span><span class="tc-num"></span>';
  el.querySelector('.tc-num')!.textContent = `${left}`;
}
