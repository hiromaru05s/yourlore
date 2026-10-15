import {isGoldfaultSleeve} from '../../../shared/goldfaultCosmetics';
import type {sleeveArt} from './art';
/** The same authored gold mask and 12s phase as the physical sleeve. Canvas
 * children inherit each hand/flight card's transform, visibility and clipping. */
export function mountDomSleeves(art:ReturnType<typeof sleeveArt>,root:HTMLElement){
 const mask=document.createElement('canvas');mask.width=384;mask.height=600;const m=mask.getContext('2d')!;m.drawImage(art.finish.image,0,0,384,600);const pixels=m.getImageData(0,0,384,600);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;}m.putImageData(pixels,0,0);
 const surface=document.createElement('canvas');surface.width=384;surface.height=600;const ctx=surface.getContext('2d')!;
 let nodes:HTMLCanvasElement[]=[],last=-1;
 function sync(){
  const targets=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')].filter(el=>isGoldfaultSleeve(el.style.backgroundImage));
  for(const c of nodes)if(!c.parentElement||!targets.includes(c.parentElement))c.remove();
  for(const el of targets){if(!el.querySelector(':scope>.goldfault-sleeve-light')){const c=document.createElement('canvas');c.className='goldfault-sleeve-light';c.width=384;c.height=600;c.setAttribute('aria-hidden','true');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;mix-blend-mode:screen';el.append(c);}}
  nodes=targets.map(el=>el.querySelector<HTMLCanvasElement>(':scope>.goldfault-sleeve-light')!).filter(Boolean);last=-1;
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 return {sync,tick(time:number){if(!nodes.length||time===last)return;last=time;ctx.clearRect(0,0,384,600);ctx.globalCompositeOperation='source-over';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-in';const g=ctx.createLinearGradient(0,0,0,600);for(let i=0;i<=80;i++){const y=i/80,flow=Math.pow(.5+.5*Math.cos(Math.PI*2*((1-y)*1.6-time/12)),14);g.addColorStop(y,`rgba(239,176,83,${.04+.55*flow})`);}ctx.fillStyle=g;ctx.fillRect(0,0,384,600);for(const c of nodes){const target=c.getContext('2d')!;target.clearRect(0,0,384,600);target.drawImage(surface,0,0);}},dispose(){observer.disconnect();nodes.forEach(c=>c.remove());nodes=[];}};
}
