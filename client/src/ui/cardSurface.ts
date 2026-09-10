/** Rasterize the current card layers for a deformable mesh. Layout and text
 * come from the real DOM card, not a second set of card rules or translations. */
export const CARD_PADDING = .12;
const RESOLUTION = 1536;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const matteCache = new Map<string, Promise<HTMLCanvasElement>>();

function image(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const timeout=setTimeout(()=>reject(new Error('Card texture timeout')),2500);
      img.onload = () => {clearTimeout(timeout);resolve(img);}; img.onerror = () => {clearTimeout(timeout);reject(new Error('Card texture unavailable'));};
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
        const a = Math.min(1, Math.max(0, (pixels.data[i] + pixels.data[i+1] + pixels.data[i+2]) / 255 * 10 - .65));
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
/** Identity-free sleeve surface shared by draw and library reshuffle meshes. */
function paintSleeve(ctx:CanvasRenderingContext2D,img:HTMLImageElement,pad:number,w:number,h:number){
 ctx.save();ctx.beginPath();ctx.roundRect(pad+w*.03,pad+h*.03,w*.94,h*.94,w*.12);ctx.clip();ctx.drawImage(img,pad,pad,w,h);ctx.restore();
}
export async function captureCardBack(sleeve:string,ratio=1/.64):Promise<CardSurface> {
  const w=RESOLUTION,h=w*ratio,pad=w*CARD_PADDING;
  const back=canvas(w+pad*2,h+pad*2);
  paintSleeve(back.getContext('2d')!,await image(sleeve),pad,w,h);
  return {face:null,back};
}
export async function captureCardSurface(node: HTMLElement, sleeve: string, reveal: boolean): Promise<CardSurface> {
  const r = node.getBoundingClientRect();
  const ratio = r.height / r.width;
  // Opponent path never reads, copies or requests a face or card identity.
  if (!reveal) return captureCardBack(sleeve,ratio);
  const w = RESOLUTION, h = w * ratio, pad = w * CARD_PADDING;
  const back = canvas(w + pad*2, h + pad*2);
  const backCtx = back.getContext('2d')!;
  const backImage = image(sleeve);
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
    const b = box(art), src = art.srcset?(art.currentSrc||art.src):art.src;
    const position = getComputedStyle(art).objectPosition.split(' ').map(v => parseFloat(v)/100);
    const path = document.querySelector(node.classList.contains('card--field')?'#celestial-field-spell path':'#celestial-base-spell path')?.getAttribute('d');
    layers.push(async () => {
      let img:HTMLImageElement;try{img=await image(src);}catch{return;}
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
  await Promise.all([backImage, image(frameUrl), ...(art ? [image(art.currentSrc || art.src).catch(()=>null)] : [])]);
  for (const draw of layers) await draw();
  paintSleeve(backCtx,await backImage,pad,w,h);
  return { face, back };
}

/** Measure a canonical upright card outside every projected ancestor. */
export async function capturePileSurface(node:HTMLElement,sleeve:string,preserveDim=false):Promise<CardSurface> {
  const host=document.createElement('div');host.className='pile-print';
  host.style.cssText='position:fixed;left:-1000px;top:0;width:128px;height:200px;visibility:hidden;pointer-events:none';
  const copy=node.cloneNode(true) as HTMLElement;copy.removeAttribute('style');
  copy.classList.remove('fx-card-flight','cast-reveal','is-picked','is-armed','card--dim','is-dim','is-exhausted','is-playable','is-buyable');
  copy.style.cssText='--cw:128px;--ch:200px;width:128px;height:200px;transform:none';
  const originalWidth=node.offsetWidth||parseFloat(getComputedStyle(node).width)||128;
  copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*128/originalWidth}px`;});
  const art=copy.querySelector<HTMLImageElement>('.card-art img');
  if(art){const original=art.currentSrc||art.src;art.removeAttribute('srcset');art.removeAttribute('sizes');const full=art.src.replace(/\/art\/cards-(sm|xs)\//,'/art/cards/');try{await image(full);art.src=full;}catch{art.src=original;}try{await art.decode();}catch{}}
  host.append(copy);document.body.append(host);
  try{const result=await captureCardSurface(copy,sleeve,true);
    if(preserveDim&&node.classList.contains('is-dim')&&getComputedStyle(node).filter!=='none'&&result.face){const c=canvas(result.face.width,result.face.height),ctx=c.getContext('2d')!;ctx.filter='grayscale(1) brightness(.55) contrast(.9)';ctx.drawImage(result.face,0,0);result.face=c;}
    return result;
  }finally{host.remove();}
}
