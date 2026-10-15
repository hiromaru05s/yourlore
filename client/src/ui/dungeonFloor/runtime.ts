import type {CardInst} from '../../shared/types';
import {cardEl} from '../cardView';
import {reserveMonster} from '../fieldLayout';
import {sfx} from '../sound';
import type {Stage} from './stage';
let rendererModule:Promise<typeof import('./stage')>|undefined;
const loadRenderer=()=>rendererModule??=import('./stage').catch(error=>{rendererModule=undefined;throw error;});
export function warmDungeonFloor(){void loadRenderer().catch(()=>{});}
import {cardReveal, duration} from './choreography';

export type FloorSession = {
  land(uid:string):Promise<HTMLElement|null>;
  done:Promise<void>;
  cancel():void;
};

/** One portal owns the entire dice result. The controller releases each landing
 * in event order, so intervening enchantment reactions cannot be overtaken. */
export function createDungeonFloor(cards:CardInst[], mine:boolean, signal:AbortSignal):FloorSession {
  const zone=document.querySelector<HTMLElement>(`#${mine?'me':'opp'}Row .zone-mon`);
  const entries=cards.slice(0,6).map(card=>({card,target:zone?reserveMonster(zone,card.uid):null,
    face:null as HTMLElement|null,requested:false,resolve:null as null|((el:HTMLElement|null)=>void)}));
  let stage:Stage|undefined,canvas:HTMLCanvasElement|undefined,frame=0,closed=false,time=0,last=0;
  let resolveDone!:()=>void;
  const done=new Promise<void>(resolve=>{resolveDone=resolve;});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveal=(i:number)=>{
    const e=entries[i];
    if(!e.face&&e.target?.isConnected){e.face=cardEl(e.card,{field:true});e.target.replaceWith(e.face);}
    if(e.resolve){e.resolve(e.face);e.resolve=null;}
  };
  const finish=()=>{
    if(closed)return;closed=true;cancelAnimationFrame(frame);clearTimeout(timeout);
    signal.removeEventListener('abort',finish);window.removeEventListener('resize',finish);
    document.removeEventListener('visibilitychange',finish);window.removeEventListener('pagehide',finish);
    canvas?.remove();stage?.dispose();
    entries.forEach((_,i)=>reveal(i));resolveDone();
  };
  const timeout=setTimeout(finish,18000);
  const session:FloorSession={done,cancel:finish,land(uid){
    const i=entries.findIndex(e=>e.card.uid===uid);if(i<0)return Promise.resolve(null);
    const e=entries[i];e.requested=true;
    if(closed||e.face)return Promise.resolve(e.face);
    return new Promise(resolve=>{e.resolve=resolve;});
  }};
  signal.addEventListener('abort',finish,{once:true});
  window.addEventListener('resize',finish,{once:true});
  window.addEventListener('pagehide',finish,{once:true});
  document.addEventListener('visibilitychange',finish,{once:true});
  const portrait=document.querySelector<HTMLElement>(mine?'#portraitMe .pt-ring':'#portraitOpp .pt-ring');
  if(signal.aborted||document.hidden||reduced||!portrait||!entries.length||entries.some(e=>!e.target)){
    finish();return session;
  }
  canvas=document.createElement('canvas');canvas.className='dungeon-floor-overlay';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:190;pointer-events:none';
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();finish();},{once:true});
  document.body.append(canvas);
  const anchors=()=>{
    const targets=entries.map(e=>{const r=(e.face??e.target)!.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height*.78};});
    const cardWidth=(entries[0].face??entries[0].target)!.getBoundingClientRect().width;
    const r=portrait.getBoundingClientRect(),archPixels=cardWidth*.85/2.15*4.03*.684;
    return {source:{x:Math.max(cardWidth,Math.min(innerWidth-cardWidth,r.x+r.width/2)),
      y:Math.max(archPixels+12,Math.min(innerHeight-52,r.y+r.height*.5+archPixels*.5))},
      targets,width:innerWidth,height:innerHeight,cardWidth};
  };
  const tick=(now:number)=>{
    if(closed)return;
    if(!portrait.isConnected||entries.some(e=>!(e.face??e.target)?.isConnected)){finish();return;}
    const next=entries.findIndex(e=>!e.requested);
    // Usually this does not pause: ordinary reactions finish before the next arrival.
    const ceiling=next<0?duration:cardReveal(next)-1;
    time=Math.min(ceiling,time+(last?now-last:0));last=now;
    try {
      const screen=anchors();
      if(screen.cardWidth<=0){finish();return;}
      stage!.draw({time,variant:2,roll:entries.length,slots:entries.length,side:mine?0:1,screen});
      entries.forEach((e,i)=>{if(e.requested&&!e.face&&time>=cardReveal(i)){reveal(i);sfx('mimic');}});
      if(time>=duration){finish();return;}
      frame=requestAnimationFrame(tick);
    } catch {finish();}
  };
  void (async()=>{
    try{const {Stage}=await loadRenderer();if(closed)return;stage=new Stage(canvas!,true);await stage.ready();if(!closed)frame=requestAnimationFrame(tick);}
    catch{finish();}
  })();
  return session;
}
