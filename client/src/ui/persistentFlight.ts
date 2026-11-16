import {STANDARD_FX} from './animationTempo';
import {projectedPlacement} from './boardProjection';
import {nativeQuestGhost} from './questFold';
import {DURATION, ease, motion} from './persistentFlightMotion';
import {paintPersistentTrail, frameGlint} from './persistentFlightRenderer';

/** Keep both native prints on the same plane from the released card to the placed tile. */
export async function flyPersistentIntoSlot(reveal:HTMLElement,target:HTMLElement,face:HTMLElement,signal:AbortSignal):Promise<boolean>{
  if(signal.aborted || document.hidden || !target.isConnected || !reveal.isConnected)return false;
  const from=reveal.getBoundingClientRect(), rw=reveal.offsetWidth, rh=reveal.offsetHeight;
  const w=target.offsetWidth, h=target.offsetHeight;
  if(!from.width || !rw || !rh || !w || !h)return false;

  const host=nativeQuestGhost(target,face);
  host.classList.add('persistent-flight-host');
  const previous=reveal.style.cssText;
  host.style.setProperty('--board-meter',getComputedStyle(target).getPropertyValue('--board-meter'));
  const badges=face.querySelectorAll<HTMLElement>('.enchant-time,.buff-duration,.card-counter');
  let canvas:HTMLCanvasElement|undefined;
  let frame=0, completed=false;
  let sourceLight:HTMLElement|undefined;
  try{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      completed=true;
      return true;
    }
    const start=new DOMMatrix().translate(from.left,from.top).scale(from.width/w,from.height/h);
    const end=projectedPlacement(target,w,h);
    const a=start.toFloat64Array(), b=end.toFloat64Array();
    const r=target.getBoundingClientRect();
    const source={x:from.left+from.width/2,y:from.top+from.height/2,w:from.width};
    const destination={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width};
    canvas=document.createElement('canvas');
    canvas.className='persistent-flight-canvas';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    const ratio=Math.min(devicePixelRatio,2,2048/Math.max(innerWidth,innerHeight));
    canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);
    document.body.insertBefore(canvas,reveal);
    canvas.style.position='fixed';
    canvas.style.zIndex=reveal.style.zIndex;
    sourceLight=frameGlint(reveal.querySelector('.card-frame'));
    const ctx=canvas.getContext('2d');
    ctx?.setTransform(ratio,0,0,ratio,0,0);

    // The tile covers the upright card only at the end of its approach. Keep a
    // single moving edge between the two prints so their outlines never show through each other.
    host.style.zIndex=String((parseInt(reveal.style.zIndex)||125)+1);
    face.style.opacity='0';
    reveal.style.transition='none';
    reveal.style.transformOrigin='0 0';
    reveal.style.left='0';reveal.style.top='0';
    await new Promise<void>(resolve=>{
      const finish=()=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
      signal.addEventListener('abort',finish,{once:true});
      const startTime=STANDARD_FX.now();
      const tick=(now:number)=>{
        if(signal.aborted || document.hidden || !target.isConnected || !reveal.isConnected){finish();return;}
        const ms=Math.min(DURATION,now-startTime);
        const m=motion(ms);
        canvas!.dataset.time=String(Math.round(ms));
        if(sourceLight){
          sourceLight.style.backgroundPositionX=(100*(1-ease(40,550,ms)))+'%';
          sourceLight.style.opacity=String(.34*ease(30,110,ms)*(1-ease(360,580,ms)));
        }
        const pose=new DOMMatrix().translate(0,m.lift*from.width)
          .multiply(new DOMMatrix(Array.from(a,(v,i)=>v+(b[i]-v)*m.p)))
          .translate(w/2,h/2).rotate(m.angle*180/Math.PI).translate(-w/2,-h/2);
        reveal.style.transform=pose.scale(w/rw,h/rh).toString();
        face.style.transform=pose.toString();
        // Replace the print from the foot up, including seals outside its CSS box.
        const seam=125-150*m.morph;
        face.style.opacity=m.morph===0?'0':'1';
        reveal.style.opacity=m.morph===1?'0':'1';
        face.style.clipPath=m.morph===1?'none':`inset(${seam}% -60% -60% -60%)`;
        reveal.style.clipPath=m.morph===0?'none':`inset(-60% -60% ${100-seam-.3}% -60%)`;
        // Counters belong to the seated tile. Scaling them with a hand-sized face
        // would make a grey disc larger than the artwork in the middle of the flight.
        for(const badge of badges)badge.style.opacity=ms<DURATION?'0':'1';
        if(ctx){
          ctx.clearRect(0,0,innerWidth,innerHeight);
          paintPersistentTrail(ctx,ms,source,destination);
        }
        if(ms===DURATION){completed=true;finish();return;}
        frame=STANDARD_FX.requestFrame(tick);
      };
      tick(startTime);
    });
    return completed;
  }finally{
    cancelAnimationFrame(frame);
    reveal.style.cssText=previous;
    canvas?.remove();
    sourceLight?.remove();
    if(completed){
      reveal.style.visibility='hidden';
      face.style.opacity='1';face.style.clipPath='none';
      for(const badge of badges)badge.style.removeProperty('opacity');
      face.style.transform=projectedPlacement(target,w,h).toString();
    }else host.remove();
  }
}
