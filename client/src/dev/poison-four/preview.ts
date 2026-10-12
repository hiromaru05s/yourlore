import './style.css';
import {setLang} from '../../i18n';import {readySprites} from './assets';setLang('ja');
import {IDS,names,studies,DURATION,type CardId} from './catalog';import {surface} from './surface';import {render,setCameraAngle,disposeRenderer,rendererState} from './renderer';
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
let id:CardId='POISON_MASTER',variant=0,ms=0,running=false,loop=false,speed=1,raf=0,last=0,mode='compare',boardReady=false;
const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
const faces=new Map<CardId,HTMLCanvasElement>();
document.getElementById('app')!.innerHTML=`<header><small>LORE / SUMMON STUDIES · HORIZONTAL REVISION</small><h1>毒と菌の召喚</h1><p>カードの面を盤面に伏せた召喚。液体は面へ落ち、菌はその面から立ち上がります。</p></header>
<div class="controls"><select id="card" aria-label="カード">${IDS.map(x=>`<option value="${x}">${names[x]}</option>`).join('')}</select><select id="mode" aria-label="表示"><option value="compare">4案比較</option><option value="solo">拡大</option><option value="board">実盤面</option></select><select id="camera" aria-label="視点"><option value="oblique">斜め上から</option><option value="side">横から接地を見る</option><option value="top">真上から</option></select><select id="variant" aria-label="案"></select><button id="play">再生</button><button id="pause">一時停止</button><button id="reset">停止・戻す</button><select id="speed" aria-label="再生速度"><option value="1">1倍速</option><option value=".5">0.5倍速</option><option value=".25">0.25倍速</option></select><label><input type="checkbox" id="loop">連続</label><label><input type="checkbox" id="light">白背景</label><label><input type="checkbox" id="reduced" ${reduced?'checked':''}>動きを低減</label></div>
<div class="controls"><input id="scrub" aria-label="再生時刻" type="range" min="0" max="2800" value="0"><output id="time">0.00s</output></div>
<div class="controls" id="board-controls"><select id="side" aria-label="陣営"><option value="0">自分側</option><option value="1">相手側</option></select><button id="concurrent">3体同時</button><span>手札のカードをクリックして召喚。案は上の選択で切り替え。</span></div>
<main class="grid">${[0,1,2,3].map(v=>`<article class="study ${v===0?'selected':''}"><div class="stage"><canvas width="720" height="660" aria-label="案${v+1}"></canvas></div><div class="caption"><h2></h2><button data-variant="${v}">この案を再生</button></div><p></p></article>`).join('')}</main><div class="board-wrap"><iframe title="LORE実盤面での召喚比較"></iframe></div>
<div class="note">比較試作 / 選定前・通常ゲームへの組み込み前。腐敗カウンター付与は別イベントです。<br>造形の参考：<a href="https://news.blizzard.com/en-gb/article/22552047/developer-insights-the-art-behind-the-science" target="_blank" rel="noreferrer">Hearthstone制作解説</a> · <a href="https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/" target="_blank" rel="noreferrer">Riotの可読性指針</a> · <a href="https://arxiv.org/abs/1010.3454" target="_blank" rel="noreferrer">胞子射出の研究</a><p id="error" role="alert"></p></div><div class="loading">カード表面を準備しています…</div>`;
const canvases=[...document.querySelectorAll('canvas')],iframe=$<HTMLIFrameElement>('iframe');
function labels(){const options=studies[id];$<HTMLSelectElement>('#variant').innerHTML=options.map((x,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} ${x.name}</option>`).join('');$<HTMLSelectElement>('#variant').value=String(variant);document.querySelectorAll('.study').forEach((el,i)=>{el.querySelector('h2')!.innerHTML=`<span>0${i+1}</span>${options[i].name}`;el.querySelector('p')!.textContent=options[i].desc;el.classList.toggle('selected',i===variant);});}
function send(kind='poison-control'){if(boardReady)iframe.contentWindow?.postMessage({kind,id,variant,ms,reduced,side:Number($<HTMLSelectElement>('#side').value),dark:!$<HTMLInputElement>('#light').checked},location.origin);}
function draw(){if(mode==='board'){send();}else{const face=faces.get(id);if(face)canvases.forEach((canvas,i)=>{if(mode==='solo'&&i!==variant)return;render(canvas.getContext('2d')!,face,id,i,ms,canvas.width,canvas.height,reduced);});}$<HTMLInputElement>('#scrub').value=String(ms);$('#time').textContent=`${(ms/1000).toFixed(2)}s`;}
function pause(){running=false;cancelAnimationFrame(raf);raf=0;}
function step(now:number){if(!running)return;ms+=Math.min(80,now-last)*speed;last=now;if(ms>DURATION){if(loop)ms=0;else{ms=DURATION;pause();}}draw();if(running)raf=requestAnimationFrame(step);}
function play(){pause();ms=0;draw();running=true;last=performance.now();raf=requestAnimationFrame(step);}
$<HTMLSelectElement>('#camera').onchange=e=>{setCameraAngle((e.target as HTMLSelectElement).value as 'oblique'|'side'|'top');draw();};
$('#play').onclick=play;$('#pause').onclick=pause;$('#reset').onclick=()=>{pause();ms=DURATION;draw();send('poison-suspend');};
$<HTMLSelectElement>('#card').onchange=e=>{id=(e.target as HTMLSelectElement).value as CardId;pause();ms=0;labels();draw();};
$<HTMLSelectElement>('#mode').onchange=e=>{pause();mode=(e.target as HTMLSelectElement).value;$<HTMLSelectElement>('#camera').hidden=mode==='board';document.body.classList.toggle('board-view',mode==='board');document.body.classList.toggle('solo',mode==='solo');if(mode==='board'&&!iframe.src)iframe.src='/poison-four.html?board';if(mode!=='board')send('poison-suspend');draw();};
$<HTMLSelectElement>('#variant').onchange=e=>{variant=Number((e.target as HTMLSelectElement).value);labels();draw();};
$<HTMLSelectElement>('#speed').onchange=e=>{speed=Number((e.target as HTMLSelectElement).value);};
$<HTMLInputElement>('#scrub').oninput=e=>{pause();ms=Number((e.target as HTMLInputElement).value);draw();};
$<HTMLInputElement>('#loop').onchange=e=>{loop=(e.target as HTMLInputElement).checked;};
$<HTMLInputElement>('#light').onchange=e=>{document.body.classList.toggle('light',(e.target as HTMLInputElement).checked);draw();};
$<HTMLInputElement>('#reduced').onchange=e=>{reduced=(e.target as HTMLInputElement).checked;draw();};
$<HTMLSelectElement>('#side').onchange=()=>draw();$('#concurrent').onclick=()=>{send('poison-concurrent');play();};
document.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(el=>el.onclick=()=>{variant=Number(el.dataset.variant);labels();play();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data.kind==='poison-board'){boardReady=!!e.data.ready;if(e.data.error)$('#error').textContent=e.data.error;draw();}if(e.data.kind==='poison-play')play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();send('poison-suspend');}});window.addEventListener('pagehide',()=>{pause();send('poison-dispose');faces.clear();disposeRenderer();},{once:true});
motion.addEventListener('change',e=>{reduced=e.matches;$<HTMLInputElement>('#reduced').checked=reduced;draw();});
(window as any).poisonPreview={get state(){return{id,variant,ms,running,reduced,mode,boardReady,renderer:rendererState()};},seek(t:number){pause();ms=Math.max(0,Math.min(DURATION,t));draw();},play,pause};
void(async()=>{await readySprites;for(const card of IDS)faces.set(card,await surface(card,true));labels();draw();$('.loading').hidden=true;})().catch(e=>{$('.loading').hidden=true;$('#error').textContent=String(e);});
