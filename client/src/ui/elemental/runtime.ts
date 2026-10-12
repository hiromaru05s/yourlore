import {combatCard,combatPortrait,combatRect} from '../combatAnchor';
import {Effects} from './effects';
import {CardMaterial} from './surface';
import {visualEntries,rate,impactTime,pulse,clamp,type Anchor,type Hit} from './catalog';
import type {GameEvent,Side} from '../../shared/types';
import './style.css';
export type ElementalEvent=Extract<GameEvent,{type:'elementalStart'}>;
export interface Playback {impact(index:number):Promise<void>;finished:Promise<void>;cancel():void;}
export const supportsElemental=(id:string)=>Object.hasOwn(visualEntries,id);
const anchor=(el:HTMLElement|null|undefined):Anchor|null=>{const r=combatRect(el);return r?{el:el!,x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}:null};
/** The reducer owns targets and damage. This clock only reveals its public results. */
export function startElemental(event:ElementalEvent,you:Side,sourceNode?:HTMLElement):Playback {
 const entry=visualEntries[event.id],source=sourceNode??combatCard(event.uid),nodes=event.targets.map(t=>t.uid?combatCard(t.uid):combatPortrait(t.player===you?'me':'opp'));
 const measuredOrigin=anchor(source);
 if(!entry||!source||!measuredOrigin||!event.targets.length)return {impact:()=>Promise.resolve(),finished:Promise.resolve(),cancel(){}};
 const origin:Anchor=measuredOrigin;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,targets:Anchor[]=[],hits:Hit[]=[];
 // Keep every public impact's original index/time even if one visual anchor is
 // unavailable. Missing geometry must not redirect a hit or cancel other hits.
 const allHits=event.targets.map((t,i)=>({target:i,at:impactTime(entry.kind,i),amount:t.amount}));
 nodes.forEach((node,i)=>{const target=anchor(node);if(target){hits.push({...allHits[i],target:targets.length});targets.push(target);}});
 const speed=rate(entry.kind),duration=reduced?Math.min(650,entry.duration/speed):entry.duration/speed;
 const due=allHits.map(h=>reduced?200:h.at/speed),resolvers:Array<()=>void>=[],promises=allHits.map((_,i)=>new Promise<void>(r=>resolvers[i]=r));
 const canvas=document.createElement('canvas');canvas.className='element-overlay';canvas.dataset.elemental=entry.kind;
 canvas.dataset.duration=String(duration);canvas.dataset.hits=String(allHits.length);document.body.append(canvas);
 const ctx=canvas.getContext('2d')!,dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 const fx=new Effects(),materials=[...new Set([source,...nodes.filter((n):n is HTMLElement=>!!n&&n.classList.contains('card'))])].map(el=>new CardMaterial(el));
 const saved={translate:source.style.translate,rotate:source.style.rotate},start=performance.now();let raf=0,closed=false,next=0,done!:()=>void;
 const finished=new Promise<void>(r=>done=r);
 function cleanup(){if(closed)return;closed=true;cancelAnimationFrame(raf);source!.style.translate=saved.translate;source!.style.rotate=saved.rotate;materials.forEach(m=>m.dispose());fx.dispose();canvas.remove();resolvers.forEach(r=>r());done();}
 function tick(now:number){
  if(closed)return;
  if(!source!.isConnected){cleanup();return;}
  const elapsed=now-start,time=reduced?(elapsed<200?elapsed/200*allHits[0].at:allHits[0].at+(elapsed-200)*3):elapsed*speed;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const m of materials){const indexes=nodes.flatMap((n,i)=>n===m.el?[i]:[]),last=allHits.filter(h=>indexes.includes(h.target)&&time>=h.at).at(-1),age=last?time-last.at:-1;const heat=m.el===source?pulse(time,130,800,entry.kind==='meteor'?2700:1500):age>=0?pulse(age,-1,50,450):0;m.paint(time,reduced?0:heat,entry.kind,reduced?0:age>=0?pulse(age,50,300,1000):0);}
  if(!reduced){
   if(entry.kind==='cannon'){const a=time-1030,k=a>=0&&a<650?Math.sin(Math.min(1,a/120)*Math.PI/2)*Math.exp(-a/150):0;source!.style.translate=`${-origin.w*.11*k}px ${origin.h*.025*k}px`;source!.style.rotate=`${-2*k}deg`;}
   else if(entry.kind==='berserk'&&targets.length){const b=targets[0],p=pulse(time,820,1490,2210),anticipation=pulse(time,200,650,880);source!.style.translate=`${(b.x-origin.x)*p*.7-anticipation*origin.w*.06}px ${(b.y-origin.y)*p*.7+anticipation*origin.h*.025}px`;source!.style.rotate=`${-8*anticipation+16*p}deg`;}
   else source!.style.translate=`0 ${-Math.sin(clamp(time/1350)*Math.PI)*origin.h*.028}px`;
  }
  if(hits.length)fx.render(ctx,entry,time,origin,targets,hits,reduced);
  while(next<due.length&&elapsed>=due[next]){canvas.dataset.impact=String(next);resolvers[next++]();}
  if(elapsed>=duration){cleanup();return;}raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);
 return {impact:index=>promises[index]??Promise.resolve(),finished,cancel:cleanup};
}
