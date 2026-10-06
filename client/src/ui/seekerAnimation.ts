/** Static duel portraits. Keep the approved idle artwork without a playback loop. */
type Color = 'red' | 'blue';
export const seekerAssets = ['red', 'blue'].map(color => `/art/seekers/v2/${color}-idle.webp`);
const portraits = new Map<Color, HTMLImageElement>();

export function seekerPortrait(color: Color): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  canvas.className = 'seeker-motion';
  canvas.dataset.animation = 'static';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', color === 'red' ? 'Red Seeker' : 'Blue Seeker');
  let image = portraits.get(color);
  if (!image) {
    image = new Image();
    image.src = `/art/seekers/v2/${color}-idle.webp`;
    portraits.set(color, image);
  }
  const portrait = image;
  const paint = () => {
    if (!portrait.naturalWidth) return;
    const ctx = canvas.getContext('2d', {alpha: false});
    if (!ctx) return;
    // The original artwork is a 4 x 4 atlas; display its neutral first frame once.
    ctx.drawImage(portrait, 0, 0, portrait.naturalWidth / 4, portrait.naturalHeight / 4, 0, 0, 256, 256);
    canvas.dataset.action = 'idle';
    canvas.dataset.frame = '0.00';
  };
  if (portrait.complete) paint();
  else portrait.addEventListener('load', paint, {once: true});
  return canvas;
}
