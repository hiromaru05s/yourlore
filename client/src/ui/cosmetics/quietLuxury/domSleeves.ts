import {quietLuxuryFromUrl,type QuietLuxuryVariant} from '../../../shared/quietLuxuryCosmetics';
import {retainQuietLuxuryArt} from './sleeve';
/** Match the actual back URL, including native draw copies; never recolor the
 * other player's sleeve or a face-up card. Each variant shares its 24Hz surface. */
export function mountQuietLuxuryBacks(root:HTMLElement){
 const leases=new Map<QuietLuxuryVariant,ReturnType<typeof retainQuietLuxuryArt>>();
 let nodes:Array<{canvas:HTMLCanvasElement;index:QuietLuxuryVariant}>=[],last=-1;
 function sync(){
  const targets=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')];
  const next:typeof nodes=[];
  for(const el of targets){
   const theme=quietLuxuryFromUrl(el.style.backgroundImage),old=el.querySelector<HTMLCanvasElement>(':scope>.quiet-luxury-back');
   if(!theme){old?.remove();continue;}
   const canvas=old??document.createElement('canvas');
   if(!old){canvas.width=384;canvas.height=600;canvas.className='quiet-luxury-back';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 1px #0b1720,0 0 0 1px #0b172088';el.append(canvas);}
   next.push({canvas,index:theme.variant});if(!leases.has(theme.variant))leases.set(theme.variant,retainQuietLuxuryArt(theme.variant));
  }
  for(const n of nodes)if(!next.some(v=>v.canvas===n.canvas))n.canvas.remove();
  nodes=next;for(const [i,lease]of leases)if(!nodes.some(n=>n.index===i)){lease.release();leases.delete(i);}last=-1;
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 return {tick(time:number){if(last===time)return;last=time;for(const lease of leases.values())lease.art.paint(time);for(const n of nodes)n.canvas.getContext('2d')!.drawImage(leases.get(n.index)!.art.canvas,0,0);},dispose(){observer.disconnect();nodes.forEach(n=>n.canvas.remove());nodes=[];for(const lease of leases.values())lease.release();leases.clear();}};
}
