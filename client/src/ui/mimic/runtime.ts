import {selected,type MimicId} from './selection';
import {createRig,type MimicRig} from './rig';

/** One owned reveal. Always restore the native card before the existing landing. */
export async function playMimic(source:HTMLElement,card:HTMLElement,id:MimicId,signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden||!source.isConnected)return false;
 let rig:MimicRig|null=null,frame=0,timer:ReturnType<typeof setTimeout>|undefined;
 const visibility=source.style.visibility;
 let finish:(done:boolean)=>void=()=>{};
 const cancel=()=>{cancelAnimationFrame(frame);if(timer)clearTimeout(timer);source.style.visibility=visibility;rig?.dispose();finish(false);};
 signal.addEventListener('abort',cancel,{once:true});
 try{
  rig=await createRig(card,id,signal);
  if(!rig||signal.aborted)return false;
  const loaded=await Promise.race([rig.ready().then(()=>true),new Promise<boolean>(resolve=>{
   finish=resolve;timer=setTimeout(()=>resolve(false),8000);
  })]);
  if(timer)clearTimeout(timer);
  if(!loaded||signal.aborted||!source.isConnected){if(import.meta.env.DEV)console.warn('[mimic reveal unavailable]',{loaded,aborted:signal.aborted,connected:source.isConnected});return false;}
  const rect=source.getBoundingClientRect();if(!rect.width||!rect.height)return false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  rig.node.style.transform=`translate(${rect.left}px,${rect.top}px) scale(${rect.width/180},${rect.height/280})`;
  rig.draw(0,reduced);document.body.append(rig.node);source.style.visibility='hidden';
  return await new Promise<boolean>(resolve=>{
   finish=resolve;const start=performance.now(),duration=selected[id].duration;
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||!source.isConnected){cancel();return;}
    try{const time=Math.min(duration,now-start);rig!.draw(time,reduced);if(time>=duration){resolve(true);return;}frame=requestAnimationFrame(tick);}
    catch(error){if(import.meta.env.DEV)console.warn('[mimic frame fallback]',error);resolve(false);}
   };
   frame=requestAnimationFrame(tick);
  });
 }catch(error){if(import.meta.env.DEV)console.warn('[mimic reveal fallback]',error);return false;}
 finally{signal.removeEventListener('abort',cancel);cancel();}
}
