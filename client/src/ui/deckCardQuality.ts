import {deckMasterArt as masterArt} from './deckMasterArt';

// Key the authored black backing at source resolution, before the browser
// downsamples it. Filtering an already 88px frame erases its fine silver edge.
const matteCache=new Map<string,Promise<string>>();
function nativeMatte(src:string):Promise<string>{
 const cached=matteCache.get(src);if(cached)return cached;
 const result=(async()=>{
  const image=new Image();image.src=src;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data;
  for(let i=0;i<p.length;i+=4)p[i+3]*=Math.max(0,Math.min(1,(p[i]+p[i+1]+p[i+2])/255*10-.65));
  ctx.putImageData(pixels,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Card matte encoding failed')),'image/png'));
  return URL.createObjectURL(blob);
 })();matteCache.set(src,result);return result;
}
export function prepareDeckCard(face:HTMLElement,id:string){
 const title=face.querySelector<HTMLElement>('.card-name');
 if(title){title.style.removeProperty('font-size');const units=[...title.textContent??''].reduce((n,ch)=>n+(/\s/.test(ch)?.32:ch.codePointAt(0)!>=0x2e80?1:.6),0);face.style.setProperty('--title-units',String(Math.max(1,units)));}
 const art=face.querySelector<HTMLElement>('.card-art');
 if(art&&masterArt[id]){
  // A new element has no thumbnail srcset/density selection left over from cardEl.
  const image=new Image();image.alt='';image.className='card-art-img';image.decoding='async';image.draggable=false;image.loading=art.querySelector<HTMLImageElement>('img')?.loading||'eager';
  image.onload=()=>{image.classList.add('art-loaded');art.classList.add('art-done');art.style.backgroundImage='none';art.dataset.artWidth=String(image.naturalWidth)};
  image.onerror=()=>{image.onerror=null;image.src=`/art/cards/${id}.webp`;};
  image.src=masterArt[id];art.replaceChildren(image);
 }
 const frame=face.querySelector<HTMLElement>('.card-frame');
 const frameUrl=frame?.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
 const layers:[HTMLElement,string][]=[];
 if(frame&&frameUrl)layers.push([frame,frameUrl]);
 for(const [selector,file] of [['.card-cost .seal-face','cost'],['.ad-atk .seal-face','attack'],['.ad-def .seal-face','health']]){
  const layer=face.querySelector<HTMLElement>(selector);if(layer)layers.push([layer,`/art/biblion/modular/${file}.png`]);
 }
 for(const [layer,src] of layers)void nativeMatte(src).then(url=>{layer.style.backgroundImage=`url("${url}")`;layer.classList.add('native-matte')}).catch(error=>console.error('Original card frame failed to load',src,error));
}
window.addEventListener('pagehide',event=>{if(event.persisted)return;for(const result of matteCache.values())void result.then(URL.revokeObjectURL).catch(()=>{});matteCache.clear()});
