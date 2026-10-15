import { mountManaSpirit } from '../../ui/manaSpirit';
import { createSpiritMotion, SPIRIT_MOTION_DURATION } from '../../ui/manaSpiritMotion';
import { designs, buildForm, type DesignId } from './designs';
import '../spirit-front-five/style.css';
import './style.css';

type Mode='auto'|'flutter'|'sleepy'|'still';
let selected:DesignId='ears',mode:Mode='auto',side=false,silhouette=false;
let hero:ReturnType<typeof mountManaSpirit>|undefined;
const thumbnails:ReturnType<typeof mountManaSpirit>[]=[];
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`
<header class="heading"><div><span class="eyebrow">LORE / DESIGN STUDY</span><h1>シルエット <span>5案</span></h1></div><p>胸元01「雫の灯」・目周り・モーションは共通</p></header>
<section class="hero" aria-label="選択したデザインの拡大プレビュー">
 <div class="stage"><div class="hero-spirit"></div><div class="view-controls" role="group" aria-label="表示サイズ"><button data-view="front" aria-pressed="true">正面</button><button data-view="side" aria-pressed="false">斜め</button></div></div>
 <div class="detail"><div class="design-number"></div><p class="material"></p><h2></h2><p class="description"></p><div class="motion-controls" role="group" aria-label="モーション"><button data-mode="auto" aria-pressed="true">自然な動き</button><button data-mode="flutter" aria-pressed="false">笑う</button><button data-mode="sleepy" aria-pressed="false">眠る</button><button data-mode="still" aria-pressed="false">静止</button></div><p class="hint">笑う・眠るは繰り返し再生できます。</p><label class="background-control"><input type="checkbox" id="lightBackdrop"> 明るい背景で見る</label><label class="background-control"><input type="checkbox" id="silhouette"> 輪郭だけで比較</label></div>
</section>
<section class="comparison" aria-label="5案のデザイン比較">${designs.map((d,i)=>`<button class="choice" data-design="${d.id}" aria-pressed="${i===0}"><span class="choice-top"><span>0${i+1}</span><span class="chosen">表示中</span></span><span class="thumb" data-thumb="${d.id}"></span><strong>${d.name}</strong><span class="tag">${d.tag}</span></button>`).join('')}</section>
<footer>番号を選んで比較できます。胸元01は採用済み。シルエットは選択用プレビューです。</footer>`;
const host=app.querySelector<HTMLElement>('.hero-spirit')!;
function previewMotion():ReturnType<typeof createSpiritMotion>|undefined {
 if(mode==='auto'||mode==='still')return undefined;
 const chosen=mode;
 const make=()=>{const m=createSpiritMotion(chosen==='sleepy',()=>.9);if(chosen==='sleepy')m.tick(14);else m.celebrate();return m;};
 let current=make(),elapsed=0;
 return {greet(){current.greet();},celebrate(){current.celebrate();},tick(dt){elapsed+=dt;if(elapsed>SPIRIT_MOTION_DURATION[chosen]+2.2){current=make();elapsed=0;}return current.tick(dt);}};
}
function renderHero(){
 hero?.destroy();
 hero=mountManaSpirit(host,{home:true,form:(body,pearl,blue)=>buildForm(selected,body,pearl,blue),motion:previewMotion(),still:mode==='still',silhouette,viewYaw:side?.65:0});
 const index=designs.findIndex(d=>d.id===selected),design=designs[index];
 app.querySelector('.design-number')!.textContent=`0${index+1}`;
 app.querySelector('h2')!.textContent=design.name;
 app.querySelector('.material')!.textContent=design.tag;
 app.querySelector('.description')!.textContent=design.copy;
 app.querySelectorAll<HTMLElement>('[data-design]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.design===selected)));
 app.querySelectorAll<HTMLElement>('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));
 app.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String((el.dataset.view==='side')===side)));
 app.dataset.design=selected;app.dataset.mode=mode;app.dataset.view=side?'side':'front';
 if(!host.querySelector('canvas'))app.classList.add('webgl-missing');
}
app.querySelectorAll<HTMLButtonElement>('[data-design]').forEach(el=>el.onclick=()=>{selected=el.dataset.design as DesignId;renderHero();});
app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el=>el.onclick=()=>{mode=el.dataset.mode as Mode;renderHero();});
app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(el=>el.onclick=()=>{side=el.dataset.view==='side';renderHero();renderThumbnails();});
app.querySelector<HTMLInputElement>('#lightBackdrop')!.onchange=e=>app.classList.toggle('light-backdrop',(e.target as HTMLInputElement).checked);
app.querySelector<HTMLInputElement>('#silhouette')!.onchange=e=>{silhouette=(e.target as HTMLInputElement).checked;app.classList.toggle('silhouette-only',silhouette);renderHero();renderThumbnails();};
function renderThumbnails(){
 thumbnails.splice(0).forEach(t=>t.destroy());
 for(const d of designs){const el=app.querySelector<HTMLElement>(`[data-thumb="${d.id}"]`)!;thumbnails.push(mountManaSpirit(el,{home:true,form:(body,pearl,blue)=>buildForm(d.id,body,pearl,blue),still:true,silhouette,viewYaw:side?.65:0}));}
}
renderThumbnails();
renderHero();
const noGl=document.createElement('p');noGl.className='no-gl';noGl.setAttribute('role','alert');noGl.textContent='このプレビューの5案比較にはWebGLが必要です。この環境ではデザインを表示できません。';app.append(noGl);
const destroy=()=>{hero?.destroy();hero=undefined;thumbnails.splice(0).forEach(t=>t.destroy());};
const restore=(event:PageTransitionEvent)=>{if(event.persisted){renderThumbnails();renderHero();}};
window.addEventListener('pagehide',destroy);window.addEventListener('pageshow',restore);
if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',destroy);window.removeEventListener('pageshow',restore);destroy();});
