import {warmSounds} from './sound';
import {loadingScreen} from './loadingScreen';
import {loungeText} from './loungeText';
import {decodeAsset,waitAssets} from './assetReadiness';
import {seekerAssets} from './seekerAnimation';
import {READING_ASSETS} from './readingBoardLayout';
import {PASSIVE_KEYS} from '../shared/cards';
import {passiveIconUrl} from './passiveIcon';
/** Game content is revealed only after assets are decoded and the 3D scene has
 * painted. A slow/cold connection must never reveal intermediate furniture. */
const readiness=new WeakMap<HTMLElement,Promise<void>>();
const logo='/art/brand/lore-logo-transparent.webp';
const coinImages=['/ui/coin-toss/coin-option-1-front.png','/ui/coin-toss/coin-option-1-back.png'];
const decode=decodeAsset;
export function waitForDuel(root:HTMLElement):Promise<void>{return readiness.get(root)??Promise.resolve();}
export function prepareDuel(root:HTMLElement,mount:Promise<void>):void{
  if(!document.fonts||typeof HTMLImageElement==='undefined')return;
  void warmSounds();
  const loading=loadingScreen('duel-loader',loungeText('対戦の準備中','Preparing your duel','대전 준비 중')),loader=loading.element;root.append(loader);
  root.classList.add('duel-preparing');root.setAttribute('aria-busy','true');
  const expired=false;
  const work=(async()=>{
    await mount;
    loading.update(3,loungeText("盤面を組み立てています","Building the board","보드 준비 중"));
    while(!expired&&root.isConnected&&root.dataset.boardRendered!=="true")await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    if(expired||!root.isConnected)return;
    const urls=new Set(['/art/seekers/v2/mask-self.png','/art/seekers/v2/mask-opp.png',...PASSIVE_KEYS.map(passiveIconUrl),...seekerAssets,...coinImages,...['base-mon','base-spell','base-quest','field-mon','field-spell','field-quest','cost','attack','health','shield','dew'].map(n=>`/art/biblion/modular/${n}.png`)]);
    for(const el of root.querySelectorAll<HTMLElement>('*')){
      if(el.dataset.material)urls.add(el.dataset.material);
      if(el instanceof HTMLImageElement){if(el.currentSrc||el.src)urls.add(el.currentSrc||el.src);el.loading='eager';el.fetchPriority='high';}
      for(const pseudo of [null,'::before','::after']){const style=getComputedStyle(el,pseudo);if(pseudo&&(style.content==='none'||style.content==='normal'))continue;for(const match of style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(match[1]);}
    }
    for(const url of [...urls])if(url.includes('/art/cards-sm/'))urls.add(url.replace('/art/cards-sm/','/art/cards/'));
    await Promise.all([document.fonts.ready,waitAssets([...urls],loader,(done,total)=>loading.update(5+(total?done/total:1)*85,loungeText(`画像の準備 ${done} / ${total}`,`Artwork ${done} / ${total}`,`이미지 준비 ${done} / ${total}`))),import('./ceremonyScene'),import('./paperDraw')]);
    loading.update(92,loungeText("盤面と演出の最終準備","Preparing the board and effects","보드와 연출 마무리 중"));
    // Decode the actual image nodes too (not only a separate preloader object).
    await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
    while(!expired&&root.isConnected&&root.dataset.sceneReady!=='true'&&root.dataset.tableState!=='fallback')await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    loading.update(98,loungeText("もうすぐ始まります","Almost ready","곧 시작합니다"));
    // Two paints allow decoded DOM images and compositing layers to commit.
    for(let i=0;i<2;i++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    loading.update(100,loungeText("準備完了","Ready","준비 완료"));
    root.dataset.preloadedImages=String(urls.size);
  })();
  const task=work.finally(()=>{root.classList.remove('duel-preparing');root.removeAttribute('aria-busy');loader.remove();});
  readiness.set(root,task);
}
/** Warm public furniture and the opening portraits while the player is still in the lobby. */
let warming:Promise<void>|undefined;
export function warmDuel():Promise<void>{
  return warming??=(async()=>{
    void warmSounds();
    const low=matchMedia('(max-width:700px)').matches;
    const urls=[...['board','market','supply'].map(n=>`${n}${low?'-low':''}.glb`),...['deck-place','shelf'].map(n=>`${n}${low?'-lod1':''}.glb`),'mana-tray.glb','mana-counter.glb','mana-crystal-ready.glb','mana-crystal-spent.glb','crystal-optics.json','turn-button.glb','timer-inserts.glb','reroll-button.glb'].map(n=>READING_ASSETS+n);
    await Promise.allSettled([...urls.map(async url=>{const r=await fetch(url);if(r.ok)await r.arrayBuffer();}),...[logo,...coinImages].map(decode),import('./duelScene')]);
  })();
}
