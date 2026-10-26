import {cloneCardNode} from '../cardClone';
import {SPECIAL_FX} from '../animationTempo';
import {paintRestingAppearance} from '../summon/appearance';
import {isCastle} from '../castleSummon/catalog';
import {isPoisonSummon} from '../poisonSummon/selection';
import {isShieldTitan} from '../shieldTitanSummon/selection';
import {isSilenceSummon} from '../silenceSummon/selection';
import {playSilenceSummon,cancelSilenceSummon,cancelSilenceSummons} from '../silenceSummon/runtime';
import {isVoidSummon} from '../voidSummon/selection';
import {playVoidSummon,cancelVoidSummon,cancelVoidSummons} from '../voidSummon/runtime';
import {isCasino} from '../casinoSummon/selection';
import {playCasinoSummon,cancelCasinoSummons,cancelCasinoSummon} from '../casinoSummon/runtime';
import {DualReadySurface} from './dualReady';
import {AmberSurface,showGutsResult} from '../guts/surface';
import {GUTS_DURATION} from '../guts/timing';
import type {GutsSurvival} from '../../shared/types';
import {isAssassin} from '../assassinSummon/selection';
import {isGolem} from '../golem/selection';
import {playGolem,cancelGolems,cancelGolem} from '../golem/runtime';
import {combatRect} from '../combatAnchor';
import {playTribeSummon,cancelTribeSummons,cancelTribeSummon} from '../tribePresentation/runtime';
import {selectedTribeSummon} from '../tribePresentation/selection';
import {playRiftDestruction,cancelRiftDestruction} from '../riftDestruction/runtime';
import {playManaDestruction,cancelManaDestruction} from '../manaDestruction/runtime';
import {playSlateSummon,cancelSummons,cancelSummon} from '../summon/runtime';
import {Actor} from './actor';
import {duration,ease, type Kind, type Variant, type Rect} from './catalog';
import {drawEffect} from './renderer';
import {mountAnimationLayers} from './layers';
import {projectedPlacement} from '../boardProjection';

