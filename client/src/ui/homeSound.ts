import '../styles/homeSound.css';
import { loungeText } from './loungeText';
import { getSfxVolume, setSfxVolume, toggleSfxMuted } from './sound';

/** A native range keeps drag, touch and keyboard volume controls consistent. */
export function mountHomeSound(parent: HTMLElement): () => void {
  const bar = document.createElement('div');
  bar.className = 'home-sound';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', loungeText('サウンド', 'Sound', '사운드'));
  bar.innerHTML = `<button type="button" class="home-sound-toggle" aria-label="${loungeText('ミュート', 'Mute', '음소거')}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z"/>
      <path class="home-sound-waves" d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>
      <path class="home-sound-slash" d="m16 9 6 6m0-6-6 6"/>
    </svg>
  </button>
  <input class="home-sound-range" type="range" min="0" max="100" step="1" aria-label="${loungeText('音量（BGM・効果音）', 'Volume (music and effects)', '음량 (배경음악·효과음)')}">
  <span class="home-sound-value" aria-hidden="true"></span>`;
  const button = bar.querySelector<HTMLButtonElement>('button')!;
  const range = bar.querySelector<HTMLInputElement>('input')!;
  const value = bar.querySelector<HTMLElement>('.home-sound-value')!;
  const sync = () => {
    const percent = Math.round(getSfxVolume() * 100);
    const muted = getSfxVolume() === 0;
    range.value = String(percent);
    range.style.setProperty('--volume', `${percent}%`);
    range.setAttribute('aria-valuetext', muted ? loungeText('ミュート', 'Muted', '음소거') : `${percent}%`);
    bar.classList.toggle('is-muted', muted);
    button.setAttribute('aria-pressed', String(muted));
    button.title = muted ? loungeText('ミュート解除', 'Unmute', '음소거 해제') : loungeText('ミュート', 'Mute', '음소거');
    value.textContent = `${percent}%`;
  };
  button.onclick = toggleSfxMuted;
  range.oninput = () => setSfxVolume(Number(range.value) / 100);
  document.addEventListener('lore:volume-change', sync);
  parent.append(bar);
  sync();
  return () => { document.removeEventListener('lore:volume-change', sync); bar.remove(); };
}
