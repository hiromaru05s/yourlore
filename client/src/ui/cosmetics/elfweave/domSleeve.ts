import {isElfweaveSleeve} from '../../../shared/elfweaveCosmetics';
import type {sleeveArt} from './art';
/** Paint the approved living surface on each native card plane, including draws. */
export function mountDomSleeves(art:ReturnType<typeof sleeveArt>,root:HTMLElement){
 const nodes=new Map<HTMLElement,{canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;version:number}>();
 let watched=new Set<HTMLElement>();
 const targetSelector='.card--back,.draw-stock-back';
 const owns=(el:HTMLElement)=>isElfweaveSleeve(el.style.backgroundImage)&&
  (root.contains(el)&&el.matches('.card--back')||!!el.closest('.native-draw-layer')&&el.matches(targetSelector));
 function sync(){
  const candidates=new Set([...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .card--back,.native-draw-layer .draw-stock-back')]);
  if(candidates.size!==watched.size||[...candidates].some(el=>!watched.has(el))){
   attributes.disconnect();watched=candidates;
   for(const el of watched)attributes.observe(el,{attributes:true,attributeFilter:['style','class']});
  }
  const targets=[...candidates].filter(el=>isElfweaveSleeve(el.style.backgroundImage));
  const keep=new Set(targets);
  for(const [el,entry]of nodes)if(!keep.has(el)){entry.canvas.remove();nodes.delete(el);}
  for(const el of targets){
   const entry=nodes.get(el);if(entry?.canvas.parentElement===el)continue;
   let canvas=el.querySelector<HTMLCanvasElement>(':scope>.elfweave-sleeve-light');
   if(!canvas){canvas=document.createElement('canvas');canvas.className='elfweave-sleeve-light';canvas.width=384;canvas.height=600;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 1px #071b16,0 0 0 1px #071b16aa';el.append(canvas);}
   // cloneNode copies the canvas element, not its bitmap. New flight copies
   // must paint even when the shared source has not advanced this frame.
   nodes.set(el,{canvas,context:canvas.getContext('2d')!,version:-1});
  }
 }
 const containsBack=(node:Node)=>node instanceof HTMLElement&&
  (node.matches(targetSelector)||!!node.querySelector(targetSelector));
 // Observe attributes only on card backs, not every animated node in the game.
 const attributes=new MutationObserver(records=>{
  if(records.some(record=>{const el=record.target as HTMLElement;return nodes.has(el)!==owns(el);}))sync();
 });
 const observer=new MutationObserver(records=>{
  const changed=records.some(record=>{
   const entry=nodes.get(record.target as HTMLElement);
   return !!entry&&entry.canvas.parentElement!==record.target||
    [...record.addedNodes,...record.removedNodes].some(containsBack);
  });
  if(changed)sync();
 });
 observer.observe(document.body,{childList:true,subtree:true});sync();
 return {sync,tick(time:number){
  art.draw(time);
  // map.version changes only when the original artwork actually repaints.
  // Preserve its existing clock/cadence; omit only identical bitmap copies.
  const version=art.map.version;
  for(const entry of nodes.values())if(entry.version!==version){entry.context.drawImage(art.canvas,0,0,384,600);entry.version=version;}
 },dispose(){observer.disconnect();attributes.disconnect();watched.clear();for(const entry of nodes.values())entry.canvas.remove();nodes.clear();}};
}