/** Transient actions use the foreground; persistent states belong to the board. */
type Layers=ReturnType<typeof mountAnimationLayers>;
let layers:Layers|undefined;
const fieldLayers=new Map<HTMLElement,Layers>();
const observers=new Map<HTMLElement,MutationObserver>();
const motion=matchMedia('(prefers-reduced-motion:reduce)');
let frame=0, skipped=false;
const jobs=new Map<HTMLElement,Job>();
const states=new Map<HTMLElement,{actor:Actor;opacity:string;root:HTMLElement;layer:Layers;rect?:Rect;dirty:boolean;dual?:DualReadySurface}>();
const gutsJobs=new Map<HTMLElement,{source:HTMLElement;actor:Actor;surface:AmberSurface;start:number;ms:number;r:Rect;finish:(complete:boolean)=>void}>();
type Options={tempo?:boolean;mana?:boolean;variant?:Variant;anchor?:HTMLElement;target?:HTMLElement;destination?:HTMLElement;side?:number;signal?:AbortSignal;onImpact?:()=>void;exhaust?:boolean;stats?:Actor['stats']};
type Job={source:HTMLElement;actor:Actor;kind:Kind;variant:Variant;start:number;ms:number;r:Rect;target:Rect;destination?:Rect;options:Options;opacity:string;finish:(complete:boolean)=>void;impacted:boolean;hit?:{actor:Actor;node:HTMLElement;opacity:string}};
const reduced=()=>motion.matches;
const hits=new Map<HTMLElement,number>();
export function hitMonster(source:HTMLElement){
 const state=states.get(source);if(state||jobs.has(source)||gutsJobs.has(source))hits.set(source,performance.now());if(state)state.dirty=true;
 if(!state&&!jobs.has(source)&&!gutsJobs.has(source)&&!reduced()){
  source.getAnimations().filter(a=>a.id==='monster-hit').forEach(a=>a.cancel());
  const a=source.animate([{translate:'0px 0px'},{translate:'-5px 2px',offset:.12},{translate:'4px -1px',offset:.34},{translate:'-2px 0px',offset:.6},{translate:'0px 0px'}],{duration:300,easing:'ease-out'});a.id='monster-hit';
 }
 schedule();
}
export function combatVisualRect(source:HTMLElement):DOMRect|null{
 const counter=document.querySelector<HTMLElement>(`.counter-rig[data-source-uid="${CSS.escape(source.dataset.uid??'')}"]`);
 const actor=counter??jobs.get(source)?.actor.el??gutsJobs.get(source)?.actor.el??states.get(source)?.actor.el;
 return actor?.isConnected?actor.getBoundingClientRect():source.isConnected?source.getBoundingClientRect():null;
}
export function monsterHealth(source:HTMLElement,value:number){
 for(const node of [source,states.get(source)?.actor.el,jobs.get(source)?.actor.el,gutsJobs.get(source)?.actor.el]){
  const label=node?.querySelector('.ad-def .seal-value');if(label)label.textContent=String(Math.max(0,value));
 }
}
function paintHit(source:HTMLElement,actor:Actor,now:number){
 const start=hits.get(source);if(start===undefined)return;
 const t=(now-start)/300;if(t>=1){hits.delete(source);const state=states.get(source);if(state)state.dirty=true;return;}
 const q=reduced()?0:Math.sin(t*Math.PI*5)*(1-t)*5;
 actor.el.style.setProperty('translate',`${q}px ${Math.abs(q)*.2}px`);
 actor.el.style.setProperty('filter',(actor.el.style.filter==='none'?'':actor.el.style.filter)+` brightness(${1+.28*(1-t)})`,'important');
 actor.el.dataset.hitReaction='true';
}
/** Freeze the currently visible pose before a destruction takes ownership. */
export function detachMonsterFace(source:HTMLElement):HTMLElement{
 const visible=jobs.get(source)?.actor.el??states.get(source)?.actor.el;
 const copy=cloneCardNode(visible??source);
 if(!visible||visible===source){const w=source.offsetWidth,h=source.offsetHeight,m=states.get(source)?.actor.matrix??projectedPlacement(source,w,h);copy.style.cssText=`position:fixed!important;left:0!important;top:0!important;width:${w}px!important;height:${h}px!important;--cw:${w}px;--ch:${h}px;transform:${m.toString()}!important;transform-origin:0 0!important;margin:0!important`;}
 copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
 copy.classList.remove('is-attacker','is-targetable','is-atk-target');
 copy.style.setProperty('position','fixed','important');copy.style.setProperty('opacity','1','important');copy.style.setProperty('visibility','visible','important');copy.style.setProperty('display','block');copy.style.pointerEvents='none';copy.style.zIndex='136';
 copy.dataset.combatExit='true';copy.dataset.exitUid=source.dataset.uid??source.dataset.exitUid??'';copy.setAttribute('aria-hidden','true');document.body.append(copy);
 jobs.get(source)?.finish(false);removeState(source);hits.delete(source);source.style.visibility='hidden';release();return copy;
}

