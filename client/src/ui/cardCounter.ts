import type {CardInst,FieldMon,Enchant} from '../shared/types';
import {getLang} from '../i18n';
import {passiveIconUrl} from './passiveIcon';
import {decayStateDescription} from '../shared/cardPresentation';
import './cardCounter.css';
import {gaugeMarkup, fillGauge} from './decayCounter/gauge';

export type CounterKind='guts'|'decay'|'hatch'|'charge';
export type CounterValue={kind:CounterKind;value:number};
type Identity=CounterValue&{uid:string;cardId:string;index:number;transient?:boolean};
type Motion={from:number;to:number;start:number;duration:number;remove?:boolean};
export const COUNTER_SLOT_MS=520;
const identities=new WeakMap<HTMLElement,Identity>(),motions=new WeakMap<HTMLElement,Motion>();
const active=new Map<HTMLElement,Motion>();
let sequence=0,raf=0,listening=false;
const count=(n:number)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
export function counterPosition(from:number,to:number,progress:number){const p=Math.max(0,Math.min(1,progress));return from+(to-from)*p*p*(3-2*p);}
export function fieldCounters(card:CardInst,onField=false):CounterValue[]{
 if(!onField)return [];
 const m=card as FieldMon,result:CounterValue[]=[];
 if(card.hatchTurns!=null)result.push({kind:'hatch',value:count(m.hatch??card.hatchTurns)});
 if((m.guts??0)>0||(m.guts!=null&&((card.passive??[]).includes('guts')||m.passivesG?.includes('guts')||m.conditionalPassives?.includes('guts'))))result.push({kind:'guts',value:count(m.guts??0)});
 if(m.gcount!=null||(onField&&(['casino','assassinGuild','vampButler'].includes(card.aura??'')||card.id==='CASTLE')))result.push({kind:'charge',value:count(m.gcount??0)});
 if((m.decayCnt??0)>0)result.push({kind:'decay',value:count(m.decayCnt!)});
 return result;
}
export function enchantCounterValue(e:Enchant):number|null {
 return e.cnt!=null||e.card.ench==='guild'||e.card.ench==='brewing'?count(e.cnt??0):null;
}
function description(kind:CounterKind,value:number){
 const lang=getLang();
 if(kind==='decay')return decayStateDescription(value,lang);
 const labels={ja:{guts:'気合',hatch:'孵化',charge:'カウンター'},en:{guts:'Guts',hatch:'Hatch',charge:'Counter'},ko:{guts:'기합',hatch:'부화',charge:'카운터'}};
 return `${labels[lang][kind]} ${value}`;
}
function rows(position:number){
 const base=Math.floor(position+1e-8),fraction=position-base;
 const row=(value:number,y:number)=>{const digits=String(value).length,size=digits===1?24:digits===2?22:digits===3?18:54/digits;return `<text class="counter-slot-digit" data-value="${value}" x="32" y="29.5" dominant-baseline="central" transform="translate(0 ${y})" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="${size}" fill="#28352e">${value}</text>`;};
 return row(base,-fraction*32)+(fraction>1e-7?row(base+1,(1-fraction)*32):'');
}
function counterFace(id:string):string {
 return `<svg viewBox="0 0 64 36" preserveAspectRatio="none" aria-hidden="true" focusable="false">
   <defs>
     <linearGradient id="${id}silver" x2=".7" y2="1"><stop stop-color="#e8edf0"/><stop offset=".27" stop-color="#7e99a6"/><stop offset=".54" stop-color="#d5e1e8"/><stop offset="1" stop-color="#5e7783"/></linearGradient>
     <linearGradient id="${id}navy" x2=".25" y2="1"><stop stop-color="#233d51"/><stop offset=".52" stop-color="#122737"/><stop offset="1" stop-color="#102231"/></linearGradient>
     <clipPath id="${id}clip"><rect x="16" y="3" width="45" height="30"/></clipPath>
   </defs>
   <path d="M10 0H64V28L56 36H0V15Z" fill="url(#${id}silver)"/>
   <path d="M11 2H62V27L55 34H2V16Z" fill="url(#${id}navy)"/>
   <path d="M12 14l4 4-4 4-4-4z" fill="#92b6c7"/>
   <g clip-path="url(#${id}clip)"><g class="counter-slot-reel" transform="translate(37 17.8) scale(1.18) translate(-32 -29.5)"></g></g>
 </svg>`;
}
function gutsFace(id:string):string {
 return `<span class="guts-counter-plate" aria-hidden="true"></span>
   <img class="guts-counter-icon" src="${passiveIconUrl('guts')}" alt="">
   <svg class="guts-counter-value" viewBox="0 0 64 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
     <defs><clipPath id="${id}clip"><rect width="64" height="64"/></clipPath></defs>
     <g clip-path="url(#${id}clip)"><g class="counter-slot-reel" transform="translate(32 32) scale(2) translate(-32 -29.5)"></g></g>
   </svg>`;
}
/** Keep Guts in the status band, including its temporary depletion reel. */
export function attachCardCounter(host:HTMLElement,badge:HTMLElement):void {
 if(badge.dataset.counterKind!=='guts'){host.append(badge);return;}
 let band=host.querySelector<HTMLElement>('.card-status');
 if(!band){band=document.createElement('div');band.className='card-status';host.append(band);}
 const icon=band.querySelector('[data-psv="guts"]');
 if(icon)icon.replaceWith(badge);else band.append(badge);
}
function paint(badge:HTMLElement,position:number){
 if (badge.dataset.counterKind === 'decay') fillGauge(badge, position);
 else badge.querySelector('.counter-slot-reel')!.innerHTML=rows(position);
 badge.dataset.counterPosition=String(position);
}
function label(badge:HTMLElement,value:number){const meta=identities.get(badge)!;meta.value=value;badge.dataset.counterValue=String(value);badge.title=description(meta.kind,value);badge.setAttribute('aria-label',badge.title);}
export function createCardCounter(uid:string,cardId:string,kind:CounterKind,value:number,index=0):HTMLElement{
 const n=count(value),id='lore-counter-'+(++sequence),badge=document.createElement('span');
 badge.className='card-counter'+(kind==='decay'?' ec-decay-state':'');badge.dataset.counterKind=kind;badge.dataset.counterIndex=String(index);badge.style.setProperty('--counter-index',String(index));
 if(kind==='decay')badge.dataset.status='decay';
 if(kind==='guts')badge.dataset.psv='guts';
 badge.setAttribute('role','img');identities.set(badge,{uid,cardId,kind,value:n,index});
 badge.innerHTML=kind === 'decay' ? gaugeMarkup(id) : kind === 'guts' ? gutsFace(id) : counterFace(id);
 label(badge,n);paint(badge,n);return badge;
}
function position(badge:HTMLElement,now=performance.now()){const m=motions.get(badge);return m?counterPosition(m.from,m.to,(now-m.start)/m.duration):identities.get(badge)?.value??0;}
function reduced(){return document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function settle(){for(const [badge,m]of active){paint(badge,m.to);motions.set(badge,{from:m.to,to:m.to,start:0,duration:1});if(m.remove)badge.remove();}active.clear();if(raf)cancelAnimationFrame(raf);raf=0;unlisten();}
const visibility=()=>{if(document.hidden)settle();};
function unlisten(){if(!listening)return;listening=false;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',settle);}
function tick(now:number){raf=0;for(const [badge,m]of active){if(!badge.isConnected){active.delete(badge);continue;}const done=now-m.start>=m.duration||reduced();paint(badge,done?m.to:position(badge,now));if(done){active.delete(badge);motions.set(badge,{from:m.to,to:m.to,start:0,duration:1});if(m.remove)badge.remove();}}if(active.size)raf=requestAnimationFrame(tick);else unlisten();}
function schedule(){if(!listening){listening=true;document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',settle);}if(!raf)raf=requestAnimationFrame(tick);}
export function setCardCounter(badge:HTMLElement,to:number,opt:{from?:number;animate?:boolean;remove?:boolean}={}){
 const n=count(to),old=motions.get(badge),sampled=position(badge);label(badge,n);
 if(opt.from==null&&old?.to===n&&active.has(badge)){if(opt.animate!==false&&!reduced())return;}
 const from=opt.from??sampled;
 active.delete(badge);
 if(opt.animate===false||reduced()||Math.abs(from-n)<1e-7){motions.set(badge,{from:n,to:n,start:0,duration:1});paint(badge,n);if(opt.remove)badge.remove();return;}
 const motion={from,to:n,start:performance.now(),duration:badge.dataset.counterKind === 'decay' ? 150 : COUNTER_SLOT_MS,remove:opt.remove};motions.set(badge,motion);active.set(badge,motion);paint(badge,from);schedule();
}
function transfer(old:HTMLElement,badge:HTMLElement,to:number,remove=false){
 const motion=motions.get(old);
 if(motion&&active.has(old)&&motion.to===to&&!reduced()){
  active.delete(old);const next={...motion,remove};motions.set(badge,next);active.set(badge,next);label(badge,to);paint(badge,position(badge));schedule();
 }else setCardCounter(badge,to,{from:position(old),remove});
}
/** Follow authoritative, public board snapshots across the board's DOM rebuilds. */
export function createBoardCardCounters(root:HTMLElement){
 let previous=new Map<string,HTMLElement>(),seen=new Set<string>(),disposed=false;
 const owner=(n:HTMLElement)=>n.closest('#oppRow')?'opp':'me';
 const objectKey=(side:string,uid:string,id:string)=>`${side}:${uid}:${id}`;
 return {
  sync(ended=false){
   if(disposed)return;
   const next=new Map<string,HTMLElement>(),objects=new Map<string,HTMLElement>();
   root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid],.zone-st .buff-icon[data-uid]').forEach(n=>objects.set(objectKey(owner(n),n.dataset.uid!,n.dataset.cardId??''),n));
   const badges=[...root.querySelectorAll<HTMLElement>('.zone-mon .card-counter,.zone-st .card-counter')].filter(n=>!identities.get(n)?.transient);
   for(const badge of badges){
    const meta=identities.get(badge);if(!meta)continue;
    const object=objectKey(owner(badge),meta.uid,meta.cardId),key=object+':'+meta.kind,old=previous.get(key);next.set(key,badge);
    // The grant event already animates each well at contact. Snap the replacement DOM to that value.
    if(ended || meta.kind === 'decay'){setCardCounter(badge,meta.value,{animate:false});continue;}
    if(old)transfer(old,badge,meta.value);else if(seen.has(object))setCardCounter(badge,meta.value,{from:0});
   }
   for(const [key,old]of previous){
    if(next.has(key))continue;const meta=identities.get(old)!;
    const object=key.slice(0,key.lastIndexOf(':')),host=objects.get(object);
    if(!host||ended||meta.kind==='decay'||position(old)<1e-7)continue;
    if(meta.kind==='guts'&&host.querySelector('.card-status [data-psv="guts"]'))continue;
    const badge=createCardCounter(meta.uid,meta.cardId,meta.kind,0,host.querySelectorAll('.card-counter:not([data-counter-kind="guts"])').length);
    identities.get(badge)!.transient=true;attachCardCounter(host,badge);transfer(old,badge,0,true);next.set(key,badge);
   }
   previous=next;seen=new Set(objects.keys());
  },
  dispose(){disposed=true;for(const badge of previous.values())active.delete(badge);root.querySelectorAll<HTMLElement>('.card-counter').forEach(n=>active.delete(n));previous.clear();seen.clear();if(!active.size){if(raf)cancelAnimationFrame(raf);raf=0;unlisten();}}
 };
}

/** Presentation clones keep the sampled counter and its identity. WeakMap state
 * is not copied by cloneNode, but survival/status events still update that face. */
export function copyCardCounters(source:HTMLElement,copy:HTMLElement):void {
 const originals=[...source.querySelectorAll<HTMLElement>('.card-counter')];
 copy.querySelectorAll<HTMLElement>('.card-counter').forEach((badge,i)=>{
  const old=originals[i],meta=old&&identities.get(old);if(!meta)return;
  identities.set(badge,{...meta,transient:true});const sampled=position(old);
  motions.set(badge,{from:sampled,to:sampled,start:0,duration:1});
 });
}
