import { mountManaSpirit } from '../../ui/manaSpirit';
import { createSpiritMotion, SPIRIT_MOTION_DURATION } from '../../ui/manaSpiritMotion';
import { buildMoonRabbit } from './rig';
import './style.css';
const states=[{id:'idle',label:'待機',copy:'呼吸に合わせて、耳がゆらゆら。'},{id:'flutter',label:'笑う',copy:'手をパタパタ。耳も弾んで、あとからふわり。'},{id:'sleepy',label:'眠る',copy:'まぶたと一緒に、耳もしょんぼり。'}] as const;
type Mode=typeof states[number]['id'];
let handles:ReturnType<typeof mountManaSpirit>[]=[];
let side=false,slow=false,replay=0;
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`<header><div><p class="eyebrow">LORE / MOON RABBIT</p><h1>月うさぎのしぐさ</h1></div><p class="note">胸元「雫の灯」・目周りはそのまま</p></header><div class="toolbar"><div role="group" aria-label="見る向き"><button data-angle="front" aria-pressed="true">正面</button><button data-angle="side" aria-pressed="false">斜め</button></div><button id="replay">もう一度</button><label><input type="checkbox" id="slow"> ゆっくり再生</label><label><input type="checkbox" id="light"> 明るい背景</label></div><section class="states" aria-label="3つのしぐさ">${states.map((s,i)=>`<article><div class="label"><span>0${i+1}</span><h2>${s.label}</h2></div><div class="scene" data-mode="${s.id}" aria-label="${s.label}モーション"><div class="spirit"></div></div><p class="copy">${s.copy}</p></article>`).join('')}</section><footer>笑う・眠るは繰り返し再生します。これは動きの確認用プレビューです。</footer>`;
function timeline(mode:Mode):ReturnType<typeof createSpiritMotion>{
 const make=()=>{const m=createSpiritMotion(mode==='sleepy',()=>.9);if(mode==='flutter')m.celebrate();if(mode==='sleepy')m.tick(14);return m;};
 let m=make(),time=0,seenReplay=replay;
 return {celebrate(){m.celebrate();},tick(dt){if(seenReplay!==replay){seenReplay=replay;m=make();time=0;}const step=dt*(slow?.5:1);time+=step;if(mode!=='idle'&&time>SPIRIT_MOTION_DURATION[mode]+1.6){m=make();time=0;}return m.tick(step);}};
}
function render(){
 handles.forEach(h=>h.destroy());handles=[];
 for(const state of states){const host=app.querySelector<HTMLElement>(`[data-mode="${state.id}"] .spirit`)!;
  handles.push(mountManaSpirit(host,{home:true,fps:30,form:(body,pearl)=>{const rig=buildMoonRabbit(body,pearl);let rigTime=0;return {...rig,update(p,dt){const step=dt*(slow?.5:1);rigTime+=step;rig.update?.(p,step,rigTime);}};},motion:timeline(state.id),viewYaw:()=>side?.65:0}));
  if(!host.querySelector('canvas'))app.classList.add('no-webgl');
 }
 app.querySelectorAll<HTMLElement>('[data-angle]').forEach(el=>el.setAttribute('aria-pressed',String((el.dataset.angle==='side')===side)));
}
app.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(el=>el.onclick=()=>{side=el.dataset.angle==='side';app.querySelectorAll<HTMLElement>('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.angle==='side')===side)));});
app.querySelector<HTMLButtonElement>('#replay')!.onclick=()=>{replay++;};
app.querySelector<HTMLInputElement>('#slow')!.onchange=e=>{slow=(e.target as HTMLInputElement).checked;};
app.querySelector<HTMLInputElement>('#light')!.onchange=e=>app.classList.toggle('light',(e.target as HTMLInputElement).checked);
const error=document.createElement('p');error.className='gl-warning';error.setAttribute('role','alert');error.textContent='このプレビューにはWebGLが必要です。';app.append(error);
render();
const destroy=()=>{handles.forEach(h=>h.destroy());handles=[];};
const restore=(event:PageTransitionEvent)=>{if(event.persisted)render();};
window.addEventListener('pagehide',destroy);window.addEventListener('pageshow',restore);
if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',destroy);window.removeEventListener('pageshow',restore);destroy();});
