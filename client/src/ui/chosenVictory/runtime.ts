import {sfx,warmSounds} from '../sound';
import {DB} from '../../shared/cards';
import {cardName,t} from '../../i18n';
import {CHOSEN_DURATION_MS,CHOSEN_FLASH_MS,crownCue} from './timing';
import type {GameEvent,Side} from '../../shared/types';
const active=new Set<()=>void>();
let asset:Promise<HTMLImageElement>|undefined;
function image(){return asset??=new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{asset=undefined;reject(Error('Chosen crown unavailable'));};im.src='/vfx/chosen-victory/crown.png';});}
export function warmChosenVictory(){void image().catch(()=>{});void warmSounds(['chosenCrown']);void import('./renderer');}
export function cancelChosenVictory(){for(const cancel of [...active])cancel();}
/** Only the public cast in the winning batch can trigger this special victory. */
export function isChosenVictory(events:readonly GameEvent[],player:Side){return events.some(e=>e.type==='playSpell'&&e.id==='CHOSEN_AREA'&&e.player===player)&&events.some(e=>e.type==='win'&&e.winner===player);}
export async function playChosenVictory(side:'me'|'opp',source?:HTMLElement|null):Promise<void>{
 cancelChosenVictory();if(document.hidden)return;
 const abort=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const host=document.createElement('div');host.dataset.chosenVictory='01';host.style.cssText='position:fixed;inset:0;z-index:181;pointer-events:none;overflow:hidden';host.setAttribute('role','status');host.setAttribute('aria-label',`${cardName({...DB.CHOSEN_AREA,uid:'chosen-title'})} · ${t(side==='me'?'modal.win':'modal.lose')}`);
 const cv=document.createElement('canvas');cv.style.cssText='width:100%;height:100%';host.append(cv);document.body.append(host);
 let ended=false,raf=0,renderer:import('./renderer').ChosenRenderer|undefined,resolve!:()=>void;
 const done=new Promise<void>(r=>resolve=r),visibility=source?.style.visibility??'';
 const cleanup=()=>{if(ended)return;ended=true;abort.abort();cancelAnimationFrame(raf);clearTimeout(watchdog);active.delete(cleanup);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',cleanup);motion.removeEventListener('change',cleanup);if(source)source.style.visibility=visibility;renderer?.destroy();host.remove();cv.width=cv.height=1;resolve();};
 const hidden=()=>{if(document.hidden)cleanup();};
 let watchdog=window.setTimeout(cleanup,10000);active.add(cleanup);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',cleanup);motion.addEventListener('change',cleanup);
 try{
  const loaded=await Promise.race([Promise.all([image(),import('./renderer'),warmSounds(['chosenCrown'])]),done.then(()=>null)]);
  if(ended||!loaded)return;
  renderer=new loaded[1].ChosenRenderer([loaded[0]]);const c=cv.getContext('2d');if(!c)return;
  const start=performance.now(),reduced=motion.matches,fire=crownCue(reduced),duration=reduced?1300:CHOSEN_DURATION_MS;
  clearTimeout(watchdog);watchdog=window.setTimeout(cleanup,duration+300);
  const draw=(now:number)=>{
   if(ended)return;const ms=now-start;if(ms>=duration){cleanup();return;}
   const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio,1.5);if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);c.setTransform(d,0,0,d,0,0);}
   const r=source?.isConnected?source.getBoundingClientRect():null,rf=document.querySelector(`#rift-${side}`)?.getBoundingClientRect();
   if(source&&(ms>=800||reduced))source.style.visibility='hidden';
   renderer!.draw(c,w,h,0,ms,{board:true,dark:true,reduced,source:r?{x:r.x+r.width/2,y:r.y+r.height/2}:undefined,rift:rf?{x:rf.x+rf.width/2,y:rf.y+rf.height/2}:undefined,title:cardName({...DB.CHOSEN_AREA,uid:'chosen-title'}),victoryLabel:t(side==='me'?'modal.win':'modal.lose')});
   host.dataset.time=String(Math.round(ms));host.dataset.phase=reduced?'reduced':ms<CHOSEN_FLASH_MS?'forming':'complete';
   if(fire(ms)){host.dataset.cueAt=String(Math.round(ms));sfx('chosenCrown',{signal:abort.signal});}
   raf=requestAnimationFrame(draw);
  };draw(start);await done;
 }catch(error){console.warn('[chosen victory]',error);}finally{cleanup();}
}