export function monsterRect(n:HTMLElement):Rect{const w=n.offsetWidth,h=n.offsetHeight,matrix=projectedPlacement(n,w,h),p=matrix.transformPoint(new DOMPoint(w/2,h/2));return{x:p.x/p.w,y:p.y/p.w,w,h,matrix};}
function ensure(){if(!layers){layers=mountAnimationLayers(document.body,true);layers.root.setAttribute('aria-hidden','true');}return layers;}
function ensureField(root:HTMLElement){
 let layer=fieldLayers.get(root);
 if(!layer){layer=mountAnimationLayers(root.querySelector<HTMLElement>('.stage')??root,false,'field');layer.root.setAttribute('aria-hidden','true');fieldLayers.set(root,layer);}
 return layer;
}
function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function invalidateGeometry(){for(const s of states.values()){s.rect=undefined;s.dirty=true;}schedule();}
function observeField(root:HTMLElement){
 let observer=observers.get(root);
 if(!observer){observer=new MutationObserver(records=>{
  for(const record of records){const n=record.target as HTMLElement,s=states.get(n);if(s){s.dirty=true;if(record.type==='attributes'&&record.attributeName==='style')s.rect=undefined;}}
  for(const [n,s] of states){if(!n.isConnected)removeState(n);else {s.rect=undefined;s.dirty=true;}}
  release();schedule();
 });observers.set(root,observer);}
 observer.disconnect();
 for(const [n,s] of states)if(s.root===root)observer.observe(n,{attributes:true,attributeFilter:['class','style','data-monster-aura','data-monster-blocked','data-monster-dual-ready']});
 for(const zone of root.querySelectorAll('.zone-mon'))observer.observe(zone,{childList:true,subtree:true,attributes:true,attributeFilter:['data-reserved-uid']});
}
function removeState(n:HTMLElement){const s=states.get(n);if(!s)return;s.dual?.canvas.remove();s.actor.dispose();n.style.opacity=s.opacity;states.delete(n);}
/** Live presentation owners for attached UI effects, including persistent field actors. */
export function monsterPresentationNodes(source:HTMLElement):HTMLElement[]{
 return [...new Set([source,states.get(source)?.actor.el,jobs.get(source)?.actor.el,gutsJobs.get(source)?.actor.el])].filter((n):n is HTMLElement=>!!n&&n.isConnected);
}
export function syncMonsterStates(root:HTMLElement){
 for(const [n,s] of states)if(s.root===root||!n.isConnected)removeState(n);
 if(!root.isConnected){release();return;}
 for(const n of root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')){
  if(!n.classList.contains('is-attacker')&&!n.dataset.monsterAura&&!n.dataset.monsterBlocked)continue;
  const layer=ensureField(root),actor=new Actor(n,layer.cards,1,true);states.set(n,{actor,root,layer,opacity:n.style.opacity,dirty:true});
  // Keep the source visible until the replacement actor has painted its first pose.
 }
 if([...states.values()].some(s=>s.root===root))observeField(root);release();if(states.size)schedule();
}
export function clearMonsterStates(root:HTMLElement){for(const node of hits.keys())if(root.contains(node)||!node.isConnected)hits.delete(node);for(const j of [...gutsJobs.values()])if(root.contains(j.source))j.finish(false);cancelSilenceSummons(root);cancelVoidSummons(root);cancelCasinoSummons(root);cancelGolems(root);cancelTribeSummons(root);cancelRiftDestruction(root);cancelManaDestruction(root);cancelSummons(root);for(const j of [...jobs.values()])if(root.contains(j.source))j.finish(false);for(const [n,s] of states)if(s.root===root)removeState(n);release();}
export function setMonsterSkip(value:boolean){skipped=value;if(value){hits.clear();for(const j of [...gutsJobs.values()])j.finish(false);cancelSilenceSummons();cancelVoidSummons();cancelCasinoSummons();cancelGolems();cancelTribeSummons();cancelSummons();cancelRiftDestruction();cancelManaDestruction();}if(value)for(const j of [...jobs.values()])j.finish(false);}
function release(){
 for(const [root,layer] of fieldLayers)if(![...states.values()].some(s=>s.root===root)){layer.dispose();fieldLayers.delete(root);observers.get(root)?.disconnect();observers.delete(root);}
 if(!jobs.size&&!gutsJobs.size){layers?.dispose();layers=undefined;}
 if(!states.size&&!jobs.size&&!gutsJobs.size){cancelAnimationFrame(frame);frame=0;}
}
function tick(now:number){
 frame=0;if(document.hidden)return;
 // Native actors mutate their own styles. Observe external changes only, not
 // our paint pass, or static exhausted cards schedule an endless layout loop.
 for(const observer of observers.values())observer.disconnect();
 for(const [node,start] of hits)if(!node.isConnected||now-start>=300){hits.delete(node);const state=states.get(node);if(state)state.dirty=true;}
 const active=layers;active?.begin(innerWidth,innerHeight);
 // Measure all dirty sources before touching clone styles. Idle geometry stays cached
 // until board projection, resize, scrolling, rendering or source style changes.
 for(const [n,s] of states)if(n.isConnected&&(!s.rect||n.getAnimations().length)){s.rect=monsterRect(n);s.dirty=true;}
 const hidden=new Set<HTMLElement>([...jobs.keys(),...gutsJobs.keys()]);for(const job of jobs.values())if(job.hit)hidden.add(job.hit.node);
 const readyLayers=new Set<Layers>();for(const [n,s] of states)if(n.classList.contains('is-attacker')||s.dirty)readyLayers.add(s.layer);
 for(const layer of readyLayers)layer.begin(innerWidth,innerHeight);
 let animated=false;
 for(const [n,s] of states){
  if(!n.isConnected){removeState(n);continue;}
  if(hidden.has(n)||n.classList.contains('is-dragging')||n.style.visibility==='hidden'){s.actor.hide();s.dirty=true;continue;}
  const r=s.rect!,ready=n.classList.contains('is-attacker'),blocked=!!n.dataset.monsterBlocked,dual=ready&&n.dataset.monsterDualReady==='04';
  const dynamic=hits.has(n)||n.getAnimations().length>0||!reduced()&&(ready||!!n.dataset.monsterAura);animated||=dynamic;
  if(!s.dirty&&!dynamic){if(ready&&!dual)drawEffect(s.layer.foreground,'ready','C',0,r,r,{active:true,reduced:true,side:n.closest('#oppRow')?-1:1,pass:'front'});continue;}
  s.dirty=false;
  const side=n.closest('#oppRow')?-1:1;
  const k=ready?'ready':blocked?'blocked':'aura',v=ready?'C':blocked?'B':'C',t=ready?(now%2200)/2200:blocked?1:(now%4400)/4400;
  s.actor.paint(k,v,t,r,r,reduced(),true,side);s.actor.el.dataset.monsterKind=k;s.actor.el.dataset.monsterVariant=dual?'dual-04':v;
  if(dual){s.dual??=new DualReadySurface(s.actor,1);s.dual.paint(r,now,reduced(),side);}else s.dual?.hide();
  paintRestingAppearance(s.actor.el,ready?'ready':blocked?'blocked':'plain',!!n.dataset.monsterAura,now,1,reduced(),r.w);
  for(const cls of ['is-aiming','is-atk-target','is-targetable'])s.actor.el.classList.toggle(cls,n.classList.contains(cls));
  if(n.classList.contains('is-atk-target')||n.classList.contains('is-targetable'))s.actor.el.style.setProperty('filter','drop-shadow(0 0 5px #ff7955)','important');
  s.actor.el.style.removeProperty('translate');delete s.actor.el.dataset.hitReaction;paintHit(n,s.actor,now);
  if(ready&&!dual)drawEffect(s.layer.foreground,'ready','C',t,r,r,{active:true,reduced:reduced(),side,pass:'front'});
 }
 for(const j of [...jobs.values()]){
  if(!active)break;
  if(!j.source.isConnected||document.hidden||j.options.signal?.aborted){j.finish(false);continue;}
  const t=Math.min(1,(now-j.start)/j.ms),o=j.options;
  const impact=j.kind==='attack'?270:Infinity;
  if(!j.impacted&&(now-j.start>=impact||reduced())){j.impacted=true;o.onImpact?.();}
  // Multi-attack returns to its ready state without a false exhausted interval.
  const paintT=j.kind==='attack'&&(o.tempo||o.exhaust===false)?Math.min(t*j.ms,819)/2800:t;
  j.actor.paint(j.kind,j.variant,paintT,j.r,j.target,reduced(),true,o.side??1,j.destination);
  for(const pass of ['rear','front'] as const)drawEffect(pass==='rear'?active.back:active.foreground,j.kind,j.variant,paintT,j.r,j.target,{active:true,reduced:reduced(),side:o.side??1,destination:j.destination,pass});
  if(j.kind==='attack'&&!o.tempo&&o.target?.matches('.card')&&!reduced()&&!gutsJobs.has(o.target)){
   const at=paintT*2800/820,ct=270/820,hit=ease(ct,ct+.015,at)*(1-ease(ct+.05,ct+.22,at));
   if(hit>0){
    if(!j.hit){j.hit={actor:new Actor(o.target,active.cards),node:o.target,opacity:o.target.style.opacity};o.target.style.opacity='0';}
    states.get(o.target)?.actor.hide();
    const a=j.hit.actor,tr=j.target,dx=tr.x-j.r.x,dy=tr.y-j.r.y,len=Math.hypot(dx,dy)||1;
    a.paint('trigger','A',0,tr,tr,true);a.style(a.el,tr,tr.x+dx/len*j.r.w*.085*hit,tr.y+dy/len*j.r.w*.085*hit,0,1);
    a.el.style.setProperty('filter',`brightness(${1+hit*.15})`,'important');a.el.dataset.monsterKind='contact';
   }else if(j.hit){j.hit.actor.dispose();j.hit.node.style.opacity=j.hit.opacity;j.hit=undefined;}
  }
  if(j.kind==='attack'&&o.tempo&&o.exhaust!==false&&j.impacted){
   const q=ease(270,450,now-j.start);j.actor.el.style.setProperty('filter',`grayscale(${q}) brightness(${1-.43*q})`,'important');
  }
  j.actor.el.style.removeProperty('translate');delete j.actor.el.dataset.hitReaction;paintHit(j.source,j.actor,now);
  if(t>=1)j.finish(true);
 }
 for(const j of [...gutsJobs.values()]){
  if(!j.source.isConnected){j.finish(false);continue;}
  const age=now-j.start;
  if(age>=j.ms){j.finish(true);continue;}
  j.surface.render(age,reduced(),j.r.w);j.actor.el.dataset.gutsTime=String(Math.round(age));
 }
 release();for(const root of observers.keys())observeField(root);if(jobs.size||gutsJobs.size||animated)schedule();
}
/** The same foreground owner as attacks, so a contact clone cannot cover the membrane. */
export function playGutsEndurance(source:HTMLElement,result:GutsSurvival,signal?:AbortSignal,direction=source.closest('#oppRow')?-1:1):Promise<boolean>{
 if(skipped||document.hidden||!source.isConnected||signal?.aborted||!combatRect(source))return Promise.resolve(false);
 gutsJobs.get(source)?.finish(false);
 removeState(source);
 const r=monsterRect(source),layer=ensure(),opacity=source.style.opacity;
 const actor=new Actor(source,layer.cards);
 actor.style(actor.el,r,r.x,r.y,0,1);actor.el.style.display='block';actor.el.dataset.gutsEndurance='04';
 actor.el.dataset.gutsUid=result.uid;
 const surface=new AmberSurface(actor.el,direction);
 showGutsResult(actor.el,result);showGutsResult(source,result);source.style.opacity='0';
 return new Promise(resolve=>{
  let settled=false;
  const abort=()=>finish(false);
  const timer=setTimeout(abort,GUTS_DURATION+500);
  const finish=(complete:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);surface.dispose();actor.dispose();source.style.opacity=opacity;gutsJobs.delete(source);resolve(complete);release();};
  gutsJobs.set(source,{source,actor,surface,start:performance.now(),ms:reduced()?280:GUTS_DURATION,r,finish});
  signal?.addEventListener('abort',abort,{once:true});surface.render(0,reduced(),r.w);schedule();
 });
}
export function playMonster(source:HTMLElement,kind:Kind,options:Options={}):Promise<boolean>{
 cancelSilenceSummon(source);cancelVoidSummon(source);cancelCasinoSummon(source);cancelGolem(source);cancelTribeSummon(source);cancelRiftDestruction(source);cancelSummon(source);jobs.get(source)?.finish(false);
 if(skipped||!source.isConnected||options.signal?.aborted)return Promise.resolve(false);
 if(kind==='destroy'&&options.variant==='B'&&options.destination){removeState(source);release();return playRiftDestruction(source,options.destination,options.signal);}
 if(kind==='summon'&&isSilenceSummon(source.dataset.cardId))return playSilenceSummon(source,options);
 if(kind==='summon'&&isVoidSummon(source.dataset.cardId))return playVoidSummon(source,options);
 if(kind==='summon'&&isCasino(source.dataset.cardId))return playCasinoSummon(source,options);
 if(kind==='summon'&&isCastle(source.dataset.cardId))return playSlateSummon(source,options);
 if(kind==='summon'&&isPoisonSummon(source.dataset.cardId))return playSlateSummon(source,options);
 if(kind==='summon'&&(isShieldTitan(source.dataset.cardId)||isAssassin(source.dataset.cardId)))return playSlateSummon(source,options);
 if(kind==='summon'&&isGolem(source.dataset.cardId))return playGolem(source,options);
 if(kind==='summon')return selectedTribeSummon(source.dataset.cardId)?playTribeSummon(source,options):playSlateSummon(source,options);
 if(kind==='destroy'&&options.variant==='A'&&options.mana!==false&&options.destination){removeState(source);release();return playManaDestruction(source,options.destination,options.signal);}
 if(!combatRect(options.anchor??source)||(options.target&&!combatRect(options.target)))return Promise.resolve(false);
 const r=monsterRect(options.anchor??source);
 const variant=options.variant??(kind==='attack'?'A':kind==='aura'||kind==='ready'?'C':'B');
 if(kind==='destroy'&&!options.destination)return Promise.resolve(false);
 const layer=ensure(),actor=new Actor(source,layer.cards);actor.stats=options.stats;actor.el.dataset.monsterKind=kind;actor.el.dataset.monsterVariant=variant;
 const dest=options.destination?monsterRect(options.destination):undefined;if(dest)delete dest.matrix;
 const oldOpacity=source.style.opacity;source.style.opacity='0';
 return new Promise(resolve=>{
  let settled=false;const abort=()=>finish(false);
  const timer=setTimeout(abort,6000);
  const finish=(complete:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);actor.dispose();if(j.hit){j.hit.actor.dispose();j.hit.node.style.opacity=j.hit.opacity;}source.style.opacity=oldOpacity;jobs.delete(source);resolve(complete);release();};
  const j:Job={source,actor,kind,variant,start:performance.now(),ms:(reduced()?100:kind==='attack'&&(options.tempo||options.exhaust===false)?820:duration(kind,variant))*(kind==='trigger'||kind==='destroy'?SPECIAL_FX.durationScale:1),r,target:options.target?monsterRect(options.target):r,destination:dest,options,opacity:oldOpacity,finish,impacted:false};
  jobs.set(source,j);options.signal?.addEventListener('abort',abort,{once:true});schedule();
 });
}
window.addEventListener('resize',()=>{for(const j of [...gutsJobs.values()])j.finish(false);for(const j of [...jobs.values()])j.finish(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const j of [...gutsJobs.values()])j.finish(false);for(const j of [...jobs.values()])j.finish(false);cancelAnimationFrame(frame);frame=0;}else invalidateGeometry();});
window.addEventListener('resize',invalidateGeometry);
document.addEventListener('scroll',invalidateGeometry,true);
document.addEventListener('lore:board-projected',invalidateGeometry);
motion.addEventListener('change',()=>{for(const j of [...gutsJobs.values()])j.finish(false);invalidateGeometry();});
