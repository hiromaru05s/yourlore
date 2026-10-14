import { mountManaSpirit } from '../../ui/manaSpirit';
import { createSpiritMotion, SPIRIT_MOTION_DURATION } from '../../ui/manaSpiritMotion';
import { designs, buildFront, type DesignId } from './designs';
import './style.css';

type Mode='auto'|'flutter'|'sleepy'|'still';
let selected:DesignId='dew',mode:Mode='auto',closeUp=true;
let hero:ReturnType<typeof mountManaSpirit>|undefined;
const thumbnails:ReturnType<typeof mountManaSpirit>[]=[];
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`
<header class="heading"><div><span class="eyebrow">LORE / DESIGN STUDY</span><h1>胸元デザイン <span>5案</span></h1></div><p>体・目周り・モーションは共通</p></header>
<section class="hero" aria-label="選択したデザインの拡大プレビュー">
 <div class="stage"><div class="hero-spirit"></div><div class="view-controls" role="group" aria-label="表示サイズ"><button data-view="body" aria-pressed="true">全身</button><button data-view="chest" aria-pressed="false">胸元を拡大</button></div></div>
 <div class="detail"><div class="design-number"></div><p class="material"></p><h2></h2><p class="description"></p><div class="motion-controls" role="group" aria-label="モーション"><button data-mode="auto" aria-pressed="true">自然な動き</button><button data-mode="flutter" aria-pressed="false">笑う</button><button data-mode="sleepy" aria-pressed="false">眠る</button><button data-mode="still" aria-pressed="false">静止</button></div><p class="hint">笑う・眠るは繰り返し再生できます。</p><label class="background-control"><input type="checkbox" id="lightBackdrop"> 明るい背景で見る</label></div>
</section>
<section class="comparison" aria-label="5案のデザイン比較">${designs.map((d,i)=>`<button class="choice" data-design="${d.id}" aria-pressed="${i===0}"><span class="choice-top"><span>0${i+1}</span><span class="chosen">表示中</span></span><span class="thumb" data-thumb="${d.id}"></span><strong>${d.name}</strong><span class="tag">${d.tag}</span></button>`).join('')}</section>
<footer>番号を選んで比較できます。これはデザイン確認用のプレビューです。</footer>`;
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
 hero=mountManaSpirit(host,{home:true,front:body=>buildFront(selected,body),motion:previewMotion(),still:mode==='still',closeUp});
 const index=designs.findIndex(d=>d.id===selected),design=designs[index];
 app.querySelector('.design-number')!.textContent=`0${index+1}`;
 app.querySelector('h2')!.textContent=design.name;
 app.querySelector('.material')!.textContent=design.tag;
 app.querySelector('.description')!.textContent=design.copy;
 app.querySelectorAll<HTMLElement>('[data-design]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.design===selected)));
 app.querySelectorAll<HTMLElement>('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));
 app.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String((el.dataset.view==='chest')===closeUp)));
 app.dataset.design=selected;app.dataset.mode=mode;app.dataset.view=closeUp?'chest':'body';
 if(!host.querySelector('canvas'))app.classList.add('webgl-missing');
}
app.querySelectorAll<HTMLButtonElement>('[data-design]').forEach(el=>el.onclick=()=>{selected=el.dataset.design as DesignId;renderHero();});
app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el=>el.onclick=()=>{mode=el.dataset.mode as Mode;renderHero();});
app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(el=>el.onclick=()=>{closeUp=el.dataset.view==='chest';renderHero();renderThumbnails();});
app.querySelector<HTMLInputElement>('#lightBackdrop')!.onchange=e=>app.classList.toggle('light-backdrop',(e.target as HTMLInputElement).checked);
function renderThumbnails(){
 thumbnails.splice(0).forEach(t=>t.destroy());
 for(const d of designs){const el=app.querySelector<HTMLElement>(`[data-thumb="${d.id}"]`)!;thumbnails.push(mountManaSpirit(el,{home:true,front:body=>buildFront(d.id,body),still:true,closeUp}));}
}
renderThumbnails();
renderHero();
const noGl=document.createElement('p');noGl.className='no-gl';noGl.setAttribute('role','alert');noGl.textContent='このプレビューの5案比較にはWebGLが必要です。この環境ではデザインを表示できません。';app.append(noGl);
const destroy=()=>{hero?.destroy();hero=undefined;thumbnails.splice(0).forEach(t=>t.destroy());};
const restore=(event:PageTransitionEvent)=>{if(event.persisted){renderThumbnails();renderHero();}};
window.addEventListener('pagehide',destroy);window.addEventListener('pageshow',restore);
if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',destroy);window.removeEventListener('pageshow',restore);destroy();});
