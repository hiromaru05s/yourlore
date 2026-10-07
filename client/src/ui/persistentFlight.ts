import {FRAME_BACK} from '../shared/cards';
import {captureCardSurface,captureQuestTile} from './cardSurface';
import {projectedPlacement} from './boardProjection';
import {nativeQuestGhost} from './questFold';
import {DURATION,motion,ease} from './persistentFlightMotion';

/** User-selected persistent-five #02. The caller owns the native ending ghost. */
export async function flyPersistentIntoSlot(reveal:HTMLElement,target:HTMLElement,face:HTMLElement,signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden||!target.isConnected||!reveal.isConnected)return false;
 const from=reveal.getBoundingClientRect(),w=target.offsetWidth,h=target.offsetHeight;
 if(!from.width||!w||!h)return false;
 const host=nativeQuestGhost(target,face),visible=reveal.style.visibility;
 // Capture tile layout before applying board perspective; its localized text is live DOM.
 face.style.transform='translate(-4000px,0)';face.style.visibility='hidden';
 let renderer:import('./persistentFlightRenderer').PersistentFlightRenderer|undefined;
 let frame=0,completed=false;
 const place=()=>{face.style.transform=projectedPlacement(target,w,h).toString();face.style.visibility='visible';};
 try{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){place();completed=true;return true;}
  let cancel=()=>{};
  const loaded=await Promise.race([
   Promise.all([captureCardSurface(reveal,FRAME_BACK,true,false),captureQuestTile(face),import('./persistentFlightRenderer')]),
   new Promise<null>(resolve=>{cancel=()=>resolve(null);signal.addEventListener('abort',cancel,{once:true});})
  ]).finally(()=>signal.removeEventListener('abort',cancel));
  if(!loaded||signal.aborted||!target.isConnected||!reveal.isConnected)return false;
  const [source,tile,module]=loaded;if(!source.face)return false;
  renderer=new module.PersistentFlightRenderer(source.face,tile);
  const sprite=renderer.gl.domElement;sprite.className='persistent-flight-canvas';sprite.setAttribute('aria-hidden','true');
  const base=180,size=base*3.4875;
  sprite.style.cssText=`position:fixed;left:0;top:0;width:${size}px;height:${size}px;transform-origin:0 0;pointer-events:none`;
  const fx=document.createElement('canvas');fx.className='persistent-flight-trail';fx.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  const ratio=Math.min(devicePixelRatio,1.5);fx.width=Math.round(innerWidth*ratio);fx.height=Math.round(innerHeight*ratio);
  host.append(fx,sprite);const ctx=fx.getContext('2d')!;
  const start=new DOMMatrix().translate(from.left+from.width/2-base/2*from.width/base,from.top+from.height/2-base/2*from.width/base).scale(from.width/base);
  const end=projectedPlacement(target,base,base),sa=start.toFloat64Array(),ea=end.toFloat64Array();
  const r=target.getBoundingClientRect(),s={x:from.left+from.width/2,y:from.top+from.height/2,w:from.width},d={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width};
  await new Promise<void>(resolve=>{
   let ended=false;const finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
   signal.addEventListener('abort',finish,{once:true});const begun=performance.now();
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||!target.isConnected||!reveal.isConnected){finish();return;}
    try{
     const ms=Math.min(DURATION,now-begun),m=motion(ms);
     renderer!.render(ms,Math.min(900,Math.max(400,Math.round(from.width*3.4875*ratio))));
     const matrix=new DOMMatrix().translate(0,m.lift*from.width).multiply(new DOMMatrix(Array.from(sa,(v,i)=>v+(ea[i]-v)*m.p))).translate(base/2,base/2).rotate(m.angle*180/Math.PI).translate(-size/2,-size/2);
     sprite.style.transform=matrix.toString();sprite.dataset.time=String(Math.round(ms));
     ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);renderer!.trail(ctx,ms,s,d);renderer!.contact(ctx,ms,d);
     reveal.style.visibility='hidden';
     const native=ease(1400,1500,ms);face.style.opacity=String(native);if(native>0)place();sprite.style.opacity=String(1-native);
     if(ms===DURATION){completed=true;finish();return;}frame=requestAnimationFrame(tick);
    }catch(error){console.warn('[persistent-flight] Native fallback',error);finish();}
   };tick(begun);
  });
  if(completed){face.style.opacity='1';place();}return completed;
 }catch(error){console.warn('[persistent-flight] Native fallback',error);return false;}
 finally{cancelAnimationFrame(frame);renderer?.dispose();host.querySelectorAll('canvas').forEach(c=>c.remove());reveal.style.visibility=visible;if(!completed)host.remove();}
}
