import {FACET_VARIANTS,isFacetVariant,facetSpec,facetTiming,facetConvergencePose,createFacetConvergence,type FacetVariantId} from './manaFacetVariants';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {READING_ASSETS} from '../ui/readingBoardLayout';
import {addCrystalOptics} from '../ui/readingCrystalOptics';
import {manaSlotLayout,type FormationHandle} from '../ui/manaFormationPreview';
import {drawManaGain} from '../ui/manaGain';
import {manaGainPose} from '../ui/manaGainTiming';
import {FORMATIONS,FORMATION_IMPACT,createManaFormation,applyFormationBloom,disposeFormationBloom,isFormation,type FormationId} from './manaFormation';
import './manaLab.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main>
<header><a class="wordmark" href="/mana-lab.html">LORE<span>EFFECT STUDIES</span></a><span class="edition">04 / FACET CONVERGENCE</span></header>
<section class="intro"><div><p class="eyebrow">ATTUNE — FACET SCALE & TIMING</p><h1>大きく開き、<em>一石へ。</em></h1><p class="lead">選んだ②「結面」の質感を、そのままに。<br>広がる大きさと、収斂する速さを変えた5つの案。</p></div><aside>実盤面と同じ水晶モデル・材質を使用<br>新しい2石を拡大して比較<small><span id="timing-note">倍率と所要時間を切り替えて比較</span></small></aside></section>
<nav class="variants" aria-label="生成パターン">${FACET_VARIANTS.map((v,i)=>`<button data-variant="${v.id}" aria-pressed="${i===0}"><small>0${i+1} / ${v.en}</small><b>${v.name}</b><span class="scale-meta">${v.peak.toFixed(2)}× → 1×</span></button>`).join('')}<button data-variant="facets" aria-pressed="false"><small>REFERENCE</small><b>基準②</b></button></nav>
<section class="viewer"><div class="stage" id="stage"><canvas id="physical" aria-label="水晶が形成される3Dプレビュー"></canvas><canvas id="reference-fx" aria-hidden="true"></canvas><div class="stage-heading"><span id="study-en">CONDENSATION</span><span id="phase">準備</span></div><div class="stage-bottom"><span id="scale-label">結晶化を拡大 / 実物のモデル</span><span id="readout">6 <small>/ 8</small></span></div><div id="loading">水晶を読み込み中…</div></div>
<div class="caption"><div><h2 id="study-title">01 — 小気味よく</h2><p id="study-note">${FACET_VARIANTS[0].note}</p></div><a id="board-link" href="/duel-lab.html?polish&mana=facet-swift">実盤面で再生 ↗</a></div></section>
<section class="transport" aria-label="再生コントロール"><button id="play">一時停止</button><button id="restart">最初から</button><label>速度 <select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><label class="scrub"><input id="time" aria-label="再生位置" type="range" min="0" max="2200" value="0"><output id="stamp">0.00 s</output></label><button id="surface" aria-pressed="false">背景：明</button><button id="zoom" aria-pressed="true">表示：結晶化を拡大</button></section>
<div class="phase-track"><button data-time="280">01 光の流入 <b>0.28 s</b></button><button data-time="720">02 形の生成 <b>0.72 s</b></button><button data-time="1100">03 結晶化 <b>1.10 s</b></button><button data-time="1900">04 定着 <b>1.90 s</b></button></div>
<footer><span>LOCAL PROTOTYPE / 5 STUDIES</span><span>②と同じ材質・結晶面。すべて最後は同じスロット・同じ大きさへ。</span></footer></main>`;
const element=<E extends HTMLElement>(id:string)=>document.getElementById(id) as E;
const stage=element<HTMLDivElement>('stage'),canvas=element<HTMLCanvasElement>('physical'),overlay=element<HTMLCanvasElement>('reference-fx');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.001,10),parent=new T.Group();scene.add(parent);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
const key=new T.DirectionalLight(0xffeed9,2.3);key.position.set(-.6,1,.5);scene.add(key);const fill=new T.DirectionalLight(0xc4daff,.7);fill.position.set(.8,.7,-.8);scene.add(fill);
const groundMaterial=new T.MeshStandardMaterial({color:0xe5e9e6,roughness:.68,metalness:.12}),groundGeometry=new T.PlaneGeometry(3,3),ground=new T.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.006;scene.add(ground);
const presentScene=new T.Scene(),presentCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),presentMaterial=new T.MeshBasicMaterial({map:target.texture,depthTest:false,depthWrite:false}),presentGeometry=new T.PlaneGeometry(2,2);presentScene.add(new T.Mesh(presentGeometry,presentMaterial));
const media=matchMedia('(prefers-reduced-motion: reduce)');
type StudyId=FormationId|FacetVariantId|'original';
let id:StudyId='facet-swift',age=media.matches?2200:0,playing=!media.matches,zoom=true,dark=false,last=performance.now(),raf=0,ready=false,width=0,height=0;
let handles:FormationHandle[]=[];
const batches:{ready:T.InstancedMesh[];spent:T.InstancedMesh[]}={ready:[],spent:[]},templates:T.Group[]=[];
const optics:T.MeshPhysicalMaterial[]=[];
const matrix=new T.Matrix4(),identity=new T.Quaternion();
async function init(){
 const loader=new GLTFLoader();const [tray,readyGem,spentGem,cut]=await Promise.all([loader.loadAsync(READING_ASSETS+'mana-tray.glb'),loader.loadAsync(READING_ASSETS+'mana-crystal-ready.glb'),loader.loadAsync(READING_ASSETS+'mana-crystal-spent.glb'),fetch(READING_ASSETS+'crystal-optics.json').then(r=>r.json())]);
 templates.push(tray.scene,readyGem.scene,spentGem.scene);tray.scene.position.x=.0415;parent.add(tray.scene);
 for(const [state,asset] of [['ready',readyGem.scene],['spent',spentGem.scene]] as const){asset.updateMatrixWorld(true);asset.traverse(o=>{if(!(o instanceof T.Mesh))return;
  if(o.material instanceof T.MeshPhysicalMaterial){if(state==='ready'){o.material.color.set('#378bea');o.material.attenuationColor.set('#2373c9');}if(o.material.transmission>0){addCrystalOptics(o.material,cut);optics.push(o.material);}}
  const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),mesh=new T.InstancedMesh(geo,o.material,30);mesh.position.x=.0415;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;parent.add(mesh);batches[state].push(mesh);
 });}
 ready=true;stage.dataset.ready='true';element('loading').hidden=true;select(id);schedule();
}
function rebuild(){handles.forEach(h=>h.dispose());handles=[];if(!ready||id==='original')return;
 for(let i=8;i<10;i++){const input={parent,parts:batches[i<9?'ready':'spent'],slot:i,maximum:10,ordinal:i-8,count:2};handles.push(isFacetVariant(id)?createFacetConvergence(input,id):createManaFormation(input,id));}
}
function studyTiming(){return isFacetVariant(id)?facetTiming(id):{duration:2200,impact:id==='original'?520:FORMATION_IMPACT};}
function select(next:StudyId){
 id=next;stage.dataset.variant=id;rebuild();age=media.matches?studyTiming().duration:0;last=performance.now();
 const index=FACET_VARIANTS.findIndex(v=>v.id===id),v=isFacetVariant(id)?facetSpec(id):FORMATIONS.find(v=>v.id===id);
 const timing=studyTiming();element<HTMLInputElement>('time').max=String(timing.duration);
 element('timing-note').textContent=isFacetVariant(id)?`${facetSpec(id).peak.toFixed(2)}× → 1× / ${(timing.duration/1000).toFixed(2)} 秒`:'基準② / 2.20 秒';
 const times=isFacetVariant(id)?[facetSpec(id).gather*.55,facetSpec(id).gather+facetSpec(id).hold*.6,timing.impact-140-facetSpec(id).contract*.35,timing.duration-180]:[280,720,1100,1900];
 app.querySelectorAll<HTMLButtonElement>('[data-time]').forEach((b,i)=>{b.dataset.time=String(Math.round(times[i]));b.innerHTML=`0${i+1} ${['展開','溜め','収斂','定着'][i]} <b>${(times[i]/1000).toFixed(2)} s</b>`;});
 element('study-en').textContent=v?v.en.toUpperCase():'ORIGINAL / REFERENCE';element('study-title').textContent=v?`${index<0?'REF':`0${index+1}`} — ${id==='facets'?'基準② 結面':v.name}`:'REF — 現行の演出';element('study-note').textContent=v?v.note:'現行の2D集束と、3D水晶の出現を比較。';element<HTMLAnchorElement>('board-link').href=`/duel-lab.html?polish&mana=${id}`;
 app.querySelectorAll<HTMLButtonElement>('button[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===id)));if(id==='original')zoom=false;else zoom=true;updateZoom();draw();
 history.replaceState(null,'',`?formation=${id}`);
}
function resize(){const rect=stage.getBoundingClientRect();if(rect.width===width&&rect.height===height)return;width=rect.width;height=rect.height;renderer.setSize(width,height,false);target.setSize(Math.round(width*renderer.getPixelRatio()),Math.round(height*renderer.getPixelRatio()));overlay.width=Math.round(width*devicePixelRatio);overlay.height=Math.round(height*devicePixelRatio);camera.aspect=width/height;camera.updateProjectionMatrix();}
function draw(){if(!ready)return;resize();
 const timing=studyTiming(),reduced=media.matches,t=reduced?timing.duration:Math.min(age,timing.duration),impact=timing.impact,formed=t>=impact,maximum=formed?10:8,current=formed?9:6;
 stage.dataset.age=String(t);stage.dataset.progress=String(handles[0]?.group.userData.progress??1);
 element('readout').innerHTML=`${current} <small>/ ${maximum}</small>`;
 element('phase').textContent=isFacetVariant(id)?facetConvergencePose(id,t).phase:t<380?'01 / 光の流入':t<1100?'02 / 形の生成':t<1450?'03 / 結晶化':'04 / 定着';
 element<HTMLInputElement>('time').value=String(t);element<HTMLOutputElement>('stamp').value=(t/1000).toFixed(2)+' s';element('play').textContent=playing?'一時停止':'再生';
 const counts={ready:0,spent:0};
 for(let i=0;i<(id==='original'?maximum:8);i++){
  let layout=manaSlotLayout(i,id==='original'?maximum:10);
  if(id!=='original'){const old=manaSlotLayout(i,8),p=Math.min(1,t/360),a=p*p*(3-2*p);layout={x:old.x+(layout.x-old.x)*a,y:old.y+(layout.y-old.y)*a,z:old.z+(layout.z-old.z)*a,scale:old.scale+(layout.scale-old.scale)*a};}
  const pose=id==='original'&&i>=8?manaGainPose(t,i-8,2):{scale:1,lift:0};matrix.compose(new T.Vector3(layout.x,layout.y+pose.lift,layout.z),identity,new T.Vector3().setScalar(layout.scale*pose.scale));const state=i<current?'ready':'spent',index=counts[state]++;batches[state].forEach(m=>m.setMatrixAt(index,matrix));
 }
 for(const state of ['ready','spent'] as const)for(const m of batches[state]){m.count=counts[state];m.instanceMatrix.needsUpdate=true;}
 const cx=zoom?.130:.0415,distance=(zoom?.29:.43)*Math.max(1,(zoom?2.4:1.5)/camera.aspect); // Fixed framing across all five sizes, including the unchanged reference.
 camera.position.set(cx,.72*distance,.80*distance);camera.lookAt(cx,zoom?.045:.025,0);camera.updateMatrixWorld();
 handles.forEach(h=>h.update(t,1));
 stage.dataset.progress=String(handles[0]?.group.userData.progress??1);stage.dataset.effectScale=String(handles[0]?.group.userData.convergenceScale??1);
 // Pixel-sized dust is derived from the actual preview magnification.
 const magnification=height/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*distance);
 handles.forEach(h=>h.group.traverse(o=>{if(o instanceof T.Points)(o.material as T.ShaderMaterial).uniforms.uPixels.value=Math.min(8,magnification*.0015)*renderer.getPixelRatio();}));
 scene.background=new T.Color(dark?0x0a1523:0xe9ece8);groundMaterial.color.set(dark?0x101e2b:0xe5e9e6);
 renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);if(id!=='original'&&!reduced)applyFormationBloom(renderer,target);renderer.setRenderTarget(null);renderer.render(presentScene,presentCamera);
 const c=overlay.getContext('2d')!;c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);c.clearRect(0,0,width,height);
 if(id==='original'&&!reduced){const project=(x:number,z:number)=>{const v=new T.Vector3(x,.014,z).project(camera);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2};};const a=project(-.175,-.0385),b=project(.175,.0385);drawManaGain(c,{left:a.x,top:a.y,width:b.x-a.x,height:b.y-a.y},t/1000);}
}
function tick(now:number){raf=0;if(document.hidden)return;const delta=Math.min(80,now-last);last=now;if(playing){age+=delta*Number(element<HTMLSelectElement>('speed').value);if(age>studyTiming().duration+600)age=0;}draw();if(playing)schedule();}
function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function pauseAt(value:number){playing=false;age=value;draw();}
function updateZoom(){element('zoom').textContent=zoom?'表示：結晶化を拡大':'表示：トレイ全体';element('zoom').setAttribute('aria-pressed',String(zoom));element('scale-label').textContent=zoom?'結晶化を拡大 / 実物のモデル':'トレイ全体 / 実物のモデル';}
app.querySelectorAll<HTMLButtonElement>('button[data-variant]').forEach(b=>b.onclick=()=>{select(b.dataset.variant as typeof id);schedule();});
app.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(b=>b.onclick=()=>pauseAt(Number(b.dataset.time)));
element('play').onclick=()=>{playing=!playing;last=performance.now();schedule();draw();};element('restart').onclick=()=>{age=media.matches?studyTiming().duration:0;playing=!media.matches;last=performance.now();draw();schedule();};
element<HTMLInputElement>('time').oninput=e=>pauseAt(Number((e.target as HTMLInputElement).value));element('surface').onclick=()=>{dark=!dark;element('surface').textContent=dark?'背景：暗':'背景：明';element('surface').setAttribute('aria-pressed',String(dark));stage.classList.toggle('dark',dark);draw();};element('zoom').onclick=()=>{zoom=!zoom;updateZoom();draw();};
const observer=new ResizeObserver(()=>{draw();});observer.observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();schedule();}});media.addEventListener('change',()=>{playing=!media.matches;age=media.matches?studyTiming().duration:0;draw();schedule();});
const initial=new URLSearchParams(location.search).get('formation');if(isFormation(initial)||isFacetVariant(initial)||initial==='original')id=initial;
void init().catch(error=>{console.error(error);element('loading').textContent='3Dプレビューを読み込めませんでした。ページを再読み込みしてください。';stage.dataset.ready='error';});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();handles.forEach(h=>h.dispose());disposeFormationBloom();Object.values(batches).flat().forEach(m=>{m.geometry.dispose();m.dispose();});const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();templates.forEach(g=>g.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}}));gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());environment.dispose();target.dispose();presentGeometry.dispose();presentMaterial.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();},{once:true});
