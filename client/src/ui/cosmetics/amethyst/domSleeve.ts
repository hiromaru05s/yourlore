import {isAmethystSleeve} from '../../../shared/amethystCosmetics';
import type {sleeveArt} from './art';
/** The authored opaque inset and fixed edge follow the native card transforms. */
export function mountDomSleeves(art:ReturnType<typeof sleeveArt>,root:HTMLElement){
 let nodes:HTMLCanvasElement[]=[],last=-1;
 function sync(){
  const targets=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')].filter(el=>isAmethystSleeve(el.style.backgroundImage));
  for(const c of nodes)if(!c.parentElement||!targets.includes(c.parentElement))c.remove();
  for(const el of targets){if(!el.querySelector(':scope>.amethyst-sleeve-light')){const c=document.createElement('canvas');c.className='amethyst-sleeve-light';c.width=384;c.height=600;c.setAttribute('aria-hidden','true');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 1px #080812,0 0 0 1px #080812aa';el.append(c);}}
  nodes=targets.map(el=>el.querySelector<HTMLCanvasElement>(':scope>.amethyst-sleeve-light')!).filter(Boolean);last=-1;
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 return {sync,tick(time:number){if(last>=0&&Math.abs(time-last)<1/24)return;last=time;art.paint(time);for(const c of nodes)c.getContext('2d')!.drawImage(art.canvas,0,0,384,600);},dispose(){observer.disconnect();nodes.forEach(c=>c.remove());nodes=[];}};
}
