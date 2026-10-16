import {isCofferSleeve} from '../../../shared/mimicCofferCosmetics';
import type {sleeveArt} from './art';
/** The fixed two-tone cut edge and the moving creature share one card surface. */
export function mountDomSleeves(art:ReturnType<typeof sleeveArt>,root:HTMLElement){
 let nodes:HTMLCanvasElement[]=[],last=-1;
 const clips=new Map<HTMLElement,string>();
 function sync(){
  const targets=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')].filter(el=>isCofferSleeve(el.style.backgroundImage));
  for(const c of nodes)if(!c.parentElement||!targets.includes(c.parentElement))c.remove();
  for(const [el,clip]of clips)if(!targets.includes(el)){el.style.clipPath=clip;clips.delete(el);}
  for(const el of targets){if(!clips.has(el)){clips.set(el,el.style.clipPath);el.style.clipPath='inset(3% round 12%)';}}
  for(const el of targets)if(!el.querySelector(':scope>.coffer-sleeve-light')){const c=document.createElement('canvas');c.className='coffer-sleeve-light';c.width=768;c.height=1200;c.setAttribute('aria-hidden','true');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none';el.append(c);}
  nodes=targets.map(el=>el.querySelector<HTMLCanvasElement>(':scope>.coffer-sleeve-light')!).filter(Boolean);last=-1;
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 return {sync,tick(time:number){if(!nodes.length||time===last)return;last=time;art.paint(time);for(const c of nodes)c.getContext('2d')!.drawImage(art.canvas,0,0);},dispose(){observer.disconnect();for(const [el,clip]of clips)el.style.clipPath=clip;clips.clear();nodes.forEach(c=>c.remove());nodes=[];}};
}
