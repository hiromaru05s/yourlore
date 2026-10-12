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
import {drawEffect, ongoingFilter} from './renderer';
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
const states=new Map<HTMLElement,{actor:Actor;opacity:string;root:HTMLElement;layer:Layers;rect?:Rect;dirty:boolean}>();
type Options={mana?:boolean;variant?:Variant;anchor?:HTMLElement;target?:HTMLElement;destination?:HTMLElement;side?:number;signal?:AbortSignal;onImpact?:()=>void;exhaust?:boolean;stats?:Actor['stats']};
type Job={source:HTMLElement;actor:Actor;kind:Kind;variant:Variant;start:number;ms:number;r:Rect;target:Rect;destination?:Rect;options:Options;opacity:string;finish:(complete:boolean)=>void;impacted:boolean;hit?:{actor:Actor;node:HTMLElement;opacity:string}};
const reduced=()=>motion.matches;
export function monsterRect(n:HTMLElement):Rect{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,matrix:projectedPlacement(n,r.width,r.height)};}
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
 for(const [n,s] of states)if(s.root===root)observer.observe(n,{attributes:true,attributeFilter:['class','style','data-monster-aura','data-monster-blocked']});
 for(const zone of root.querySelectorAll('.zone-mon'))observer.observe(zone,{childList:true,subtree:true,attributes:true,attributeFilter:['data-reserved-uid']});
}
function removeState(n:HTMLElement){const s=states.get(n);if(!s)return;s.actor.dispose();n.style.opacity=s.opacity;states.delete(n);}
export function syncMonsterStates(root:HTMLElement){
 for(const [n,s] of states)if(s.root===root||!n.isConnected)removeState(n);
 if(!root.isConnected){release();return;}
 for(const n of root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')){
  if(!n.classList.contains('is-attacker')&&!n.dataset.monsterAura&&!n.dataset.monsterBlocked)continue;
  const layer=ensureField(root),actor=new Actor(n,layer.cards,2);states.set(n,{actor,root,layer,opacity:n.style.opacity,dirty:true});n.style.opacity='0';
 }
 if([...states.values()].some(s=>s.root===root))observeField(root);release();if(states.size)schedule();
}
export function clearMonsterStates(root:HTMLElement){cancelGolems(root);cancelTribeSummons(root);cancelRiftDestruction(root);cancelManaDestruction(root);cancelSummons(root);for(const j of [...jobs.values()])if(root.contains(j.source))j.finish(false);for(const [n,s] of states)if(s.root===root)removeState(n);release();}
export function setMonsterSkip(value:boolean){skipped=value;if(value){cancelGolems();cancelTribeSummons();cancelSummons();cancelRiftDestruction();cancelManaDestruction();}if(value)for(const j of [...jobs.values()])j.finish(false);}
function release(){
 for(const [root,layer] of fieldLayers)if(![...states.values()].some(s=>s.root===root)){layer.dispose();fieldLayers.delete(root);observers.get(root)?.disconnect();observers.delete(root);}
 if(!jobs.size){layers?.dispose();layers=undefined;}
 if(!states.size&&!jobs.size){cancelAnimationFrame(frame);frame=0;}
}
function tick(now:number){
 frame=0;if(document.hidden)return;
 const active=layers;active?.begin(innerWidth,innerHeight);
 // Measure all dirty sources before touching clone styles. Idle geometry stays cached
 // until board projection, resize, scrolling, rendering or source style changes.
 for(const [n,s] of states)if(n.isConnected&&(!s.rect||n.getAnimations().length)){s.rect=monsterRect(n);s.dirty=true;}
 const hidden=new Set<HTMLElement>(jobs.keys());for(const job of jobs.values())if(job.hit)hidden.add(job.hit.node);
 const readyLayers=new Set<Layers>();for(const [n,s] of states)if(n.classList.contains('is-attacker')||s.dirty)readyLayers.add(s.layer);
 for(const layer of readyLayers)layer.begin(innerWidth,innerHeight);
 let animated=false;
 for(const [n,s] of states){
  if(!n.isConnected){removeState(n);continue;}
  if(hidden.has(n)||n.classList.contains('is-dragging')||n.style.visibility==='hidden'){s.actor.hide();s.dirty=true;continue;}
  const r=s.rect!,ready=n.classList.contains('is-attacker'),blocked=!!n.dataset.monsterBlocked;
  const dynamic=n.getAnimations().length>0||!reduced()&&(ready||!!n.dataset.monsterAura);animated||=dynamic;
  if(!s.dirty&&!dynamic){if(ready)drawEffect(s.layer.foreground,'ready','C',0,r,r,{active:true,reduced:true,side:n.closest('#oppRow')?-1:1,pass:'front'});continue;}
  s.dirty=false;
  const side=n.closest('#oppRow')?-1:1;
  const k=ready?'ready':blocked?'blocked':'aura',v=ready?'C':blocked?'B':'C',t=ready?(now%2200)/2200:blocked?1:(now%4400)/4400;
  s.actor.paint(k,v,t,r,r,reduced(),true,side);s.actor.el.dataset.monsterKind=k;s.actor.el.dataset.monsterVariant=v;
  if(n.dataset.monsterAura){
   if(!ready&&!blocked)s.actor.el.style.setProperty('filter',ongoingFilter('C',t,reduced()),'important');
   else {const f=s.actor.el.style.filter;s.actor.el.style.setProperty('filter',`${f} ${ongoingFilter('C',(now%4400)/4400,reduced()).replace('drop-shadow(0 2px 4px #0009)','')}`,'important');}
  }
  for(const cls of ['is-aiming','is-atk-target','is-targetable'])s.actor.el.classList.toggle(cls,n.classList.contains(cls));
  if(n.classList.contains('is-atk-target')||n.classList.contains('is-targetable'))s.actor.el.style.setProperty('filter',s.actor.el.style.filter+' drop-shadow(0 0 5px #ff7955)','important');
  if(ready)drawEffect(s.layer.foreground,'ready','C',t,r,r,{active:true,reduced:reduced(),side,pass:'front'});
 }
 for(const j of [...jobs.values()]){
  if(!active)break;
  if(!j.source.isConnected||document.hidden||j.options.signal?.aborted){j.finish(false);continue;}
  const t=Math.min(1,(now-j.start)/j.ms),o=j.options;
  const impact=j.kind==='attack'?270:Infinity;
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
 release();if(jobs.size||animated)schedule();
}
export function playMonster(source:HTMLElement,kind:Kind,options:Options={}):Promise<boolean>{
 cancelGolem(source);cancelTribeSummon(source);cancelRiftDestruction(source);cancelSummon(source);jobs.get(source)?.finish(false);
 if(skipped||!source.isConnected||options.signal?.aborted)return Promise.resolve(false);
 if(kind==='destroy'&&options.variant==='B'&&options.destination){removeState(source);release();return playRiftDestruction(source,options.destination,options.signal);}
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
  const j:Job={source,actor,kind,variant,start:performance.now(),ms:reduced()?100:kind==='attack'&&options.exhaust===false?820:duration(kind,variant),r,target:options.target?monsterRect(options.target):r,destination:dest,options,opacity:oldOpacity,finish,impacted:false};
  jobs.set(source,j);options.signal?.addEventListener('abort',abort,{once:true});schedule();
 });
}
window.addEventListener('resize',()=>{for(const j of [...jobs.values()])j.finish(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const j of [...jobs.values()])j.finish(false);cancelAnimationFrame(frame);frame=0;}else invalidateGeometry();});
window.addEventListener('resize',invalidateGeometry);
document.addEventListener('scroll',invalidateGeometry,true);
document.addEventListener('lore:board-projected',invalidateGeometry);
motion.addEventListener('change',invalidateGeometry);
