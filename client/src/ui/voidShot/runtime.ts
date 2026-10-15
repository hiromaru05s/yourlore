import type {Renderer} from './renderer';
const active=new Set<()=>void>();
export const warmVoidShot=()=>{void import('./renderer').catch(()=>{});};
export const cancelVoidShots=()=>{for(const stop of [...active])stop();};
/** Adopted crystal 03: a single contact clock drives the subsequent damage events. */
export function playVoidShot(card:HTMLElement,side:'me'|'opp',count:number,onImpact:()=>void,signal?:AbortSignal,targetSide:'me'|'opp'=side==='me'?'opp':'me'):Promise<boolean>{
 if(signal?.aborted||document.hidden||!card.isConnected||count<=0)return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false,frame=0,start=0,renderer:Renderer|undefined,canvas:HTMLCanvasElement|undefined,contacted=false;
  const original={opacity:card.style.opacity,clip:card.style.clipPath};
  const impact=()=>{if(!contacted){contacted=true;onImpact();}};
  const finish=(ok:boolean)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);active.delete(abort);renderer?.dispose();canvas?.remove();card.style.opacity=original.opacity;card.style.clipPath=original.clip;resolve(ok);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();},deadline=setTimeout(abort,5500);
  active.add(abort);signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
  const rift=document.getElementById('rift-'+side),target=document.getElementById('hp-'+targetSide);
  if(!rift||!target){abort();return;}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const begin=()=>{
   if(done)return;canvas=document.createElement('canvas');canvas.className='void-shot';canvas.dataset.variant='03';canvas.dataset.count=String(count);canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:180;pointer-events:none';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);const c=canvas.getContext('2d');if(!c){abort();return;}
   const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);start=performance.now();
   const tick=(now:number)=>{if(done)return;if(!card.isConnected||!rift.isConnected||!target.isConnected){abort();return;}const t=Math.min(3600,(now-start)*(reduced?6:1)),a=rift.getBoundingClientRect(),b=target.getBoundingClientRect(),r=card.getBoundingClientRect(),unit=Math.max(35,Math.min(68,innerWidth*.060));canvas!.dataset.elapsed=String(t);renderer?.clearCanvas(canvas!);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
    const exit=Math.max(0,Math.min(1,(t-540)/310));card.style.clipPath=`inset(0 0 ${exit*100}% 0)`;card.style.opacity=String(1-exit*.4);
    const scene={source:{x:a.x+a.width*.5,y:a.y+a.height*.5},target:{x:b.x+b.width*.5,y:b.y+b.height*.5},unit,count,spell:t<850?{x:r.x+r.width*.5,y:r.y+r.height*.5}:undefined};
    try{if(renderer&&!reduced)renderer.draw(c,t,scene);else {canvas!.dataset.fallback='true';if(t>=2150&&t<2950){c.fillStyle=`rgba(142,108,185,${(1-(t-2150)/800)*.35})`;c.beginPath();c.ellipse(scene.target.x,scene.target.y,unit*.25,unit*.16,0,0,Math.PI*2);c.fill();}}}catch{renderer?.dispose();renderer=undefined;canvas!.dataset.fallback='true';}
    if(t>=2150)impact();if(t>=3600)finish(true);else frame=requestAnimationFrame(tick);
   };tick(start);
  };
  if(reduced){begin();return;}
  void import('./renderer').then(m=>{if(done)return;try{renderer=new m.Renderer();}catch{renderer=undefined;}begin();}).catch(()=>begin());
 });
}
