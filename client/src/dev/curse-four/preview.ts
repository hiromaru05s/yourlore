import './style.css';
import {loadAssets,loadSkull} from './assets';import {createRenderer} from './renderer';import {designs,DURATION,stateAt,phase,type Options,type Layout,type Rect} from './model';
type Board={ready:boolean;sample:(side:number)=>Layout;sync:(o:Options)=>void;begin:(r?:Rect)=>void;restore:()=>void;suspend:()=>void;dispose:()=>void};
const finalPresentation=new URLSearchParams(location.search).get('final')==='1';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<main class="shell">
<header class="mast"><div><div class="brand">LORE / CURSE STUDIES · II</div><h1>黒魔法：カース <span>髑髏の召呪</span></h1></div><button id="play" class="primary">手札からプレイ</button></header>
<nav class="variants" aria-label="演出案">${designs.map((d,i)=>`<button data-select="${i}" aria-pressed="${i===0}"><b>0${i+1}</b><span>${d.name}<small>${d.material}</small></span></button>`).join('')}</nav>
<div class="guide"><p id="description">${designs[0].note}</p><span>手札のカースを上へドラッグ、または「手札からプレイ」</span></div>
<div class="toolbar"><div class="tabs"><button data-mode="board" aria-pressed="true">実盤面</button><button data-mode="compare" aria-pressed="false">4案比較</button></div><button id="pause">再開</button><button id="reset">手札へ戻す</button><label>速度<select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><label><input type="checkbox" id="loop">反復</label><details class="settings"><summary>表示調整</summary><div><button id="theme" aria-pressed="false">暗い盤面</button><button id="side" aria-pressed="false">相手が発動</button><button id="dual" aria-pressed="false">両者同時</button><button id="reduce" aria-pressed="false">低減モーション</button><label>髑髏の不透明度 <input id="opacity" type="range" min="15" max="55" value="45" step="1"><output id="opacityValue">45%</output></label></div></details></div>
<div class="loading" role="status">カードと髑髏の表面を準備しています…</div>
<div class="boardStage" hidden><iframe title="LORE 実盤面プレイプレビュー"></iframe><canvas aria-label="カースの実盤面エフェクト"></canvas></div>
<section class="grid">${designs.map((d,i)=>`<article class="study ${i===0?'selected':''}"><div class="stage"><canvas data-variant="${i}" aria-label="${d.name}"></canvas></div><div class="caption"><h2>0${i+1} ${d.name}</h2><p>${d.note}</p></div></article>`).join('')}</section>
<div class="transport"><span class="phase"></span><input id="seek" type="range" min="0" max="${DURATION}" step="10" value="0" aria-label="再生位置"><span class="time"></span></div>
<div class="keyframes"><button data-time="0">プレイ前</button><button data-time="450">持ち上げ</button><button data-time="1000">カース発動</button><button data-time="1950">髑髏の出現</button><button data-time="2950">呪いを生成</button><button data-time="4050">墓地へ追加</button><button data-time="5800">完了</button></div>
<p class="notice">実際の盤面・手札を使う演出プレビュー。カースを使用してマナ2を消費し、相手の墓地に呪い5枚を追加します。通常対戦への組み込み・公開は未実施。</p>
</main>`;
root.classList.toggle('boardMode',new URLSearchParams(location.search).get('view')!=='compare');
const q=<T extends HTMLElement>(s:string)=>root.querySelector<T>(s)!,canvases=[...root.querySelectorAll<HTMLCanvasElement>('.stage canvas')],boardCanvas=q<HTMLCanvasElement>('.boardStage canvas'),iframe=q<HTMLIFrameElement>('iframe'),overlay=document.createElement('canvas');
if(finalPresentation){
 root.classList.add('finalMode');
 q('.brand').textContent='LORE / CURSE · FINAL PREVIEW';
 q('h1 span').textContent='01 髑髏の五芒';
 q('.variants').innerHTML='<div class=chosen>01 髑髏の五芒 <span>最終版プレビュー</span></div>';
 q('.tabs').hidden=true;
 q('#description').textContent='墓地と同じ位置に半透明の髑髏が浮かび、黒い光を帯びた呪い5枚が扇状に生まれる。';
}
let ready=false,dead=false,renderer:ReturnType<typeof createRenderer>,ms=0,variant=0,side=0,dark=false,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,concurrent=false,mode='compare',speed=1,skullOpacity=.45,running=false,raf=0,last=0,gap=0,board:Board|undefined,generation=0;
function options(v=variant):Options{return{variant:v,ms,side,dark,reduced,concurrent,skullOpacity};}
function draw(){
 if(!ready||dead||(finalPresentation&&mode!=='board'))return;
 try{
  if(mode==='board'){
   if(!board?.ready)return;
   const o=options();board.sync(o);renderer.draw(boardCanvas,{...o,hideSource:true,pixelRatio:Math.min(2,devicePixelRatio),board:board.sample(side)});
   if(concurrent){if(overlay.width!==boardCanvas.width||overlay.height!==boardCanvas.height){overlay.width=boardCanvas.width;overlay.height=boardCanvas.height;}renderer.draw(overlay,{...o,side:1-side,hideSource:true,pixelRatio:Math.min(2,devicePixelRatio),board:board.sample(1-side)});const ctx=boardCanvas.getContext('2d')!;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(overlay,0,0);}
  }else canvases.forEach((c,i)=>renderer.draw(c,options(i)));
  q<HTMLInputElement>('#seek').value=String(ms);q('.time').textContent=`${(ms/1000).toFixed(2)} / ${(DURATION/1000).toFixed(2)} s`;q('.phase').textContent=phase(ms);q('#pause').textContent=running?'一時停止':'再開';root.dataset.running=String(running);
  root.dataset.status=JSON.stringify({ms,mode,variant,side,reduced,concurrent,state:stateAt(options()),memory:renderer.memory,raf:raf?1:0});
 }catch(e){error(e);}
}
function resize(){for(const c of [...canvases,boardCanvas]){const r=c.getBoundingClientRect(),d=c===boardCanvas?Math.min(2,devicePixelRatio):Math.min(1.4,devicePixelRatio);if(r.width&&r.height){const w=Math.round(r.width*d),h=Math.round(r.height*d);if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;}}draw();}
function stop(){running=false;cancelAnimationFrame(raf);raf=0;}
function tick(now:number){if(!running||dead)return;const dt=now-last;last=now;if(ms>=DURATION){if(q<HTMLInputElement>('#loop').checked){gap+=dt;if(gap>900){ms=0;gap=0;board?.begin();}}else stop();}else ms=Math.min(DURATION,ms+dt*speed);draw();if(running)raf=requestAnimationFrame(tick);}
function play(t=0,origin?:Rect){if(!ready||(mode==='board'&&!board?.ready))return;stop();if(t===0)board?.begin(origin);ms=t;gap=0;running=true;last=performance.now();draw();raf=requestAnimationFrame(tick);}
function seek(t:number){stop();ms=Math.max(0,Math.min(DURATION,t));if(ms===0)board?.begin();draw();}
function select(i:number,auto=true){variant=finalPresentation?0:Math.max(0,Math.min(3,i));root.querySelectorAll<HTMLElement>('[data-select]').forEach(e=>e.setAttribute('aria-pressed',String(Number(e.dataset.select)===variant)));q('#description').textContent=designs[variant].note;if(auto)play();resize();}
async function setMode(m:string){
 if(finalPresentation)m='board';
 if(!['compare','board'].includes(m))return;const url=new URL(location.href);url.searchParams.set('view',m);history.replaceState(null,'',url);if(mode===m)return;
 stop();mode=m;const g=++generation;
 if(m!=='board'){concurrent=false;q('#dual').setAttribute('aria-pressed','false');board?.dispose();board=undefined;iframe.removeAttribute('src');}
 root.classList.toggle('boardMode',m==='board');q('.boardStage').hidden=m!=='board';root.querySelectorAll<HTMLElement>('[data-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.mode===m)));q('#play').textContent=m==='compare'?'4案を手札から再生':'手札からプレイ';
 if(m==='board'){
  q('.loading').textContent='実盤面を準備しています…';q('.loading').hidden=false;iframe.src='/curse-four.html?board=1';
  for(let i=0;i<900;i++){if(g!==generation||dead)return;board=(iframe.contentWindow as unknown as {curseBoard?:Board}).curseBoard;if(board?.ready)break;await new Promise(r=>setTimeout(r,100));}
  if(!board?.ready)throw Error('盤面を初期化できませんでした。再読み込みしてください。');
 }
 ms=0;q('.loading').hidden=true;resize();
}
function configure(o:Partial<Options>){if(o.side!==undefined)side=o.side;if(o.dark!==undefined)dark=o.dark;if(o.reduced!==undefined)reduced=o.reduced;if(o.concurrent!==undefined)concurrent=o.concurrent;if(o.skullOpacity!==undefined)skullOpacity=o.skullOpacity;if(o.variant!==undefined)select(o.variant,false);if(o.ms!==undefined)ms=o.ms;for(const [id,value] of [['side',!!side],['theme',dark],['reduce',reduced],['dual',concurrent]] as const)q('#'+id).setAttribute('aria-pressed',String(value));stop();draw();}
root.querySelectorAll<HTMLElement>('[data-time]').forEach(e=>e.onclick=()=>seek(Number(e.dataset.time)));
q('#play').onclick=()=>play();q('#pause').onclick=()=>{if(running){stop();draw();}else play(ms>=DURATION?0:ms);};q('#reset').onclick=()=>seek(0);
q<HTMLInputElement>('#seek').oninput=e=>seek(Number((e.target as HTMLInputElement).value));q<HTMLSelectElement>('#speed').onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
q<HTMLInputElement>('#opacity').oninput=e=>{skullOpacity=Number((e.target as HTMLInputElement).value)/100;q('#opacityValue').textContent=`${Math.round(skullOpacity*100)}%`;draw();};
q('#theme').onclick=()=>configure({dark:!dark});q('#side').onclick=()=>{configure({side:1-side});seek(0);};q('#reduce').onclick=()=>configure({reduced:!reduced});q('#dual').onclick=()=>void(async()=>{if(mode!=='board')await setMode('board');configure({concurrent:!concurrent});seek(0);})().catch(error);
root.querySelectorAll<HTMLElement>('[data-select]').forEach(e=>e.onclick=()=>select(Number(e.dataset.select)));root.querySelectorAll<HTMLElement>('[data-mode]').forEach(e=>e.onclick=()=>void setMode(e.dataset.mode!).catch(error));
function error(e:unknown){stop();q('.loading').hidden=false;q('.loading').textContent=String(e);console.error(e);}
const ro=new ResizeObserver(resize);ro.observe(root);window.addEventListener('resize',resize);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===iframe.contentWindow&&e.data?.type==='curse-play'&&!running){side=0;configure({side:0,concurrent:false});play(0,e.data.origin);}});
function visibility(){if(document.hidden){stop();board?.suspend();}else resize();}document.addEventListener('visibilitychange',visibility);
const media=matchMedia('(prefers-reduced-motion:reduce)'),motionChanged=(e:MediaQueryListEvent)=>configure({reduced:e.matches});media.addEventListener('change',motionChanged);
function dispose(){if(dead)return;dead=true;++generation;stop();ro.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motionChanged);board?.dispose();renderer?.dispose();}window.addEventListener('pagehide',dispose,{once:true});
try{
 const [faces,skull]=await Promise.all([loadAssets(),loadSkull()]);renderer=createRenderer(faces,skull);document.title=finalPresentation?'LORE — カース / 01 最終版プレビュー':'LORE — カース / 髑髏の召呪 4案';ready=true;q('.loading').hidden=true;resize();configure({reduced});
 Object.assign(window,{curseLab:{get ready(){return ready&&(mode!=='board'||!!board?.ready);},get running(){return running;},get state(){return stateAt(options());},get options(){return options();},get memory(){return renderer.memory;},seek,play,stop,setMode,select,configure,redraw:draw,dispose}});
 await setMode(new URLSearchParams(location.search).get('view')==='compare'?'compare':'board');
}catch(e){error(e);}
