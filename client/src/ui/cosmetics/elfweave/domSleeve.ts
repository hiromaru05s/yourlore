import {isElfweaveSleeve} from '../../../shared/elfweaveCosmetics';
import type {sleeveArt} from './art';
/** Paint the approved living surface on each native card plane, including draws. */
export function mountDomSleeves(art:ReturnType<typeof sleeveArt>,root:HTMLElement){
 let nodes:HTMLCanvasElement[]=[],last=-1;
 function sync(){
  const targets=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')].filter(el=>isElfweaveSleeve(el.style.backgroundImage));
  for(const c of nodes)if(!c.parentElement||!targets.includes(c.parentElement))c.remove();
  for(const el of targets)if(!el.querySelector(':scope>.elfweave-sleeve-light')){const c=document.createElement('canvas');c.className='elfweave-sleeve-light';c.width=384;c.height=600;c.setAttribute('aria-hidden','true');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 1px #071b16,0 0 0 1px #071b16aa';el.append(c);}
  nodes=targets.map(el=>el.querySelector<HTMLCanvasElement>(':scope>.elfweave-sleeve-light')!).filter(Boolean);last=-1;
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 return {sync,tick(time:number){art.draw(time);if(!nodes.length||time===last)return;last=time;for(const c of nodes)c.getContext('2d')!.drawImage(art.canvas,0,0,384,600);},dispose(){observer.disconnect();nodes.forEach(c=>c.remove());nodes=[];}};
}
