import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/passives.css';import '../../styles/presentation.css';
import {cardEl} from '../../ui/cardView';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {ReadyStudy} from './effect';import {designs,type Remaining} from './designs';import './style.css';
setLang('ja');
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="lab"><header class="heading"><div><p class="eyebrow">LORE / MOTION STUDIES  ·  12 OCT 2026</p><h1>二刀流の、静かな予兆。</h1><p class="intro">同じカード、同じ大きさ。4つの待機演出を見比べる。</p></div><span class="edition">04 STUDIES<span>選定用プレビュー</span></span></header>
<nav class="toolbar" aria-label="プレビュー操作"><div class="switch"><button data-mode="compare" aria-pressed="true">4案を比較</button><button data-mode="board" aria-pressed="false">実盤面で見る</button></div><label>カード <select id="card"><option value="NGA4">剣鬼</option><option value="DRAGON_RIDER">ドラゴンライダー</option><option value="ANTIQUE_DK">アンティークドラゴンナイト</option></select></label><button id="play" aria-pressed="true">一時停止</button><label>速度 <select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><button id="theme">暗い背景</button><label class="check"><input id="reduced" type="checkbox">動きを減らす</label></nav>
<section class="statebar"><div class="switch" id="states"><button data-count="2" aria-pressed="true">残り2回</button><button data-count="1" aria-pressed="false">残り1回</button><button data-count="0" aria-pressed="false">攻撃終了</button></div><p>2回は各案の金色 → 1回は通常の赤橙 → 終了で消灯</p></section>
<section id="compare" class="studies"><article class="study reference"><div class="title"><span>REF</span><h2>現行の待機</h2></div><div class="stage" data-index="-1"></div><p class="note">赤橙の輪郭と、青い山形。</p><p class="detail">通常モンスター / 比較基準</p></article>${designs.map((d,i)=>`<article class="study"><div class="title"><span>0${i+1}</span><h2>${d.name}</h2></div><div class="stage" data-index="${i}"></div><p class="note">${d.note}</p><p class="detail">${d.detail}</p><button class="inspect" data-inspect="${i}">この案を実盤面へ <span>↗</span></button></article>`).join('')}</section>
<section id="board" hidden><div class="board-controls"><label>演出 <select id="variant">${designs.map((d,i)=>`<option value="${i}">0${i+1} ${d.name}</option>`).join('')}</select></label><label>陣営 <select id="side"><option value="0">自分側</option><option value="1">相手側</option></select></label><label class="check"><input type="checkbox" id="multi">3枚同時</label><button id="attack">1回攻撃</button><button id="reset">2回に戻す</button><span id="board-status">盤面を準備中…</span></div><div class="board-frame"></div><p class="board-note">中央のカードをクリックしても攻撃できます。左の通常モンスターと比較できます。</p></section>
<footer><span id="status">画像を準備中…</span><label class="scrub">時間 <input id="seek" type="range" min="0" max="10200" value="0" step="10"><output id="time">0.00 s</output></label><span class="legend">細い金縁 / 絵柄を保持 / 音なし</span></footer></main>`;
const root=document.createElement('div');root.className='study-actors';document.body.append(root);
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const media=matchMedia('(prefers-reduced-motion:reduce)');
let studies:ReadyStudy[]=[],remaining:Remaining=2,variant=0,side=0,multi=false,mode='compare',dark=false,reduced=media.matches,playing=!reduced,ms=0,speed=1,raf=0,last=0,ready=false,card='NGA4',frame:HTMLIFrameElement|undefined,generation=0,disposed=false;
function post(kind='dual-ready-control'){frame?.contentWindow?.postMessage({kind,ms,remaining,variant,side,multi,dark,reduced,card},location.origin);}
function draw(){if(disposed)return;for(const s of studies){if(mode==='compare')s.paint(ms,reduced);else s.restore();}if(mode==='board')post();$('#time').textContent=`${(ms/1000).toFixed(2)} s`;($<HTMLInputElement>('#seek')).value=String(ms%10200);}
function tick(now:number){raf=0;if(document.hidden||!playing||reduced||disposed)return;ms+=Math.min(50,now-last)*speed;last=now;draw();raf=requestAnimationFrame(tick);}
function schedule(){cancelAnimationFrame(raf);raf=0;last=performance.now();if(playing&&!reduced&&!document.hidden)raf=requestAnimationFrame(tick);}
function controls(){for(const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));for(const b of document.querySelectorAll<HTMLButtonElement>('[data-count]'))b.setAttribute('aria-pressed',String(Number(b.dataset.count)===remaining));$('#play').textContent=playing?'一時停止':'再生';$('#play').setAttribute('aria-pressed',String(playing));$<HTMLInputElement>('#reduced').checked=reduced;}
async function rebuild(){const token=++generation;ready=false;studies.forEach(s=>s.dispose());studies=[];for(const stage of document.querySelectorAll<HTMLElement>('.stage')){stage.replaceChildren();const n=cardEl({...DB[card],uid:`dual-study-${stage.dataset.index}`},{field:true});n.style.setProperty('--field-card-size','144px');n.classList.add('study-source');stage.append(n);}
 await document.fonts.ready;await Promise.all([...document.querySelectorAll<HTMLImageElement>('.stage img')].map(i=>i.decode().catch(()=>{})));if(token!==generation||disposed)return;
 for(const stage of document.querySelectorAll<HTMLElement>('.stage')){const s=new ReadyStudy(stage.firstElementChild as HTMLElement,root);s.baseline=stage.dataset.index==='-1';s.variant=Math.max(0,Number(stage.dataset.index));s.remaining=s.baseline?(remaining===0?0:1):remaining;studies.push(s);}ready=true;$('#status').textContent='4案を連続再生中 · カードと輪郭の動きを比較';draw();schedule();}
function setCount(n:Remaining){remaining=n;studies.forEach(s=>s.remaining=s.baseline?(n===0?0:1):n);controls();draw();}
function setMode(next:string){mode=next;$('#compare').hidden=mode!=='compare';$('#board').hidden=mode!=='board';if(mode==='board'&&!frame){frame=document.createElement('iframe');frame.title='実際のLORE盤面で待機演出を比較';frame.src='/dual-ready-board.html';$('.board-frame').append(frame);}else if(mode==='compare'&&frame){post('dual-ready-dispose');frame.remove();frame=undefined;}
 requestAnimationFrame(()=>{studies.forEach(s=>s.measure());draw();});controls();}
function setReduced(value:boolean){reduced=value;playing=!value;controls();draw();schedule();}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))b.onclick=()=>setMode(b.dataset.mode!);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-count]'))b.onclick=()=>setCount(Number(b.dataset.count) as Remaining);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-inspect]'))b.onclick=()=>{variant=Number(b.dataset.inspect);$<HTMLSelectElement>('#variant').value=String(variant);setMode('board');};
$('#play').onclick=()=>{if(reduced)setReduced(false);else {playing=!playing;controls();schedule();}};
$('#theme').onclick=()=>{dark=!dark;document.body.classList.toggle('dark',dark);$('#theme').textContent=dark?'白い背景':'暗い背景';draw();};
$<HTMLSelectElement>('#speed').onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
$<HTMLSelectElement>('#card').onchange=e=>{card=(e.target as HTMLSelectElement).value;void rebuild();post();};
$<HTMLInputElement>('#seek').oninput=e=>{playing=false;ms=Number((e.target as HTMLInputElement).value);controls();schedule();draw();};
$<HTMLInputElement>('#reduced').onchange=e=>setReduced((e.target as HTMLInputElement).checked);
$<HTMLSelectElement>('#variant').onchange=e=>{variant=Number((e.target as HTMLSelectElement).value);draw();};
$<HTMLSelectElement>('#side').onchange=e=>{side=Number((e.target as HTMLSelectElement).value);draw();};
$<HTMLInputElement>('#multi').onchange=e=>{multi=(e.target as HTMLInputElement).checked;draw();};
$('#attack').onclick=()=>post('dual-ready-attack');$('#reset').onclick=()=>setCount(2);
const measure=()=>{studies.forEach(s=>s.measure());draw();};window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});media.addEventListener('change',e=>setReduced(e.matches));
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;if(e.data?.kind==='dual-ready-board-ready'){$('#board-status').textContent='盤面の準備完了';draw();}if(e.data?.kind==='dual-ready-count')setCount(e.data.remaining);if(e.data?.kind==='dual-ready-error')$('#board-status').textContent=e.data.error;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){studies.forEach(s=>s.restore());post('dual-ready-suspend');cancelAnimationFrame(raf);raf=0;}else {measure();schedule();}});
function dispose(){disposed=true;cancelAnimationFrame(raf);studies.forEach(s=>s.dispose());studies=[];post('dual-ready-dispose');frame?.remove();root.remove();}
window.addEventListener('pagehide',dispose,{once:true});
(window as any).dualLab={get state(){return{ready,remaining,variant,side,multi,mode,dark,reduced,playing,ms,actors:studies.length,paintCount:studies.reduce((n,s)=>n+s.paintCount,0)};},setMode,setCount,setReduced,seek:(t:number)=>{playing=false;ms=t;controls();schedule();draw();},play:()=>{playing=true;schedule();},setVariant:(v:number)=>{variant=v;draw();},setSide:(s:number)=>{side=s;draw();},setMulti:(v:boolean)=>{multi=v;draw();},setCard:async(v:string)=>{card=v;await rebuild();post();},setDark:(v:boolean)=>{dark=v;document.body.classList.toggle('dark',dark);draw();},dispose};controls();void rebuild();

if(new URLSearchParams(location.search).has('qa'))void import('./qa').then(m=>m.run());
