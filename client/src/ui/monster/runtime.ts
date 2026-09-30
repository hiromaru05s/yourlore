import {Actor} from './actor';
import {duration,ease, type Kind, type Variant, type Rect} from './catalog';
import {drawEffect, ongoingFilter} from './renderer';
import {mountAnimationLayers} from './layers';
import {projectedPlacement} from '../boardProjection';

/** Transient actions use the foreground; persistent states belong to the board. */
type Layers=ReturnType<typeof mountAnimationLayers>;
let layers:Layers|undefined;
const fieldLayers=new Map<HTMLElement,Layers>();
let frame=0, skipped=false;
const jobs=new Map<HTMLElement,Job>();
const states=new Map<HTMLElement,{actor:Actor;opacity:string;root:HTMLElement;layer:Layers}>();
type Options={variant?:Variant;anchor?:HTMLElement;target?:HTMLElement;destination?:HTMLElement;side?:number;signal?:AbortSignal;onImpact?:()=>void;exhaust?:boolean;stats?:Actor['stats']};
type Job={source:HTMLElement;actor:Actor;kind:Kind;variant:Variant;start:number;ms:number;r:Rect;target:Rect;destination?:Rect;options:Options;opacity:string;finish:(complete:boolean)=>void;impacted:boolean;hit?:{actor:Actor;node:HTMLElement;opacity:string}};
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
export function monsterRect(n:HTMLElement):Rect{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,matrix:projectedPlacement(n,r.width,r.height)};}
function ensure(){if(!layers){layers=mountAnimationLayers(document.body,true);layers.root.setAttribute('aria-hidden','true');}return layers;}
function ensureField(root:HTMLElement){
 let layer=fieldLayers.get(root);
 if(!layer){layer=mountAnimationLayers(root.querySelector<HTMLElement>('.stage')??root,false,'field');layer.root.setAttribute('aria-hidden','true');fieldLayers.set(root,layer);}
 return layer;
}
function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
function removeState(n:HTMLElement){const s=states.get(n);if(!s)return;s.actor.dispose();n.style.opacity=s.opacity;states.delete(n);}
export function syncMonsterStates(root:HTMLElement){
 for(const [n,s] of states)if(s.root===root||!n.isConnected)removeState(n);
 if(!root.isConnected){release();return;}
 for(const n of root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')){
  if(!n.classList.contains('is-attacker')&&!n.dataset.monsterAura&&!n.dataset.monsterBlocked)continue;
  const layer=ensureField(root),actor=new Actor(n,layer.cards);states.set(n,{actor,root,layer,opacity:n.style.opacity});n.style.opacity='0';
 }
 release();if(states.size)schedule();
}
export function clearMonsterStates(root:HTMLElement){for(const j of [...jobs.values()])if(root.contains(j.source))j.finish(false);for(const [n,s] of states)if(s.root===root)removeState(n);release();}
export function setMonsterSkip(value:boolean){skipped=value;if(value)for(const j of [...jobs.values()])j.finish(false);}
function release(){
 for(const [root,layer] of fieldLayers)if(![...states.values()].some(s=>s.root===root)){layer.dispose();fieldLayers.delete(root);}
 if(!jobs.size){layers?.dispose();layers=undefined;}
 if(!states.size&&!jobs.size){cancelAnimationFrame(frame);frame=0;}
}
function tick(now:number){
 frame=0;const active=layers;active?.begin(innerWidth,innerHeight);
 for(const layer of fieldLayers.values())layer.begin(innerWidth,innerHeight);
 for(const [n,s] of states){
  if(!n.isConnected){removeState(n);continue;}
  if(jobs.has(n)||[...jobs.values()].some(j=>j.hit?.node===n)||n.classList.contains('is-dragging')||n.style.visibility==='hidden'||document.hidden){s.actor.hide();continue;}
  const r=monsterRect(n),ready=n.classList.contains('is-attacker'),blocked=!!n.dataset.monsterBlocked;
  const k=ready?'ready':blocked?'blocked':'aura',v=ready?'C':blocked?'B':'C',t=ready?(now%2200)/2200:blocked?1:(now%4400)/4400;
  s.actor.paint(k,v,t,r,r,reduced(),true,n.closest('#oppRow')?-1:1);s.actor.el.dataset.monsterKind=k;s.actor.el.dataset.monsterVariant=v;
  if(n.dataset.monsterAura){
   if(!ready&&!blocked)s.actor.el.style.setProperty('filter',ongoingFilter('C',t,reduced()),'important');
   else {const f=s.actor.el.style.filter;s.actor.el.style.setProperty('filter',`${f} ${ongoingFilter('C',(now%4400)/4400,reduced()).replace('drop-shadow(0 2px 4px #0009)','')}`,'important');}
  }
  for(const cls of ['is-aiming','is-atk-target','is-targetable'])s.actor.el.classList.toggle(cls,n.classList.contains(cls));
  if(n.classList.contains('is-atk-target')||n.classList.contains('is-targetable'))s.actor.el.style.setProperty('filter',s.actor.el.style.filter+' drop-shadow(0 0 5px #ff7955)','important');
  if(ready)drawEffect(s.layer.foreground,'ready','C',t,r,r,{active:true,reduced:reduced(),side:n.closest('#oppRow')?-1:1,pass:'front'});
 }
 for(const j of [...jobs.values()]){
  if(!active)break;
  if(!j.source.isConnected||document.hidden||j.options.signal?.aborted){j.finish(false);continue;}
  const t=Math.min(1,(now-j.start)/j.ms),o=j.options;
  const impact=j.kind==='attack'?270:j.kind==='summon'?506:Infinity;
  if(!j.impacted&&(now-j.start>=impact||reduced())){j.impacted=true;o.onImpact?.();}
  // Multi-attack returns to its ready state without a false exhausted interval.
  const paintT=j.kind==='attack'&&o.exhaust===false?Math.min(t*j.ms,819)/2800:t;
  j.actor.paint(j.kind,j.variant,paintT,j.r,j.target,reduced(),true,o.side??1,j.destination);
  for(const pass of ['rear','front'] as const)drawEffect(pass==='rear'?active.back:active.foreground,j.kind,j.variant,paintT,j.r,j.target,{active:true,reduced:reduced(),side:o.side??1,destination:j.destination,pass});
  if(j.kind==='attack'&&o.target?.matches('.card')&&!reduced()){
   const at=paintT*2800/820,ct=270/820,hit=ease(ct,ct+.015,at)*(1-ease(ct+.05,ct+.22,at));
   if(hit>0){
    if(!j.hit){j.hit={actor:new Actor(o.target,active.cards),node:o.target,opacity:o.target.style.opacity};o.target.style.opacity='0';}
    states.get(o.target)?.actor.hide();
    const a=j.hit.actor,tr=j.target,dx=tr.x-j.r.x,dy=tr.y-j.r.y,len=Math.hypot(dx,dy)||1;
    a.paint('trigger','A',0,tr,tr,true);a.style(a.el,tr,tr.x+dx/len*j.r.w*.085*hit,tr.y+dy/len*j.r.w*.085*hit,0,1);
    a.el.style.setProperty('filter',`brightness(${1+hit*.15})`,'important');a.el.dataset.monsterKind='contact';
   }else if(j.hit){j.hit.actor.dispose();j.hit.node.style.opacity=j.hit.opacity;j.hit=undefined;}
  }
  if(t>=1)j.finish(true);
 }
 release();if(jobs.size||states.size)schedule();
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
  const finish=(complete:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);actor.dispose();if(j.hit){j.hit.actor.dispose();j.hit.node.style.opacity=j.hit.opacity;}source.style.opacity=oldOpacity;jobs.delete(source);resolve(complete);release();};
  const j:Job={source,actor,kind,variant,start:performance.now(),ms:reduced()?100:kind==='attack'&&options.exhaust===false?820:duration(kind,variant),r,target:options.target?monsterRect(options.target):r,destination:dest,options,opacity:oldOpacity,finish,impacted:false};
  jobs.set(source,j);options.signal?.addEventListener('abort',abort,{once:true});schedule();
 });
}
window.addEventListener('resize',()=>{for(const j of [...jobs.values()])j.finish(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const j of [...jobs.values()])j.finish(false);});
