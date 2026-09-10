import { getLang } from '../i18n';
/** Game content is revealed only after assets are decoded and the 3D scene has
 * painted. A slow/cold connection must never reveal intermediate furniture. */
const readiness=new WeakMap<HTMLElement,Promise<void>>();
const images=new Map<string,Promise<void>>();
const logo='/art/brand/lore-logo-transparent.png';
const coinImages=['/ui/coin-toss/coin-option-1-front.png','/ui/coin-toss/coin-option-1-back.png'];
function decode(url:string):Promise<void>{
  let task=images.get(url);
  if(!task){const img=new Image();img.src=url;task=img.decode().then(()=>{}).catch(()=>{images.delete(url);});images.set(url,task);}
  return task;
}
export function waitForDuel(root:HTMLElement):Promise<void>{return readiness.get(root)??Promise.resolve();}
export function prepareDuel(root:HTMLElement,mount:Promise<void>):void{
  if(!document.fonts||typeof HTMLImageElement==='undefined')return;
  const loader=document.createElement('div');loader.className='duel-loader';loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');
  const mark=document.createElement('img');mark.src=logo;mark.alt='LORE';mark.decoding='sync';
  const label=document.createElement('span');label.textContent=getLang()==='ja'?'対戦の準備中':getLang()==='en'?'Preparing your duel':'대전 준비 중';
  const track=document.createElement('div');track.className='duel-load-track';track.setAttribute('aria-hidden','true');track.append(document.createElement('i'));loader.append(mark,label,track);root.append(loader);
  root.classList.add('duel-preparing');root.setAttribute('aria-busy','true');
  const task=(async()=>{
    await mount;
    while(root.isConnected&&root.dataset.boardRendered!=="true")await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    const urls=new Set([...coinImages,...['base-mon','base-spell','base-quest','field-mon','field-spell','field-quest','cost','attack','health'].map(n=>`/art/biblion/modular/${n}.png`)]);
    for(const el of root.querySelectorAll<HTMLElement>('*')){
      if(el instanceof HTMLImageElement){if(el.currentSrc||el.src)urls.add(el.currentSrc||el.src);el.loading='eager';}
      for(const pseudo of [null,'::before','::after'])for(const match of getComputedStyle(el,pseudo).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(match[1]);
    }
    for(const url of [...urls])if(url.includes('/art/cards-sm/'))urls.add(url.replace('/art/cards-sm/','/art/cards/'));
    await Promise.all([document.fonts.ready,...[...urls].map(decode),import('./coinScene'),import('./paperDraw')]);
    // Decode the actual image nodes too (not only a separate preloader object).
    await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
    while(root.isConnected&&root.dataset.sceneReady!=='true'&&root.dataset.tableState!=='fallback')await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    // Two paints allow decoded DOM images and compositing layers to commit.
    for(let i=0;i<2;i++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    root.dataset.preloadedImages=String(urls.size);
  })().finally(()=>{root.classList.remove('duel-preparing');root.removeAttribute('aria-busy');loader.remove();});
  readiness.set(root,task);
}
/** Warm public furniture and the coin while the player is still in the lobby. */
let warming:Promise<void>|undefined;
export function warmDuel():Promise<void>{
  return warming??=(async()=>{
    const low=matchMedia('(max-width:700px)').matches,suffix=low?'-low':'';
    const urls=[`/models/lore-table/table${suffix}.glb?v=20260909`,`/models/cosmetics/deck_holder_biblion_ivory/v1/model${suffix}.glb`,`/models/library-furniture/market${suffix}.glb`,`/models/library-furniture/v2/shelf${suffix}.glb`,`/models/library-furniture/v2/supply${suffix}.glb`];
    await Promise.allSettled([...urls.map(async url=>{const r=await fetch(url);if(r.ok)await r.arrayBuffer();}),...[logo,...coinImages].map(decode),import('./duelScene')]);
  })();
}
