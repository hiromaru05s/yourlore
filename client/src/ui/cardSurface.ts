/** Rasterize the current card layers for a deformable mesh. Layout and text
 * come from the real DOM card, not a second set of card rules or translations. */
export const CARD_PADDING = .12;
const RESOLUTION = 384;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const matteCache = new Map<string, Promise<HTMLCanvasElement>>();

function image(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img); img.onerror = () => reject(new Error('Card texture unavailable'));
      img.src = url;
    });
    imageCache.set(url, pending);
    void pending.catch(() => imageCache.delete(url));
    // Image elements are only a warm cache; the browser retains network caching.
    if (imageCache.size > 64) imageCache.delete(imageCache.keys().next().value!);
  }
  return pending;
}
function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c;
}
function urlOf(el: Element): string | null {
  return /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage)?.[1] ?? null;
}
/** Match #celestial-matte (sRGB) used by both the frame and numeric seals. */
async function matte(url: string): Promise<HTMLCanvasElement> {
  let pending = matteCache.get(url);
  if (!pending) {
    pending = image(url).then(img => {
      const c = canvas(RESOLUTION, RESOLUTION * img.naturalHeight / img.naturalWidth);
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, c.width, c.height);
      const pixels = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const a = Math.min(1, Math.max(0, (pixels.data[i] + pixels.data[i+1] + pixels.data[i+2]) / 255 * 10 - .1));
        pixels.data[i+3] *= a;
      }
      ctx.putImageData(pixels, 0, 0); return c;
    });
    matteCache.set(url, pending);
    void pending.catch(() => matteCache.delete(url));
  }
  return pending;
}

export interface CardSurface { face: HTMLCanvasElement | null; back: HTMLCanvasElement; }
export async function captureCardSurface(node: HTMLElement, sleeve: string, reveal: boolean): Promise<CardSurface> {
  const r = node.getBoundingClientRect();
  const ratio = r.height / r.width;
  const w = RESOLUTION, h = w * ratio, pad = w * CARD_PADDING;
  const back = canvas(w + pad*2, h + pad*2);
  const backCtx = back.getContext('2d')!;
  const backImage = image(sleeve);
  // Opponent path never reads, copies or requests a face or card identity.
  if (!reveal) {
    backCtx.drawImage(await backImage, pad, pad, w, h);
    return { face: null, back };
  }
  const face = canvas(w + pad*2, h + pad*2), ctx = face.getContext('2d')!;
  const box = (el: Element) => {
    const b = el.getBoundingClientRect();
    return { x: pad+(b.left-r.left)/r.width*w, y: pad+(b.top-r.top)/r.height*h, w:b.width/r.width*w, h:b.height/r.height*h };
  };
  const layers: (() => Promise<void>)[] = [];
  const frame = node.querySelector('.card-frame');
  if (!frame || !urlOf(frame)) throw new Error('Missing card frame');
  const frameUrl = urlOf(frame)!;
  layers.push(async () => { ctx.drawImage(await matte(frameUrl), pad, pad, w, h); });
  const art = node.querySelector<HTMLImageElement>('.card-art img');
  if (art) {
    const b = box(art), src = art.currentSrc || art.src;
    const position = getComputedStyle(art).objectPosition.split(' ').map(v => parseFloat(v)/100);
    const path = document.querySelector('#celestial-base-spell path')?.getAttribute('d');
    layers.push(async () => {
      const img = await image(src);
      ctx.save();
      if (path) {
        ctx.translate(pad,pad); ctx.scale(w,h); ctx.clip(new Path2D(path)); ctx.scale(1/w,1/h); ctx.translate(-pad,-pad);
      }
      const scale = Math.max(b.w/img.naturalWidth,b.h/img.naturalHeight);
      const sw = b.w/scale, sh = b.h/scale;
      ctx.drawImage(img,(img.naturalWidth-sw)*(position[0] || .5),(img.naturalHeight-sh)*(position[1] ?? .5),sw,sh,b.x,b.y,b.w,b.h);
      ctx.restore();
    });
  }
  // Capture text measurements BEFORE awaits or hiding the destination.
  const drawText = (el: HTMLElement): (() => Promise<void>) => {
    const style = getComputedStyle(el), b = box(el);
    const size = parseFloat(style.fontSize) * r.width / (node.offsetWidth || r.width) * w / r.width;
    const text = el.textContent || '';
    return async () => {
      ctx.save(); ctx.beginPath(); ctx.rect(b.x,b.y,b.w,b.h); ctx.clip();
      ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=style.color;
      ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=w/160; ctx.shadowOffsetY=w/384;
      ctx.fillText(text,b.x+b.w/2,b.y+b.h/2,b.w); ctx.restore();
    };
  };
  const name = node.querySelector<HTMLElement>('.card-name');
  if (name) layers.push(drawText(name));
  for (const seal of node.querySelectorAll<HTMLElement>('.card-cost,.ad-atk,.ad-def')) {
    const plate = seal.querySelector('.seal-face'), value = seal.querySelector<HTMLElement>('.seal-value');
    if (plate) {
      const url = urlOf(plate), b = box(plate);
      if (url) layers.push(async () => {ctx.drawImage(await matte(url),b.x,b.y,b.w,b.h);});
    }
    if (value) layers.push(drawText(value));
  }
  for (const label of node.querySelectorAll<HTMLElement>('.card-status .ec,.card-status .kw,.badge')) {
    const b = box(label);
    layers.push(async () => { ctx.drawImage(await matte('/art/biblion/modular/plaque.png'), b.x,b.y,b.w,b.h); });
    layers.push(drawText(label));
  }
  await Promise.all([backImage, image(frameUrl), ...(art ? [image(art.currentSrc || art.src)] : [])]);
  for (const draw of layers) await draw();
  backCtx.drawImage(await backImage, pad,pad,w,h);
  return { face, back };
}
