import { HomeDuelInk } from './homeDuelInk';
import {homeDuelImage, homeDuelFrame, loadHomeDuelImage, type Mode} from './homeDuelAssets';
import {assetHints} from './assetHints';
import { esc } from '../i18n';
import { loungeText } from './loungeText';
import '../styles/homeDuelButton.css';

type HomeMode = 'ranked' | 'online' | 'bot';
const geometry = {
  single: [56, 62, 1195, 1191],
  normal: [74, 80, 1179, 1169],
  ranked: [60, 57, 1194, 1163],
} as const;

/** The approved pigment is never repainted when the frame changes. */
function staticPigment(mode: Mode) {
  const [x, y, right, bottom] = geometry[mode];
  const width = right - x, height = bottom - y;
  return `<svg class="home-duel-fallback" aria-hidden="true" viewBox="${x - width * .06 / .88} ${y - height * .06 / .88} ${width / .88} ${height / .88}" preserveAspectRatio="none"><image href="${homeDuelImage(mode)}" width="1254" height="1254"/></svg>`;
}

export function mountHomeDuelButton(button: HTMLButtonElement) {
  let ink: HomeDuelInk | undefined;
  let current: HomeMode | undefined;
  button.classList.add('home-duel-button');
  // All three colors belong to the first HOME. A slow link must not reveal an
  // empty pigment when the player immediately chooses a different mode.
  assetHints.set(button, () => [homeDuelFrame, ...(['ranked', 'normal', 'single'] as const).map(homeDuelImage)]);
  // Fetch the two alternative colors alongside HOME's entrance, at low priority.
  for (const mode of ['ranked', 'normal', 'single'] as const) void loadHomeDuelImage(mode).catch(() => {});
  return {
    setMode(mode: HomeMode) {
      if (mode === current) return;
      current = mode;
      delete button.dataset.ready;
      delete button.dataset.motion;
      const palette: Mode = mode === 'bot' ? 'single' : mode === 'online' ? 'normal' : 'ranked';
      button.dataset.mode = palette;
      const label = palette === 'ranked' ? loungeText('ランクマッチ','Ranked','랭크 매치') : palette === 'normal' ? loungeText('ノーマル','Casual','일반') : loungeText('シングル','Single','싱글');
      const frame = palette === 'ranked' ? '943 60 777 763' : '55 60 778 763';
      button.innerHTML = `${staticPigment(palette)}
        <svg class="home-duel-frame" aria-hidden="true" viewBox="${frame}" preserveAspectRatio="none"><image href="${homeDuelFrame}" width="1774" height="887"/></svg>
        <span class="home-duel-label"><small aria-hidden="true">${palette === 'single' ? 'SINGLE' : palette === 'normal' ? 'CASUAL' : 'RANKED'} DUEL</small><strong>${esc(label)}</strong><span>${esc(loungeText('対戦開始','Start duel','대전 시작'))} <b>→</b></span></span>`;
      if (ink) { button.prepend(ink.canvas); ink.setMode(palette); }
      else ink = new HomeDuelInk(button, palette);
    },
    destroy() { ink?.destroy(); },
  };
}
