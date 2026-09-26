import {acquireVoidSurface,drawVoidSurface} from './voidSurface';
import {boardPoint} from './boardProjection';
import {CARD_METERS} from './readingBoardLayout';
import {cardUnit} from './boardProjection';
import {riftOutline,convexCover,RIFT_DEPTHS} from './riftGeometry';
/** The same meter-space aperture as the Blender cutter, behind its actual rails.
 * Only the narrow Rift column is repainted. Its projection is cached on resize. */
export function mountRiftApertures(root:HTMLElement){
 const canvas=document.createElement('canvas');canvas.className='rift-aperture-layer';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;pointer-events:none;z-index:4';root.append(canvas);
 const c=canvas.getContext('2d')!,texture=document.createElement('canvas');texture.width=192;texture.height=320;const ctx=texture.getContext('2d')!,release=acquireVoidSurface();
 let scaleKey=0;let last=-Infinity,w=0,h=0,left=0,top=0,width=0,height=0,dpr=1;
 let apertures:Array<{path:Path2D;left:number;right:number;top:number;bottom:number;sign:number}>=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const outline=riftOutline();
 function resize(){
  w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio,1.5);const scale=cardUnit(root)/CARD_METERS;scaleKey=scale;
  apertures=[1,-1].map(sign=>{
   // The opaque 3D wooden cut and metal frame are the final mask. Cover the
   // cut's full depth so camera parallax can never expose an empty crescent.
   const samples=RIFT_DEPTHS.flatMap(depth=>outline.map(([x,z])=>boardPoint(w/2+x*scale,h/2+sign*z*scale,depth*scale)));
   const points=convexCover(samples.flatMap(p=>[{x:p.x-1,y:p.y-1},{x:p.x+1,y:p.y+1}])),path=new Path2D();
   points.forEach((p,i)=>i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y));path.closePath();
   return {path,sign,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
  });
  left=Math.floor(Math.min(...apertures.map(a=>a.left)))-1;top=Math.floor(Math.min(...apertures.map(a=>a.top)))-1;
  width=Math.ceil(Math.max(...apertures.map(a=>a.right)))-left+1;height=Math.ceil(Math.max(...apertures.map(a=>a.bottom)))-top+1;
  canvas.style.left=left+'px';canvas.style.top=top+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
 }
 return {tick(now:number){
  if(document.hidden)return;const resized=w!==innerWidth||h!==innerHeight||dpr!==Math.min(devicePixelRatio,1.5)||scaleKey!==cardUnit(root)/CARD_METERS;
  if(!resized&&now-last<66)return;if(reduced.matches&&!resized&&last>0)return;last=now;if(resized)resize();
  c.setTransform(dpr,0,0,dpr,-left*dpr,-top*dpr);c.clearRect(left,top,width,height);drawVoidSurface(ctx,192,320,reduced.matches?0:now/1000);
  for(const a of apertures){c.save();c.clip(a.path);c.translate(a.left,a.sign<0?a.bottom:a.top);c.scale(1,a.sign);c.drawImage(texture,0,0,a.right-a.left,a.bottom-a.top);c.restore();}
 },dispose(){release();canvas.remove();}};
}
