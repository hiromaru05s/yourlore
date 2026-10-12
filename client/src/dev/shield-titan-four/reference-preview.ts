import {TitanRenderer} from './reference/renderer';
import {surface} from './surface';
import './style.css';
const root=document.getElementById('app')!;
root.innerHTML='<main><header><div><div class="eyebrow">REFERENCE / REVISION 02 — 03</div><h1>比較元③ — 晶壁の覚醒</h1><p>方向性の基準として、第2稿の③をそのまま保存しています。</p></div></header><a class="reference-link" href="/shield-titan-four.html">← 結晶の4案へ戻る</a><canvas id="reference" style="height:65vh;margin-top:20px"></canvas><div class="timeline"><button id="play">一時停止</button><select id="speed" aria-label="再生速度"><option value="1">1×</option><option value="0.5">0.5×</option></select><input id="seek" aria-label="再生位置" type="range" min="0" max="3000" value="0"><output id="time">0.00</output></div></main>';
const canvas=root.querySelector<HTMLCanvasElement>('canvas')!,button=root.querySelector<HTMLButtonElement>('#play')!,seek=root.querySelector<HTMLInputElement>('#seek')!;
let renderer:TitanRenderer|undefined,ms=0,last=0,raf=0,playing=false,speed=1;
function draw(){if(!renderer)return;const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);renderer.draw(canvas,2,Math.min(3000,ms));seek.value=String(Math.min(3000,ms));root.querySelector('output')!.textContent=(Math.min(3000,ms)/1000).toFixed(2);}
function pause(){playing=false;cancelAnimationFrame(raf);button.textContent='再生';}
function tick(now:number){if(!playing)return;ms+=Math.max(0,Math.min(100,now-last))*speed;last=now;if(ms>3520)ms=0;draw();raf=requestAnimationFrame(tick);}
function play(){playing=true;last=performance.now();button.textContent='一時停止';raf=requestAnimationFrame(tick);}
button.onclick=()=>playing?pause():play();seek.oninput=()=>{pause();ms=Number(seek.value);draw();};root.querySelector<HTMLSelectElement>('#speed')!.onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
window.addEventListener('resize',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',()=>{pause();renderer?.dispose();});
(window as any).titanReference={get ready(){return !!renderer;},seek(t:number){pause();ms=t;draw();}};
void surface().then(face=>{renderer=new TitanRenderer();renderer.setFace(face);draw();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)play();});
