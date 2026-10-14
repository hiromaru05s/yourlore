import {combatVisualRect} from '../monster/runtime';
import {VoidGrantSurface,VOID_GRANT_DURATION} from './surface';

const owners=new Map<HTMLElement,()=>void>();
/** No card clones, removal or recoloring: a transient film overlays the live faces. */
export function playVoidGrant(uids:string[],signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden)return Promise.resolve(false);
 const sources=[...new Set(uids)].map(uid=>document.querySelector<HTMLElement>(`.zone-mon .card[data-uid="${CSS.escape(uid)}"]`)??document.querySelector<HTMLElement>(`.fx-card-flight[data-uid="${CSS.escape(uid)}"]`)).filter((n):n is HTMLElement=>!!n);
 if(!sources.length)return Promise.resolve(false);
 for(const source of sources)owners.get(source)?.();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=document.createElement('canvas');canvas.dataset.dimensionVoidFx='pale-vortex-01';canvas.dataset.uids=JSON.stringify(sources.map(n=>n.dataset.uid));canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none',zIndex:'136'});
 const dpr=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.ceil(innerWidth*dpr);canvas.height=Math.ceil(innerHeight*dpr);
 const c=canvas.getContext('2d');if(!c)return Promise.resolve(false);
 let surface:VoidGrantSurface|undefined;
 if(!reduced){try{surface=new VoidGrantSurface();}catch{/* A short static coat preserves the state cue without WebGL. */}}
 const brief=reduced||!surface,duration=brief?190:VOID_GRANT_DURATION;
 canvas.dataset.reduced=String(brief);
 return new Promise(resolve=>{
  let raf=0,done=false;const start=performance.now();
  const finish=(complete=false)=>{
   if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);canvas.remove();surface?.dispose();
   for(const source of sources)if(owners.get(source)===abort)owners.delete(source);
   signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);resolve(complete);
  };
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const deadline=setTimeout(abort,1800);
  for(const source of sources)owners.set(source,abort);
  signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  document.body.append(canvas);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden){abort();return;}
   const age=now-start;if(age>=duration){finish(true);return;}
   const alive=sources.filter(n=>n.isConnected);if(!alive.length){abort();return;}
   canvas.dataset.time=String(Math.round(age));
   c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.setTransform(dpr,0,0,dpr,0,0);
   try{
    const texture=surface?.draw(age);
    for(const source of alive){
     const r=combatVisualRect(source)??source.getBoundingClientRect();
     if(!(r.width>0&&r.height>0)||![r.x,r.y,r.width,r.height].every(Number.isFinite))continue;
     if(texture)c.drawImage(texture,r.left,r.top,r.width,r.height);
     else{c.save();c.globalAlpha=.66*Math.min(1,age/20)*Math.min(1,(duration-age)/110);c.fillStyle='#a080c3';c.beginPath();c.roundRect(r.left,r.top,r.width,r.height,r.width*.035);c.fill();c.restore();}
    }
   }catch{abort();return;}
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
 });
}
