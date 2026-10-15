import {prepareDuelFonts} from './duelFonts';
import {warmSounds} from './sound';
import {loadingScreen} from './loadingScreen';
import {loungeText} from './loungeText';
import {imageUrls,waitAssets} from './assetReadiness';
import {decodeAsset,warmImages} from './imageAssets';
import {warmReadingAssets} from './readingAssetCache';
import {warmOpening} from './duelOpeningDirector';
import {duelImageUrls} from './duelAssets';
export {duelCardAssets} from './duelAssets';
const readiness=new WeakMap<HTMLElement,Promise<void>>();
const logo='/art/brand/lore-logo-transparent.webp';
export function waitForDuel(root:HTMLElement):Promise<void>{return readiness.get(root)??Promise.resolve();}
export function prepareDuel(root:HTMLElement,mount:Promise<void>):void{
  if(!document.fonts||typeof HTMLImageElement==='undefined')return;
  void warmSounds();
  const loading=loadingScreen('duel-loader',loungeText('対戦の準備中','Preparing your duel','대전 준비 중')),loader=loading.element;root.append(loader);
  root.classList.add('duel-preparing');root.setAttribute('aria-busy','true');
  const expired=false;
  // Network/decode runs alongside board assembly, not after the first render.
  // Only the final waitAssets owns retry UI, even when a speculative load fails.
  const common=Promise.allSettled([...duelImageUrls().map(url=>decodeAsset(url)),import('./ceremonyScene'),import('./paperDraw'),import('./spellFrame/rasterClient').then(m=>m.prepareRasterWorker())]);
  const work=(async()=>{
    await mount;
    loading.update(3,loungeText("盤面を組み立てています","Building the board","보드 준비 중"));
    while(!expired&&root.isConnected&&root.dataset.boardRendered!=="true")await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    if(expired||!root.isConnected)return;
    // The scene's first frame applies reading-board styles and hides its raster
    // fallback. Scan after that frame, not against the transitional skeleton.
    await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    if(!root.isConnected)return;
    const urls=new Set([...duelImageUrls(),...imageUrls(root)]);
    for(const el of root.querySelectorAll<HTMLElement>('[data-material]'))if(el.dataset.material)urls.add(el.dataset.material);
    await Promise.all([common,document.fonts.ready,waitAssets([...urls],loader,(done,total)=>loading.update(5+(total?done/total:1)*85,loungeText(`画像の準備 ${done} / ${total}`,`Artwork ${done} / ${total}`,`이미지 준비 ${done} / ${total}`)))]);
    loading.update(92,loungeText("盤面と演出の最終準備","Preparing the board and effects","보드와 연출 마무리 중"));
    // Decode the actual image nodes too (not only a separate preloader object).
    await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
    while(!expired&&root.isConnected&&root.dataset.sceneReady!=='true'&&root.dataset.tableState!=='fallback')await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    await import('./spellFrame/scene').then(m=>m.prepareFrameRenderer()).catch(()=>{});
    await import('./drawStock').then(m=>m.warmDrawStage(root)).catch(()=>{});
    if(!root.isConnected)return;
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
    await Promise.allSettled([prepareDuelFonts(),warmReadingAssets(),warmImages([logo,...duelImageUrls()]),warmOpening(),import('./duelScene'),import('./ceremonyScene'),import('./paperDraw'),import('./spellFrame/scene')]);
  })().finally(()=>{warming=undefined;});
}
