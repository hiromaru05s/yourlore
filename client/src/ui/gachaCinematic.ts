import {mountRewardStage} from './gachaRewardStage';
import type {CollectionReward} from '../shared/collection';
import {loungeText as l} from './loungeText';
import type {LibraryScene} from './gachaAzure/scene';
import {DURATION} from './gachaAzure/timing';
import '../styles/gachaCinematic.css';
export interface GachaCinematicOptions {count:number;rewards?:CollectionReward[];edition:'astral'|'ivory'|'crimson';onClose:()=>void}
/** Selected Azure Wake presentation. Receives server-confirmed rewards; never draws, spends or grants items. */
export function openGachaCinematic(options:GachaCinematicOptions):()=>void{
 const dialog=document.createElement('dialog');dialog.className='gacha-cinematic';dialog.dataset.selection='azure-wake-01';dialog.dataset.rewards=String(!!options.rewards?.length);dialog.setAttribute('aria-label',l('ガチャ演出','Gacha animation','뽑기 연출'));
 dialog.innerHTML=`<canvas aria-label="${l('ビブリオンから届く魔導書','A grimoire from Biblion','비블리온에서 온 마도서')}"></canvas><header><span>BIBLION</span><button data-close aria-label="${l('閉じる','Close','닫기')}">×</button></header><div class="gacha-cinematic-loading" role="status">${l('魔導書を準備しています…','Preparing the grimoire…','마도서를 준비하고 있습니다…')}</div><div class="gacha-cinematic-result" hidden><small>${options.rewards?l('抽選結果','DRAW RESULTS','추첨 결과'):l('演出サンプル','ANIMATION SAMPLE','연출 샘플')}</small><h2>${options.count===10?l('10の出会い','Ten encounters','열 번의 만남'):l('記録との出会い','An encounter with a record','기록과의 만남')}</h2></div><footer><p>${options.rewards?l('抽選結果は保存済みです','Your results have been saved','추첨 결과는 저장되었습니다'):l('演出プレビュー · 抽選・消費なし','Animation preview · No draw or Shard spend','연출 미리보기 · 추첨·소모 없음')}</p><div><button data-skip disabled>${l('結果へ','Skip to results','결과 보기')}</button><button data-done hidden>${options.rewards?l('獲得結果を見る','View results','획득 결과 보기'):l('戻る','Back','돌아가기')}</button></div></footer>`;
 document.body.append(dialog);dialog.showModal();
 const canvas=dialog.querySelector('canvas')!,loading=dialog.querySelector<HTMLElement>('.gacha-cinematic-loading')!,result=dialog.querySelector<HTMLElement>('.gacha-cinematic-result')!;
 const skip=dialog.querySelector<HTMLButtonElement>('[data-skip]')!,done=dialog.querySelector<HTMLButtonElement>('[data-done]')!;
 const events=new AbortController(),media=matchMedia('(prefers-reduced-motion: reduce)');
 let stopRewards:(()=>void)|undefined,retiringScene:LibraryScene|undefined,bridgeTimer:ReturnType<typeof setTimeout>|undefined;
 let scene:LibraryScene|undefined,dead=false,ready=false,raf=0,seconds=0,last=performance.now(),ended=false;
 const finishUI=()=>{if(ended)return;ended=true;cancelAnimationFrame(raf);loading.hidden=true;result.hidden=false;skip.hidden=true;done.hidden=false;dialog.dataset.phase='result';dialog.dataset.ready='true';if(options.rewards?.length){const host=document.createElement('div');host.className='gacha-cinematic-rewards';dialog.append(host);stopRewards=mountRewardStage(host,options.rewards);retiringScene=scene;scene=undefined;bridgeTimer=setTimeout(()=>{retiringScene?.dispose();retiringScene=undefined;dialog.dataset.resultSettled='true';},media.matches?0:750);done.focus({preventScroll:true});}};
 const render=()=>{if(!scene||!ready||dead)return;scene.render(seconds,'SSR',media.matches);dialog.dataset.time=seconds.toFixed(2);if(seconds>=(options.rewards?15.05:DURATION)||media.matches)finishUI();};
 const resize=()=>{if(!scene||dead)return;const r=dialog.getBoundingClientRect();scene.resize(Math.max(1,r.width),Math.max(1,r.height));render();};
 const observer=new ResizeObserver(resize);observer.observe(dialog);
 function frame(now:number){if(dead||!ready||ended)return;const delta=Math.min(.08,(now-last)/1000);last=now;if(!document.hidden){seconds=Math.min(DURATION,seconds+delta);render();}if(!ended)raf=requestAnimationFrame(frame);}
 const start=()=>{if(!ready||dead)return;cancelAnimationFrame(raf);seconds=media.matches?DURATION:0;ended=false;result.hidden=true;skip.hidden=false;done.hidden=true;dialog.dataset.phase='animation';last=performance.now();render();if(!ended)raf=requestAnimationFrame(frame);};
 skip.disabled=false;skip.onclick=()=>{cancelAnimationFrame(raf);finishUI();};done.onclick=options.onClose;dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick=options.onClose;
 dialog.addEventListener('cancel',e=>{e.preventDefault();options.onClose();},{signal:events.signal});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);finishUI();},{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{last=performance.now();},{signal:events.signal});
 media.addEventListener('change',()=>{if(ready&&media.matches){cancelAnimationFrame(raf);seconds=DURATION;render();}},{signal:events.signal});
 if(media.matches&&options.rewards){finishUI();}
 else void import('./gachaAzure/scene').then(async ({LibraryScene})=>{
  if(dead||ended)return;scene=new LibraryScene(canvas);scene.count=options.count===10?10:1;scene.featuredSleeve=options.edition;resize();await scene.ready;if(dead||ended)return;
  scene.hideRewardModels=!!options.rewards;scene.setVariant(0);scene.count=options.count===10?10:1;scene.rewardKind='sleeve';resize();ready=true;loading.hidden=true;skip.disabled=false;dialog.dataset.ready='true';start();
 }).catch(error=>{scene?.dispose();if(dead||ended)return;loading.textContent=l('演出を読み込めませんでした。閉じて再度お試しください。','The animation could not load. Close and try again.','연출을 불러오지 못했습니다. 닫고 다시 시도해 주세요.');done.hidden=false;done.textContent=l('獲得結果を見る','View results','획득 결과 보기');dialog.dataset.phase='error';console.error('Gacha animation failed',error);});
 return ()=>{if(dead)return;dead=true;cancelAnimationFrame(raf);events.abort();observer.disconnect();clearTimeout(bridgeTimer);stopRewards?.();retiringScene?.dispose();scene?.dispose();dialog.close();dialog.remove();};
}
