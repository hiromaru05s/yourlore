import {designs,MAX_DURATION,phase,type Variant} from './catalog';
import './board-review.css';

const requested=Number(new URLSearchParams(location.search).get('variant')||0);
let variant:Variant=(Number.isInteger(requested)?Math.max(0,Math.min(4,requested)):0) as Variant;
let ready=false,playing=false,ms=0,raf=0,last=0,disposed=false;
const root=document.getElementById('app')!;
root.innerHTML=`<header class="review-controls"><div class="review-title"><strong>融合召喚 · 実盤面</strong><a href="/dragon-spiral-five.html">造形の比較へ戻る</a></div><div class="review-row"><label>演出 <select id="variant">${designs.map((d,i)=>`<option value="${i}">0${i+1} ${d.name}</option>`).join('')}</select></label><label>融合先 <select id="result"><option value="DRAGON_RIDER">ドラゴンライダー</option><option value="ANTIQUE_DK">アンティークドラゴンナイト</option></select></label><label>陣営 <select id="side"><option value="0">自分側</option><option value="1">相手側</option><option value="both">両側同時</option></select></label><button id="play" disabled>融合を再生</button><button id="stop" disabled>中断・復元</button><label>速度 <select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><label><input id="loop" type="checkbox">連続再生</label><label><input id="reduced" type="checkbox">動きを抑える</label></div><div class="review-row timeline"><input id="time" type="range" min="0" max="${MAX_DURATION}" value="0" aria-label="盤面のアニメーション時刻" disabled><output id="status" aria-live="off">盤面を準備中…</output><span>手札のドラゴンからも再生できます</span></div></header><iframe id="board" title="融合召喚の実盤面" src="/dragon-spiral-five.html?board"></iframe>`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const board=$<HTMLIFrameElement>('board'),variantSelect=$<HTMLSelectElement>('variant'),result=$<HTMLSelectElement>('result'),side=$<HTMLSelectElement>('side'),speed=$<HTMLSelectElement>('speed'),slider=$<HTMLInputElement>('time'),reduced=$<HTMLInputElement>('reduced');
variantSelect.value=String(variant);reduced.checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
function send(){if(!ready||disposed)return;board.contentWindow?.postMessage({kind:'dragon-fusion-control',variant,result:result.value,ms,side:side.value==='1'?1:0,multi:side.value==='both',reduced:reduced.checked,dark:false},location.origin);slider.value=String(ms);$('status').textContent=`${phase(variant,ms)} · ${(ms/1000).toFixed(2)}秒`;}
function stop(){playing=false;cancelAnimationFrame(raf);raf=0;ms=0;send();}
function tick(now:number){raf=0;if(!playing||disposed||document.hidden)return;ms=Math.min(MAX_DURATION,ms+(now-last)*Number(speed.value));last=now;send();if(ms>=MAX_DURATION){if($<HTMLInputElement>('loop').checked)ms=0;else playing=false;}if(playing)raf=requestAnimationFrame(tick);}
function play(){if(!ready||disposed)return;cancelAnimationFrame(raf);ms=0;playing=true;send();last=performance.now();raf=requestAnimationFrame(tick);}
$('play').onclick=play;$('stop').onclick=stop;
variantSelect.onchange=()=>{variant=Number(variantSelect.value) as Variant;const url=new URL(location.href);url.searchParams.set('variant',String(variant));history.replaceState(null,'',url);stop();};
result.onchange=side.onchange=reduced.onchange=stop;
slider.oninput=()=>{playing=false;cancelAnimationFrame(raf);raf=0;ms=Number(slider.value);send();};
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==board.contentWindow)return;
  if(event.data.kind==='dragon-fusion-ready'){ready=true;for(const id of ['play','stop','time'])($<HTMLButtonElement|HTMLInputElement>(id)).disabled=false;send();}
  if(event.data.kind==='dragon-fusion-play')play();
  if(event.data.kind==='dragon-fusion-error'){stop();ready=false;$('status').textContent=String(event.data.error);$('status').classList.add('error');}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{disposed=true;playing=false;cancelAnimationFrame(raf);},{once:true});
