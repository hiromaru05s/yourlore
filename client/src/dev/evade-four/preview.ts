import {DB} from '../../shared/cards';
import {surface} from './surface';
import {Renderer,type View} from './renderer';
import {cards,designs,DURATION,CYCLE,phase} from './catalog';
import './style.css';
const root=document.getElementById('app')!;
let renderer:Renderer;try{renderer=new Renderer();}catch{root.textContent='WebGLを利用できません。ハードウェアアクセラレーションが有効なブラウザで開いてください。';throw Error('WebGL unavailable');}
let ready=false,disposed=false,mode='grid',variant=0,ms=0,speed=1,playing=false,loop=true,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,dark=false,side=0,multi=false,success=true,raf=0,last=0,hold=0,angle:View='oblique';
let id:string=cards[0];const faces=new Map<string,HTMLCanvasElement>(),timings:number[]=[];
root.innerHTML=`<main><header><div class="eyebrow">LORE / EVASION STUDIES / 12 OCT 2026</div><div class="heading"><h1>回避、その一拍。</h1><span class="badge">4 MOTIONS · 700ms</span></div><p class="intro">攻撃が動き出す前に、かわす意志を伝える。<br>同じモンスター・同じ時間で、4つの身のこなしを比較。</p></header>
<nav class="toolbar" aria-label="表示切り替え"><div class="modes"><button data-mode="grid" class="active">4案を比較</button><button data-mode="detail">1案を拡大</button><button data-mode="board">実盤面</button><button data-mode="reference">参照と設計</button></div><div class="settings"><select id="card" aria-label="モンスター">${cards.map(k=>`<option value="${k}">${DB[k].nameJa}</option>`).join('')}</select><select id="angle" aria-label="見る角度"><option value="oblique">盤面の角度</option><option value="top">真上</option><option value="low">低い角度</option></select><button id="theme">白い盤面</button></div></nav>
<div class="status"><span id="status">カード表面を読み込み中…</span><span class="local">選定用プレビュー</span></div>
<section id="grid" class="grid">${designs.map((d,i)=>`<article><div class="study-heading"><span class="number">0${i+1}</span><div><h2>${d.name}</h2><small>${d.en}</small></div><button data-zoom="${i}" aria-label="${d.name}を拡大">↗</button></div><div class="viewport"><canvas data-v="${i}" aria-label="${d.name}"></canvas><span class="stage-mark">EVADE / 0.70 SEC</span></div><p>${d.note}</p><small class="timing">${d.timing}</small></article>`).join('')}</section>
<section id="detail" hidden><div class="variant-tabs">${designs.map((d,i)=>`<button data-select="${i}">0${i+1} ${d.name}</button>`).join('')}</div><div class="large-viewport"><canvas id="large" aria-label="拡大した回避演出"></canvas></div><p id="intent"></p></section>
<section id="board" hidden><div class="variant-tabs">${designs.map((d,i)=>`<button data-select="${i}">0${i+1} ${d.name}</button>`).join('')}</div><div class="board-controls"><button id="side">自分側</button><button id="multi">1体</button><select id="result" aria-label="判定結果"><option value="success">成功 · ダイス5</option><option value="failure">失敗 · ダイス2</option></select><span id="rule">成功：700msの回避後、攻撃は無効。</span></div><iframe title="実盤面の回避プレビュー" src="about:blank"></iframe><p class="hint">対象モンスターをクリックして再生。成功時は攻撃無効、失敗時のみ700ms後に通常攻撃へ進みます。</p></section>
<section id="reference" hidden><div class="reference-grid"><article><h2>承認済みの最低基準</h2><video controls muted loop playsinline preload="metadata" src="/references/evade-inscription.mp4"></video><p>「銀紋の流墨」②。面のディテールが変形にも追従すること、暗部・中間色・細い明部、緩急と収束を参照。</p></article><article><h2>今回の判断</h2><p>700msは演出本体の時間です。反復間の休止は含みません。回避対象のカードが主役で、輪や粒子は増やさず、本体の輪郭と材質で伝えます。</p><p>回避のルールは「攻撃される時、ダイス4以上でその攻撃を無効化」。成功時に被弾や反撃は表示しません。</p><p>直近の別セッションでの「同じ案の使い回し」「意味の読めない記号」「フレームとの曖昧な位置」「採用済み品質の確認不足」を制作条件にしています。</p><p><a href="https://www.riotgames.com/en/artedu/visual-effects" target="_blank" rel="noreferrer">Riot：VFXの可読性と発生源</a><br><a href="https://media.gdcvault.com/gdcchina14/presentations/833784_MarielCartwright_PowerfulAndEffective_EN.pdf" target="_blank" rel="noreferrer">GDC：短い動きのキー姿勢と緩急</a><br><a href="https://news.blizzard.com/en-gb/article/22552047/developer-insights-the-art-behind-the-science" target="_blank" rel="noreferrer">Blizzard：主動作と二次動作</a></p></article></div></section>
<div class="transport"><div class="transport-top"><button id="play">再生</button><button id="reset">最初へ</button><button id="stop">停止・復元</button><select id="speed" aria-label="再生速度"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select><label><input id="loop" type="checkbox" checked>反復</label><label><input id="reduced" type="checkbox">動きを低減</label><span id="phase">予兆</span></div><div class="transport-bottom"><input id="seek" aria-label="時刻" type="range" min="0" max="700" step="1" value="0"><output id="time">0.000 / 0.700 s</output></div></div>
<footer>700msの4案を選定するためのローカル比較。表示切り替えは採用操作ではありません。</footer></main>`;
const $=<E extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<E>(q)!;
const iframe=$<HTMLIFrameElement>('iframe');
function send(suspend=false){iframe.contentWindow?.postMessage(suspend?{kind:'evade-suspend'}:{kind:'evade-control',ms,variant,side,multi,success,reduced,dark,id},location.origin);}
function drawCanvas(cv:HTMLCanvasElement,v:number){
 const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;const d=Math.min(devicePixelRatio,1.5),w=Math.round(r.width*d),h=Math.round(r.height*d);
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 const c=cv.getContext('2d')!;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,r.width,r.height);
 const cw=Math.min(r.width*.33,r.height*.49);renderer.draw(c,faces.get(id)!,v,ms,r.width*.47,r.height*.52,cw,true,reduced,angle,side? -1:1);
}
function draw(){
 if(!ready||disposed)return;const start=performance.now();
 if(mode==='grid')root.querySelectorAll<HTMLCanvasElement>('[data-v]').forEach(c=>drawCanvas(c,Number(c.dataset.v)));
 else if(mode==='detail')drawCanvas($<HTMLCanvasElement>('#large'),variant);
 else if(mode==='board')send();
 timings.push(performance.now()-start);if(timings.length>300)timings.shift();
 $<HTMLInputElement>('#seek').value=String(ms);$('#time').textContent=`${(ms/1000).toFixed(3)} / ${(limit()/1000).toFixed(3)} s`;
 $('#phase').textContent=phase(ms,mode==='board'?success:true);
}
function limit(){return mode==='board'&&!success?CYCLE:DURATION;}
function pause(){playing=false;cancelAnimationFrame(raf);raf=0;$('#play').textContent='再生';}
function stop(){pause();ms=limit();hold=0;draw();send(true);}
function tick(now:number){
 if(!playing||disposed)return;const dt=Math.max(0,now-last)*speed;last=now;
 if(ms>=limit()){hold+=dt;if(hold>=820){if(loop){ms=0;hold=0;}else pause();}}
 else ms=Math.min(limit(),ms+dt);
 draw();if(playing)raf=requestAnimationFrame(tick);
}
function play(){if(!ready||disposed)return;pause();if(ms>=limit())ms=0;hold=0;playing=true;last=performance.now();$('#play').textContent='一時停止';raf=requestAnimationFrame(tick);}
function select(v:number){variant=Math.min(3,Math.max(0,v));root.querySelectorAll<HTMLElement>('[data-select]').forEach(b=>b.classList.toggle('active',Number(b.dataset.select)===variant));$('#intent').textContent=designs[variant].note;draw();}
function setMode(next:string){
 pause();mode=next;ms=0;hold=0;for(const k of ['grid','detail','board','reference'])$('#'+k).hidden=k!==mode;
 root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 if(mode==='board'){if(iframe.getAttribute('src')==='about:blank')iframe.src='/evade-four.html?board';}
 else{send(true);iframe.src='about:blank';}
 if(mode!=='reference')root.querySelectorAll('video').forEach(v=>v.pause());
 $<HTMLInputElement>('#seek').max=String(limit());draw();if(mode!=='reference'&&!reduced)play();
}
function setCard(next:string){if(!faces.has(next))return;id=next;$<HTMLSelectElement>('#card').value=id;draw();}
function reduce(value:boolean){reduced=value;$<HTMLInputElement>('#reduced').checked=value;if(value){pause();ms=140;loop=false;$<HTMLInputElement>('#loop').checked=false;}draw();}
root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode!));
root.querySelectorAll<HTMLElement>('[data-zoom]').forEach(b=>b.onclick=()=>{select(Number(b.dataset.zoom));setMode('detail');});
root.querySelectorAll<HTMLElement>('[data-select]').forEach(b=>b.onclick=()=>select(Number(b.dataset.select)));
$('#play').onclick=()=>playing?pause():play();$('#reset').onclick=()=>{pause();ms=0;hold=0;draw();};$('#stop').onclick=stop;
$<HTMLInputElement>('#seek').oninput=()=>{pause();ms=Number($<HTMLInputElement>('#seek').value);draw();};
$<HTMLSelectElement>('#speed').onchange=()=>speed=Number($<HTMLSelectElement>('#speed').value);
$<HTMLSelectElement>('#angle').onchange=()=>{angle=$<HTMLSelectElement>('#angle').value as View;draw();};
$<HTMLInputElement>('#loop').onchange=()=>loop=$<HTMLInputElement>('#loop').checked;
$<HTMLSelectElement>('#card').onchange=()=>setCard($<HTMLSelectElement>('#card').value);
$('#theme').onclick=()=>{dark=!dark;root.classList.toggle('dark',dark);$('#theme').textContent=dark?'暗い盤面':'白い盤面';draw();};
$('#side').onclick=()=>{side=1-side;$('#side').textContent=side?'相手側':'自分側';draw();};
$('#multi').onclick=()=>{multi=!multi;$('#multi').textContent=multi?'3体同時':'1体';draw();};
$<HTMLSelectElement>('#result').onchange=()=>{success=$<HTMLSelectElement>('#result').value==='success';$('#rule').textContent=success?'成功：700msの回避後、攻撃は無効。':'失敗：700msの判定演出後、通常攻撃へ。';$<HTMLInputElement>('#seek').max=String(limit());ms=0;draw();};
$<HTMLInputElement>('#reduced').onchange=()=>reduce($<HTMLInputElement>('#reduced').checked);
const media=matchMedia('(prefers-reduced-motion:reduce)');media.addEventListener('change',e=>reduce(e.matches));
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data?.kind==='evade-ready')send();if(e.data?.kind==='evade-play'){ms=0;play();}if(e.data?.kind==='evade-error')$('#status').textContent='盤面の準備に失敗：'+e.data.error;});
window.addEventListener('resize',draw);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();send(true);root.querySelectorAll('video').forEach(v=>v.pause());}else draw();});
window.addEventListener('pagehide',()=>{pause();disposed=true;send(true);renderer.dispose();},{once:true});
(window as any).evadeLab={get ready(){return ready;},get state(){return{mode,variant,ms,playing,reduced,side,multi,success,id,dark,resources:renderer.resources};},timings,seek(t:number,v=variant){pause();ms=Math.min(limit(),Math.max(0,t));select(v);},setMode,setCard,setSide(n:number){side=n;draw();},setMulti(n:boolean){multi=n;draw();},setSuccess(v:boolean){success=v;$<HTMLSelectElement>('#result').value=v?'success':'failure';$<HTMLInputElement>('#seek').max=String(limit());draw();},reduce,play,pause,stop};
void(async()=>{
 for(const k of cards){faces.set(k,await surface(k));$('#status').textContent=`カード表面を準備 ${faces.size} / ${cards.length}`;}
 ready=true;select(0);document.title='LORE · 回避の一拍';$('#status').textContent='通常速度で同時再生 · 各700ms ＋ 比較用の間';
 if(reduced)reduce(true);else if(!new URLSearchParams(location.search).has('qa'))play();
 if(new URLSearchParams(location.search).has('qa'))void import('./qa').then(q=>q.install((window as any).evadeLab,renderer,faces));
})().catch(e=>{$('#status').textContent='準備に失敗：'+String(e);console.error(e);});
