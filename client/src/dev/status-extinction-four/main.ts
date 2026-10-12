import './style.css';
import {families,names,studies,type Family} from './catalog';
import {Renderer,loadAssets} from './renderer';

type Mode='compare'|'detail'|'board';
let family:Family='shield',selected=0,mode:Mode='compare',time=0,playing=false,loop=true,speed=1,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,dark=false,side=0,multi=false,ready=false,disposed=false;
let renderer:Renderer,frame=0,last=0;const errors:string[]=[],timings:number[]=[];
window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const root=document.getElementById('study')!;
root.innerHTML=`<header><a class="wordmark" href="#">LORE<span>MOTION STUDIES / 12</span></a><span class="edition">12 OCT 2026 · SELECTION PREVIEW</span></header>
<main><div class="intro"><div><div class="eyebrow">SHIELD / DEW / BRAND</div><h1>消滅の12案<span>状態が消える、最後の一瞬。</span></h1><p>表示中の素材から、ひと続きの消滅へ。3種類 × 4つの動き。</p></div><div class="scope"><i></i> 比較試作<span>消滅のみ・減少演出なし</span></div></div>
<div class="toolbar"><div class="families" role="group" aria-label="状態の種類">${families.map(f=>`<button data-family="${f}" aria-pressed="${f===family}">${names[f]}<small>04</small></button>`).join('')}</div><div class="modes" role="group" aria-label="表示方法"><button data-mode="compare" aria-pressed="true">4案比較</button><button data-mode="detail" aria-pressed="false">拡大</button><button data-mode="board" aria-pressed="false">実盤面</button></div></div>
<section id="compare" class="cards"></section>
<section id="detail" hidden><div class="detail-heading"></div><canvas aria-label="選択した消滅演出の拡大"></canvas></section>
<section id="board" hidden><div class="board-tools"><label>案 <select id="variant"></select></label><label>対象 <select id="side"><option value="0">自分</option><option value="1">相手</option></select></label><label><input id="multi" type="checkbox"> 3種 × 両陣営を同時再生</label><button id="decrement">減少だけ 8 → 5</button><button id="restore">8に戻す</button><span id="board-status">盤面を準備中</span></div><iframe title="実際のLORE盤面で消滅を比較" src="about:blank"></iframe></section>
<div class="transport"><button id="play" class="primary" disabled>準備中</button><button id="reset" aria-label="先頭に戻す">↶</button><label class="scrubber"><span>TIME</span><input id="seek" type="range" min="0" max="1500" value="0" step="1" aria-label="再生位置"><output>0.00 s</output></label><label class="speed"><select id="speed" aria-label="再生速度"><option value="1">1× 通常</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><label><input id="loop" type="checkbox" checked> 反復</label></div>
<footer><div><label><input id="dark" type="checkbox"> 暗背景</label><label><input id="reduced" type="checkbox" ${reduced?'checked':''}> 動きを抑える</label></div><span id="note">現在のアイコンを使用 · 数値も表面と一緒に消滅</span><a href="/src/dev/status-extinction-four/research.html" target="_blank">制作・リサーチノート ↗</a></footer>
<div class="error" hidden role="alert"></div></main>`;
const $=<E extends HTMLElement>(q:string)=>root.querySelector<E>(q)!;
const iframe=$<HTMLIFrameElement>('iframe'),seek=$<HTMLInputElement>('#seek'),play=$<HTMLButtonElement>('#play');
const active=()=>studies.filter(s=>s.family===family);
function catalog(){
 const list=active();$('#compare').innerHTML=list.map((s,i)=>`<article class="study-card ${i===selected?'selected':''}" data-index="${i}"><div class="card-top"><span>${s.id}</span><small>${(s.duration/1000).toFixed(2)} s</small></div><button class="visual" data-replay="${i}" aria-label="${s.name}を再生"><canvas data-id="${s.id}"></canvas><span class="replay-hint">↻ REPLAY</span></button><div class="caption"><span class="english">${s.en}</span><h2>${s.name}</h2><p>${s.description}</p><button data-inspect="${i}">拡大・選択 <span>↗</span></button></div></article>`).join('');
 $<HTMLSelectElement>('#variant').innerHTML=list.map((s,i)=>`<option value="${i}">${s.id} ${s.name}</option>`).join('');$<HTMLSelectElement>('#variant').value=String(selected);$('#detail .detail-heading').innerHTML=`<span>${list[selected].id}</span><h2>${list[selected].name}</h2><p>${list[selected].description}</p>`;
}
function board(action='frame'){iframe.contentWindow?.postMessage({kind:'extinction-control',action,id:active()[selected].id,time:Math.max(0,time),side,multi,reduced,dark,active:mode==='board'},location.origin);}
function canvasDraw(canvas:HTMLCanvasElement,s:typeof studies[number],detail=false){
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(2,devicePixelRatio||1),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);
 const size=detail?Math.min(235,r.width*.49,r.height*.60):Math.min(139,r.width*.52,r.height*.61);renderer.draw(c,s,Math.max(0,time),r.width/2,r.height/2,size,size,8,reduced);
}
function draw(){
 if(!ready||disposed)return;const start=performance.now();
 if(mode==='compare')$('#compare').querySelectorAll<HTMLCanvasElement>('canvas').forEach((c,i)=>canvasDraw(c,active()[i]));
 if(mode==='detail')canvasDraw($('#detail canvas'),active()[selected],true);
 board();seek.value=String(Math.max(0,time));$('output').textContent=`${(Math.max(0,time)/1000).toFixed(2)} s`;
 timings.push(performance.now()-start);if(timings.length>600)timings.shift();
}
function updateMode(){if(mode==='board'&&!iframe.src.includes('status-extinction-board.html')){iframe.src='/status-extinction-board.html';$('#board-status').textContent='盤面を準備中';}else if(mode!=='board'&&iframe.src.includes('status-extinction-board.html')){board('dispose');iframe.src='about:blank';}for(const m of ['compare','detail','board'] as Mode[])$('#'+m).hidden=mode!==m;root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));draw();}
function setPlaying(value:boolean){playing=value&&!disposed;play.textContent=playing?'Ⅱ 一時停止':'▶ 再生';last=performance.now();cancelAnimationFrame(frame);if(playing)frame=requestAnimationFrame(tick);}
function tick(now:number){if(!playing||disposed)return;time+=Math.min(80,now-last)*speed;last=now;if(time>1850){if(loop)time=-280;else{time=1500;setPlaying(false);}}draw();if(playing)frame=requestAnimationFrame(tick);}
function restart(){time=-220;board('restore');draw();setPlaying(true);}
root.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
 if(b.dataset.family){family=b.dataset.family as Family;selected=0;catalog();root.querySelectorAll<HTMLButtonElement>('[data-family]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.family===family)));restart();}
 if(b.dataset.mode){mode=b.dataset.mode as Mode;time=0;updateMode();restart();}
 if(b.dataset.replay!==undefined){selected=Number(b.dataset.replay);catalog();restart();}
 if(b.dataset.inspect!==undefined){selected=Number(b.dataset.inspect);mode='detail';catalog();updateMode();restart();}
});
play.onclick=()=>{if(playing)setPlaying(false);else{if(time>=1500)time=-220;setPlaying(true);}};
$('#reset').onclick=()=>{setPlaying(false);time=0;board('restore');draw();};
seek.oninput=()=>{setPlaying(false);time=Number(seek.value);draw();};
$<HTMLSelectElement>('#speed').onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
$<HTMLInputElement>('#loop').onchange=e=>loop=(e.target as HTMLInputElement).checked;
$<HTMLInputElement>('#dark').onchange=e=>{dark=(e.target as HTMLInputElement).checked;document.body.classList.toggle('dark',dark);draw();};
$<HTMLInputElement>('#reduced').onchange=e=>{reduced=(e.target as HTMLInputElement).checked;restart();};
$<HTMLSelectElement>('#variant').onchange=e=>{selected=Number((e.target as HTMLSelectElement).value);catalog();restart();};
$<HTMLSelectElement>('#side').onchange=e=>{side=Number((e.target as HTMLSelectElement).value);restart();};
$<HTMLInputElement>('#multi').onchange=e=>{multi=(e.target as HTMLInputElement).checked;restart();};
$('#decrement').onclick=()=>{setPlaying(false);board('decrement');};$('#restore').onclick=()=>{setPlaying(false);time=0;board('restore');draw();};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data.kind==='extinction-ready'){$('#board-status').textContent='実盤面 · 準備完了';board();}if(e.data.kind==='extinction-error')fail(e.data.error);});
window.addEventListener('resize',()=>{board('restore');requestAnimationFrame(draw);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlaying(false);board('suspend');}});
function fail(message:string){errors.push(message);const el=$('.error');el.hidden=false;el.textContent=`描画を準備できませんでした: ${message}`;play.disabled=true;}
function dispose(){if(disposed)return;setPlaying(false);disposed=true;renderer?.dispose();board('dispose');}
window.addEventListener('pagehide',dispose,{once:true});
catalog();
void(async()=>{await document.fonts.load('600 24px LoreBoardSerif');renderer=new Renderer(await loadAssets());await renderer.warm();ready=true;play.disabled=false;setPlaying(!reduced);draw();})().catch(e=>fail(String(e)));
// Deterministic inspection API for frame capture and lifecycle QA; not a game event hook.
(window as any).extinctionQA={get state(){return{ready,disposed,family,selected,mode,time,playing,reduced,errors:[...errors],renderer:renderer?.info,drawMs:timings.slice()};},set(o:Record<string,any>){setPlaying(false);if(o.family)family=o.family;if(o.selected!==undefined)selected=o.selected;if(o.mode)mode=o.mode;if(o.time!==undefined)time=o.time;if(o.reduced!==undefined)reduced=o.reduced;if(o.side!==undefined)side=o.side;if(o.multi!==undefined)multi=o.multi;if(o.dark!==undefined){dark=o.dark;document.body.classList.toggle('dark',dark);}catalog();updateMode();draw();},play:restart,stop(){setPlaying(false);board('suspend');},dispose};
