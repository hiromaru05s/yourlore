import {rasterMatte} from './spellFrame/matteRaster';
import {frameMaskOffThread} from './spellFrame/rasterClient';
import {refreshSummonAppearance} from './summon/appearance';
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
      const timeout=setTimeout(()=>reject(new Error('Card texture timeout: '+url)),2500);
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
    pending = image(url).then(async img => {
      const height=RESOLUTION*img.naturalHeight/img.naturalWidth;
      try{
        const bitmap=await frameMaskOffThread(img,undefined,[],{width:RESOLUTION,height});
        const c=canvas(bitmap.width,bitmap.height);
        try{c.getContext('2d')!.drawImage(bitmap,0,0);}finally{bitmap.close();}
        return c;
      }catch{return rasterMatte(img,RESOLUTION,height,()=>document.createElement('canvas'));}
    });
    matteCache.set(url, pending);
    void pending.catch(() => matteCache.delete(url));
  }
  return pending;
}

/** Warm independent layers together before a contact-triggered material needs them. */
export function warmCardSurface(node:HTMLElement):void{
 for(const el of node.querySelectorAll('.card-frame,.seal-face')){const url=urlOf(el);if(url)void matte(url).catch(()=>{});}
 const art=node.querySelector<HTMLImageElement>('.card-art img');if(art)void image(art.src.replace(/\/art\/cards-(sm|xs)\//,'/art/cards/')).catch(()=>{});
 if(node.querySelector('.card-status .ec,.card-status .kw,.badge'))void matte('/art/biblion/modular/plaque-ui.webp').catch(()=>{});
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
export async function captureCardSurface(node: HTMLElement, sleeve: string, reveal: boolean, includeBack=true, liveSource=node): Promise<CardSurface> {
  const r = node.getBoundingClientRect();
  const ratio = r.height / r.width;
  // Opponent path never reads, copies or requests a face or card identity.
  if (!reveal) return captureCardBack(sleeve,ratio);
  refreshSummonAppearance(node,2);
  const w = RESOLUTION, h = w * ratio, pad = w * CARD_PADDING;
  const back = canvas(w + pad*2, h + pad*2);
  const backCtx = back.getContext('2d')!;
  const backImage = includeBack?image(sleeve):Promise.resolve(null);
  const face = canvas(w + pad*2, h + pad*2), ctx = face.getContext('2d')!;
  const box = (el: Element) => {
    const b = el.getBoundingClientRect();
    return { x: pad+(b.left-r.left)/r.width*w, y: pad+(b.top-r.top)/r.height*h, w:b.width/r.width*w, h:b.height/r.height*h };
  };
  // The matte is already rasterized. Preserve the remaining native CSS filters
  // at capture density instead of replacing the frame with a flat, bright print.
  const filter=(el:Element)=>getComputedStyle(el).filter.replace(/url\([^)]*\)/g,'').replace(/(-?[\d.]+)px/g,(_,n)=>`${Number(n)*w/(node.offsetWidth||r.width)}px`).trim()||'none';
  const stateFilter=node.matches('.is-dim,.is-exhausted,[data-summon-rest="blocked"],.field-resting-face')?getComputedStyle(node.querySelector('.card-art')??node).filter:'none';
  const rootFilter=filter(node)==='none'?stateFilter:filter(node);
  const layers: (() => Promise<void>)[] = [];
  const frame = node.querySelector('.card-frame');
  if (!frame || !urlOf(frame)) throw new Error('Missing card frame');
  const frameUrl = urlOf(frame)!;
  // State glows pulse on a shared live clock; baking one phase into a texture
  // leaves a bright frozen halo at the handoff. Capture only the physical frame.
  const restingShadow=node.style.getPropertyValue('--rest-shadow');
  if(node.classList.contains('summon-face'))node.style.setProperty('--rest-shadow','drop-shadow(0 0 0 #0000)');
  const frameFilter=stateFilter!=='none'?filter(frame).replace(/(?:grayscale|brightness|contrast)\([^)]*\)/g,'').trim():filter(frame);
  if(restingShadow)node.style.setProperty('--rest-shadow',restingShadow);
  const frameInk=frameFilter||'none';
  layers.push(async () => {const image=await matte(frameUrl);ctx.save();ctx.filter=frameInk;ctx.drawImage(image,pad,pad,w,h);ctx.restore();});
  const art = node.querySelector<HTMLImageElement>('.card-art img');
  if (art) {
    const b = box(art), fallback = art.srcset?(art.currentSrc||art.src):art.src;
    // A projected thumbnail must never become the source of an enlarged VFX
    // face. The identity is already public here; retain the original as fallback.
    const src = art.src.replace(/\/art\/cards-(sm|xs)\//,'/art/cards/');
    const position = getComputedStyle(art).objectPosition.split(' ').map(v => parseFloat(v)/100);
    const path = document.querySelector(node.classList.contains('card--field')?'#celestial-field-spell path':'#celestial-base-spell path')?.getAttribute('d');
    layers.push(async () => {
      let img:HTMLImageElement;try{img=await image(src);}catch{try{img=await image(fallback);}catch{return;}}
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
  // Sample the live material before typography, preserving its art-window clip.
  const liveLayers=liveSource.querySelectorAll<HTMLCanvasElement>('.card-effect-surface');
  let layerIndex=0;
  for(const layer of node.querySelectorAll<HTMLCanvasElement>('.card-effect-surface')){
    const pixels=liveLayers[layerIndex++]??layer;
    if(!layer.width||!layer.height)continue;
    const snapshot=canvas(layer.width,layer.height);snapshot.getContext('2d')!.drawImage(pixels,0,0);
    const b=box(layer),artLayer=!!layer.closest('.card-art');
    const blend=getComputedStyle(layer).mixBlendMode==='screen'?'screen':'source-over';
    const path=document.querySelector(node.classList.contains('card--field')?'#celestial-field-spell path':'#celestial-base-spell path')?.getAttribute('d');
    layers.push(async()=>{ctx.save();if(artLayer&&path){ctx.translate(pad,pad);ctx.scale(w,h);ctx.clip(new Path2D(path));ctx.scale(1/w,1/h);ctx.translate(-pad,-pad);}ctx.globalCompositeOperation=blend;ctx.drawImage(snapshot,b.x,b.y,b.w,b.h);ctx.restore();});
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
    layers.push(async () => { ctx.drawImage(await matte('/art/biblion/modular/plaque-ui.webp'), b.x,b.y,b.w,b.h); });
    layers.push(drawText(label));
  }
  for(const icon of node.querySelectorAll<HTMLElement>('.card-status .passive-icon')){
    const img=icon.querySelector<HTMLImageElement>('img');
    if(img){const b=box(img),url=img.currentSrc||img.src;layers.push(async()=>{ctx.drawImage(await image(url),b.x,b.y,b.w,b.h);});}
    const halo=icon.querySelector<SVGSVGElement>('.passive-halo svg');
    if(halo){const b=box(halo),strokes=[...halo.querySelectorAll('path')].map(path=>({path:new Path2D(path.getAttribute('d')||''),style:getComputedStyle(path)}));
      layers.push(async()=>{ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.w/32,b.h/32);ctx.lineJoin='round';ctx.lineCap='round';for(const {path,style} of strokes){ctx.strokeStyle=style.stroke;ctx.lineWidth=parseFloat(style.strokeWidth);ctx.globalAlpha=parseFloat(style.opacity);ctx.stroke(path);}ctx.restore();});
    }
    if(icon.classList.contains('kw--granted')){const b=box(icon);layers.push(async()=>{ctx.save();ctx.translate(b.x+b.w*.885,b.y+b.h*.115);ctx.rotate(Math.PI/4);ctx.fillStyle='#c1f2dc';ctx.strokeStyle='#234e46';ctx.lineWidth=w/r.width;ctx.fillRect(-b.w*.115,-b.h*.115,b.w*.23,b.h*.23);ctx.strokeRect(-b.w*.115,-b.h*.115,b.w*.23,b.h*.23);ctx.restore();});}
    const count=icon.querySelector<HTMLElement>('b');
    if(count){const b=box(count),style=getComputedStyle(count);layers.push(async()=>{ctx.save();ctx.fillStyle=style.backgroundColor;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,b.h*.3);ctx.fill();ctx.restore();});layers.push(drawText(count));}
  }
  await Promise.all([backImage, image(frameUrl), ...(art ? [image(art.currentSrc || art.src).catch(()=>null)] : [])]);
  for (const draw of layers) await draw();
  if(rootFilter!=='none'){
    const print=canvas(face.width,face.height);print.getContext('2d')!.drawImage(face,0,0);
    ctx.clearRect(0,0,face.width,face.height);ctx.save();ctx.filter=rootFilter;ctx.drawImage(print,0,0);ctx.restore();
  }
  const sleeveImage=await backImage;if(sleeveImage)paintSleeve(backCtx,sleeveImage,pad,w,h);
  return { face, back };
}

/** Measure a canonical upright card outside every projected ancestor. */
export async function capturePileSurface(node:HTMLElement,sleeve:string,preserveDim=false):Promise<CardSurface> {
  const host=document.createElement('div');host.className='pile-print';
  host.style.cssText='position:fixed;left:-1000px;top:0;width:128px;height:200px;visibility:hidden;pointer-events:none';
  const copy=node.cloneNode(true) as HTMLElement;copy.removeAttribute('style');
  const originalLayers=node.querySelectorAll<HTMLCanvasElement>('.card-effect-surface');copy.querySelectorAll<HTMLCanvasElement>('.card-effect-surface').forEach((layer,i)=>{const original=originalLayers[i];if(original?.width)layer.getContext('2d')!.drawImage(original,0,0);});
  copy.classList.remove('fx-card-flight','cast-reveal','is-picked','is-armed','card--dim','is-dim','is-exhausted','is-playable','is-buyable');
  copy.style.cssText='--cw:128px;--ch:200px;width:128px;height:200px;transform:none';
  const originalWidth=node.offsetWidth||parseFloat(getComputedStyle(node).width)||128;
  copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*128/originalWidth}px`;});
  const art=copy.querySelector<HTMLImageElement>('.card-art img');
  if(art){const original=art.currentSrc||art.src;art.removeAttribute('srcset');art.removeAttribute('sizes');const full=art.src.replace(/\/art\/cards-(sm|xs)\//,'/art/cards/');try{await image(full);art.src=full;}catch{art.src=original;}try{await art.decode();}catch{}}
  host.append(copy);document.body.append(host);
  try{const result=await captureCardSurface(copy,sleeve,true);
    if(preserveDim&&node.classList.contains('is-dim')&&result.face){const c=canvas(result.face.width,result.face.height),ctx=c.getContext('2d')!;ctx.filter='grayscale(1) brightness(.55) contrast(.9)';ctx.drawImage(result.face,0,0);result.face=c;}
    return result;
  }finally{host.remove();}
}

/** Capture the actual public persistent spell or quest tile at its native size, including the cost
 * seal and localized progress. Padding is identical to captureCardSurface. */
export async function captureQuestTile(node:HTMLElement):Promise<HTMLCanvasElement> {
  const r=node.getBoundingClientRect(),w=768,h=w*r.height/r.width,pad=w*CARD_PADDING;
  const out=canvas(w+pad*2,h+pad*2),c=out.getContext('2d')!;
  const box=(el:Element)=>{const b=el.getBoundingClientRect();return {x:pad+(b.left-r.left)/r.width*w,y:pad+(b.top-r.top)/r.width*w,w:b.width/r.width*w,h:b.height/r.width*w};};
  const frame=node.querySelector<HTMLElement>('.buff-frame')!,art=node.querySelector<HTMLElement>('.buff-art')!;
  const cost=node.querySelector<HTMLElement>('.buff-cost')!,label=node.querySelector<HTMLElement>('.quest-progress');
  const cb=box(cost),cs=getComputedStyle(cost);
  const infinity=node.querySelector<HTMLImageElement>('.buff-infinity');
  const ib=infinity?box(infinity):null;
  // Print the very same self-contained SVG badges used by the native landing.
  const badges=[...node.querySelectorAll<SVGSVGElement>('.enchant-time > svg,.card-counter > svg')].map(svg=>{
    const copy=svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width','64');copy.setAttribute('height','64');
    return {box:box(svg),src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy))};
  });
  const lb=label?box(label):null,ls=label?getComputedStyle(label):null;
  const text=(value:string,b:ReturnType<typeof box>,style:CSSStyleDeclaration)=>{
    c.save();c.font=`${style.fontWeight} ${parseFloat(style.fontSize)*w/r.width}px ${style.fontFamily}`;
    c.textAlign='center';c.textBaseline='middle';c.fillStyle=style.color;c.shadowColor='#000';c.shadowBlur=3*w/r.width;c.shadowOffsetY=w/r.width;
    c.fillText(value,b.x+b.w/2,b.y+b.h/2,b.w);c.restore();
  };
  const [fr,ar,seal]=await Promise.all([matte(urlOf(frame)!),image(urlOf(art)!),matte('/art/biblion/modular/cost-ui.webp')]);
  c.drawImage(fr,pad,pad,w,h);c.save();
  const path=document.querySelector('#celestial-field-spell path')?.getAttribute('d');
  if(path){c.translate(pad,pad);c.scale(w,h);c.clip(new Path2D(path));c.scale(1/w,1/h);c.translate(-pad,-pad);}
  const scale=Math.max(w/ar.naturalWidth,h/ar.naturalHeight),sw=w/scale,sh=h/scale;
  c.drawImage(ar,(ar.naturalWidth-sw)/2,(ar.naturalHeight-sh)/2,sw,sh,pad,pad,w,h);c.restore();
  for(const layer of node.querySelectorAll<HTMLCanvasElement>('.card-effect-surface')){if(!layer.width)continue;c.save();if(path){c.translate(pad,pad);c.scale(w,h);c.clip(new Path2D(path));c.scale(1/w,1/h);c.translate(-pad,-pad);}c.globalCompositeOperation=getComputedStyle(layer).mixBlendMode==='screen'?'screen':'source-over';const b=box(layer);c.drawImage(layer,b.x,b.y,b.w,b.h);c.restore();}
  c.drawImage(seal,cb.x,cb.y,cb.w,cb.h);text(cost.textContent||'',cb,cs);
  for(const badge of badges){const b=badge.box;c.drawImage(await image(badge.src),b.x,b.y,b.w,b.h);}
  if(!label||!lb||!ls){
    if(infinity&&ib)c.drawImage(await matte(infinity.src),ib.x,ib.y,ib.w,ib.h);
    return out;
  }
  const gradient=c.createLinearGradient(lb.x,0,lb.x+lb.w,0);gradient.addColorStop(0,'#231330dd');gradient.addColorStop(.5,'#38214bef');gradient.addColorStop(1,'#231330dd');
  c.fillStyle=gradient;c.fillRect(lb.x,lb.y,lb.w,lb.h);c.fillStyle=ls.borderTopColor;c.fillRect(lb.x,lb.y,lb.w,parseFloat(ls.borderTopWidth)*w/r.width);
  text(label.textContent||'',lb,ls);return out;
}
