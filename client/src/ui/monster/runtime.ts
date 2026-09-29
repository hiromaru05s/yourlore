import {Actor} from './actor';
import {duration, type Kind, type Variant, type Rect} from './catalog';
import {drawEffect, ongoingFilter} from './renderer';
import {mountAnimationLayers} from './layers';
import {projectedPlacement} from '../boardProjection';

/** One foreground compositor for physical cards, shadows and contact effects. */
let layers:ReturnType<typeof mountAnimationLayers>|undefined;
let frame=0, skipped=false;
const jobs=new Map<HTMLElement,Job>();
const states=new Map<HTMLElement,{actor:Actor;opacity:string;root:HTMLElement}>();
type Options={variant?:Variant;anchor?:HTMLElement;target?:HTMLElement;destination?:HTMLElement;side?:number;signal?:AbortSignal;onImpact?:()=>void;exhaust?:boolean;stats?:Actor['stats']};
type Job={source:HTMLElement;actor:Actor;kind:Kind;variant:Variant;start:number;ms:number;r:Rect;target:Rect;destination?:Rect;options:Options;opacity:string;finish:(complete:boolean)=>void;impacted:boolean};
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
export function monsterRect(n:HTMLElement):Rect{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,matrix:projectedPlacement(n,r.width,r.height)};}
function ensure(){if(!layers){layers=mountAnimationLayers(document.body,true);layers.root.setAttribute('aria-hidden','true');}return layers;}
function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
function removeState(n:HTMLElement){const s=states.get(n);if(!s)return;s.actor.dispose();n.style.opacity=s.opacity;states.delete(n);}
export function syncMonsterStates(root:HTMLElement){
 for(const [n,s] of states)if(s.root===root||!n.isConnected)removeState(n);
 if(!root.isConnected)return;
 for(const n of root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')){
  if(!n.classList.contains('is-attacker')&&!n.dataset.monsterAura&&!n.dataset.monsterBlocked)continue;
  const actor=new Actor(n,ensure().cards);states.set(n,{actor,root,opacity:n.style.opacity});n.style.opacity='0';
 }
 if(states.size)schedule();
}
export function clearMonsterStates(root:HTMLElement){for(const j of [...jobs.values()])if(root.contains(j.source))j.finish(false);for(const [n,s] of states)if(s.root===root)removeState(n);release();}
export function setMonsterSkip(value:boolean){skipped=value;if(value)for(const j of [...jobs.values()])j.finish(false);}
function release(){if(!states.size&&!jobs.size){cancelAnimationFrame(frame);frame=0;layers?.dispose();layers=undefined;}}
function tick(now:number){
 frame=0;if(!layers)return;layers.begin(innerWidth,innerHeight);
 for(const [n,s] of states){
  if(!n.isConnected){removeState(n);continue;}
  if(jobs.has(n)||n.classList.contains('is-dragging')||n.style.visibility==='hidden'||document.hidden){s.actor.hide();continue;}
  const r=monsterRect(n),ready=n.classList.contains('is-attacker'),blocked=!!n.dataset.monsterBlocked;
  const k=ready?'ready':blocked?'blocked':'aura',v=ready?'C':blocked?'B':'C',t=ready?(now%2200)/2200:blocked?1:(now%4400)/4400;
  s.actor.paint(k,v,t,r,r,reduced(),true,n.closest('#oppRow')?-1:1);s.actor.el.dataset.monsterKind=k;s.actor.el.dataset.monsterVariant=v;
  if(n.dataset.monsterAura){
   if(!ready&&!blocked)s.actor.el.style.setProperty('filter',ongoingFilter('C',t,reduced()),'important');
   else {const f=s.actor.el.style.filter;s.actor.el.style.setProperty('filter',`${f} ${ongoingFilter('C',(now%4400)/4400,reduced()).replace('drop-shadow(0 2px 4px #0009)','')}`,'important');}
  }
  for(const cls of ['is-aiming','is-atk-target','is-targetable'])s.actor.el.classList.toggle(cls,n.classList.contains(cls));
  if(n.classList.contains('is-atk-target')||n.classList.contains('is-targetable'))s.actor.el.style.setProperty('filter',s.actor.el.style.filter+' drop-shadow(0 0 5px #ff7955)','important');
  if(ready)drawEffect(layers.foreground,'ready','C',t,r,r,{active:true,reduced:reduced(),side:n.closest('#oppRow')?-1:1,pass:'front'});
 }
 for(const j of [...jobs.values()]){
  if(!j.source.isConnected||document.hidden||j.options.signal?.aborted){j.finish(false);continue;}
  const t=Math.min(1,(now-j.start)/j.ms),o=j.options;
  const impact=j.kind==='attack'?270:j.kind==='summon'?506:Infinity;
  if(!j.impacted&&(now-j.start>=impact||reduced())){j.impacted=true;o.onImpact?.();}
  // Multi-attack returns to its ready state without a false exhausted interval.
  const paintT=j.kind==='attack'&&o.exhaust===false?Math.min(t*j.ms,819)/2800:t;
  j.actor.paint(j.kind,j.variant,paintT,j.r,j.target,reduced(),true,o.side??1,j.destination);
  for(const pass of ['rear','front'] as const)drawEffect(pass==='rear'?layers.back:layers.foreground,j.kind,j.variant,paintT,j.r,j.target,{active:true,reduced:reduced(),side:o.side??1,destination:j.destination,pass});
  if(t>=1)j.finish(true);
 }
 if(jobs.size||states.size)schedule();else release();
}
export function playMonster(source:HTMLElement,kind:Kind,options:Options={}):Promise<boolean>{
 jobs.get(source)?.finish(false);
 if(skipped||!source.isConnected||options.signal?.aborted)return Promise.resolve(false);
 const r=monsterRect(options.anchor??source);if(!r.w||!r.h)return Promise.resolve(false);
 const variant=options.variant??(kind==='attack'?'A':kind==='aura'||kind==='ready'?'C':'B');
 if(kind==='destroy'&&!options.destination)return Promise.resolve(false);
 const layer=ensure(),actor=new Actor(source,layer.cards);actor.stats=options.stats;actor.el.dataset.monsterKind=kind;actor.el.dataset.monsterVariant=variant;
 const dest=options.destination?monsterRect(options.destination):undefined;if(dest)delete dest.matrix;
 const oldOpacity=source.style.opacity;source.style.opacity='0';
 return new Promise(resolve=>{
  let settled=false;const abort=()=>finish(false);
  const timer=setTimeout(abort,6000);
  const finish=(complete:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);actor.dispose();source.style.opacity=oldOpacity;jobs.delete(source);resolve(complete);release();};
  const j:Job={source,actor,kind,variant,start:performance.now(),ms:reduced()?100:kind==='attack'&&options.exhaust===false?820:duration(kind,variant),r,target:options.target?monsterRect(options.target):r,destination:dest,options,opacity:oldOpacity,finish,impacted:false};
  jobs.set(source,j);options.signal?.addEventListener('abort',abort,{once:true});schedule();
 });
}
window.addEventListener('resize',()=>{for(const j of [...jobs.values()])j.finish(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const j of [...jobs.values()])j.finish(false);});
