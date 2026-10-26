import {ongoingFilter} from '../monster/resting';

export type RestingKind='ready'|'blocked'|'plain';
/** Shared with the live Actor, including the phase of its silhouette light. */
export function restingCardFilter(kind:RestingKind,aura:boolean,now:number,density=2,reduced=false){
 const b=reduced?.5:.5-.5*Math.cos((now%2200)/2200*4*Math.PI);
 let filter=kind==='blocked'?'grayscale(1) brightness(.57)':kind==='ready'?
  `drop-shadow(0 ${2*density}px ${4*density}px #0009) drop-shadow(0 0 ${(4+5*b)*density}px rgba(255,122,77,${.4+.6*b}))`:'none';
 if(aura){const glow=ongoingFilter('C',(now%4400)/4400,reduced);filter=kind==='plain'?glow:`${filter} ${glow.replace('drop-shadow(0 2px 4px #0009)','')}`;}
 return filter;
}
export function refreshSummonAppearance(node:HTMLElement,density=Number(node.dataset.summonDensity)||1){
 if(!node.classList.contains('summon-face'))return;
 node.dataset.summonDensity=String(density);
 node.style.setProperty('--summon-frame-unit',`${density*2}px`);
 setRestingFilters(node,(node.dataset.summonRest??'plain') as RestingKind,!!node.dataset.monsterAura,performance.now(),density*2,matchMedia('(prefers-reduced-motion:reduce)').matches);
}
function setRestingFilters(node:HTMLElement,kind:RestingKind,aura:boolean,now:number,density:number,reduced:boolean){
 const filter=restingCardFilter(kind,aura,now,density,reduced).replace(/(?:grayscale|brightness)\([^)]*\)/g,'').trim();
 node.style.setProperty('--rest-tone',kind==='blocked'?'grayscale(1) brightness(.57)':'brightness(1)');
 node.style.setProperty('--rest-shadow',filter&&filter!=='none'?filter:'drop-shadow(0 0 0 #0000)');
}
/** Keep the illustration out of a filtered root's flattened compositor bitmap. */
export function paintRestingAppearance(node:HTMLElement,kind:RestingKind,aura:boolean,now:number,density:number,reduced:boolean){
 node.style.setProperty('--summon-frame-unit',`${density*2}px`);
 node.classList.add('field-resting-face');node.style.setProperty('filter','none','important');
 setRestingFilters(node,kind,aura,now,density*2,reduced);
}
export function prepareSummonAppearance(node:HTMLElement){
 if(!node.dataset.summonRest)node.dataset.summonRest=node.dataset.monsterBlocked||node.classList.contains('is-exhausted')?'blocked':node.classList.contains('is-attacker')?'ready':'plain';
 node.classList.remove('is-attacker','is-exhausted');node.classList.add('summon-face');refreshSummonAppearance(node);
 return node;
}

/** Match the blocked Actor before the renderer fades out, rather than jumping
 * to its smaller, lowered silhouette when the controller commits the board. */
const settledPoses=new WeakSet<HTMLElement>();
export function settleSummonPose(node:HTMLElement){
 if(node.dataset.summonRest!=='blocked'||!node.classList.contains('fx-field-ghost')||settledPoses.has(node))return;
 const r=node.getBoundingClientRect(),s=.982;
 node.style.scale=String(s);node.style.translate=`${(r.left+r.width/2)*(1-s)}px ${(r.top+r.height/2)*(1-s)+r.width*.035}px`;
 settledPoses.add(node);
}
export function mountSummonAppearance(node:HTMLElement){
 refreshSummonAppearance(node,1);
 if(node.dataset.summonRest==='blocked')node.style.transform=`translateY(${node.offsetWidth*.035}px) scale(.982)`;
}
