import {FRAME_BACK} from '../../shared/cards';
import {capturePileSurface} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {TribeRenderer} from '../tribePresentation/renderer';
import {synergyDuration,tier} from '../tribePresentation/catalog';
import {victory as drawVictory} from './victory';
const active=new Set<()=>void>();
export function cancelTribeSynergy(){for(const cancel of [...active])cancel();}
/** Public field cards only. Engine owns the reward and winner; this owns presentation. */
export function playTribeSynergy(nodes:HTMLElement[],isVictory=false,stage=1):Promise<void>{
 if(document.hidden)return Promise.resolve();
 const targets=[...new Set(nodes)].filter(n=>n.isConnected);
 if(!targets.length&&!isVictory)return Promise.resolve();
 return new Promise(resolve=>{
  const painter=new TribeRenderer(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rigs:{node:HTMLElement;el:HTMLElement;canvas:HTMLCanvasElement;face:HTMLCanvasElement;visibility:string}[]=[];
  let ended=false,raf=0,magic:HTMLCanvasElement|undefined;
  const done=()=>{if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(watchdog);active.delete(done);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',done);for(const r of rigs){r.node.style.visibility=r.visibility;r.el.remove();}magic?.remove();resolve();};
  const hidden=()=>{if(document.hidden)done();};
  const watchdog=setTimeout(done,9000);active.add(done);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',done);
  void Promise.all(targets.map(async node=>{
   try{
    const {face}=await capturePileSurface(node,FRAME_BACK);if(ended||!node.isConnected||!face)return;
    const el=document.createElement('div');el.dataset.tribeSynergy=isVictory?'victory':String(tier(stage));el.style.cssText='position:fixed;left:0;top:0;width:180px;height:280px;transform-origin:0 0;pointer-events:none;z-index:180;visibility:hidden';
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;canvas.style.cssText='position:absolute;left:-150px;top:-180px;width:480px;height:640px';el.append(canvas);document.body.append(el);
    const texture=document.createElement('canvas');texture.width=640;texture.height=Math.round(640*face.height/face.width);texture.getContext('2d')!.drawImage(face,0,0,texture.width,texture.height);
    rigs.push({node,el,canvas,face:texture,visibility:node.style.visibility});
   }catch(error){console.warn('[tribe-synergy] Surface unavailable',error);}
  })).then(()=>{
   if(ended)return;
   if(isVictory){magic=document.createElement('canvas');magic.dataset.tribeVictory='true';magic.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:181';document.body.append(magic);}
   if(!rigs.length&&!magic){done();return;}
   const start=performance.now(),duration=isVictory?4800:synergyDuration(stage);
   const draw=(now:number)=>{
    if(ended)return;const ms=now-start;
    if(ms>=duration||rigs.some(r=>!r.node.isConnected)){done();return;}
    for(const r of rigs){r.el.dataset.tribeTime=String(Math.round(ms));r.el.style.transform=projectedPlacement(r.node,180,280).toString();r.node.style.visibility='hidden';r.el.style.visibility='visible';const c=r.canvas.getContext('2d')!;c.setTransform(1.5,0,0,1.5,0,0);c.clearRect(0,0,480,640);if(isVictory)painter.victorySource(c,r.face,Math.min(ms,950),240,320,180,reduced);else painter.synergy(c,r.face,stage,ms,240,320,180,reduced);}
    if(magic){const dpr=Math.min(devicePixelRatio,2);if(magic.width!==Math.round(innerWidth*dpr)||magic.height!==Math.round(innerHeight*dpr)){magic.width=Math.round(innerWidth*dpr);magic.height=Math.round(innerHeight*dpr);}const c=magic.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);const x=innerWidth*.5,y=innerHeight*.54,r=Math.min(innerWidth*.29,innerHeight*.34,260);c.strokeStyle=`rgba(214,167,72,${Math.sin(Math.PI*ms/4800)*.6})`;c.lineWidth=1;for(const rig of rigs){const b=rig.node.getBoundingClientRect();c.beginPath();c.moveTo(b.x+b.width/2,b.y+b.height/2);c.quadraticCurveTo(b.x+b.width/2,y,x,y);c.stroke();}drawVictory(c,ms,x,y,r,reduced);}
    raf=requestAnimationFrame(draw);
   };raf=requestAnimationFrame(draw);
  }).catch(done);
 });
}
