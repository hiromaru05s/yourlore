import {RIFT_MOUNT,readingScale} from './readingBoardLayout';
import {boardPoint} from './boardProjection';
import {acquireVoidSurface,drawVoidSurface} from './voidSurface';
import {captureCardSurface,CARD_PADDING} from './cardSurface';
import {riftCardPoint,riftState,drawRiftTransmute,RIFT_DURATION,type Point} from './riftTransmute';

/** Texture mapped triangles retain the real card face during local gravitational collapse. */
function triangle(c:CanvasRenderingContext2D,image:HTMLCanvasElement,src:Point[],dst:Point[]){
 const [a,b,d]=src,[p,q,r]=dst,den=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
 if(Math.abs((q.x-p.x)*(r.y-p.y)-(r.x-p.x)*(q.y-p.y))<.02)return;
 const aa=((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))/den;
 const bb=((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))/den;
 const cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))/den;
 const dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))/den;
 c.save();c.beginPath();
 // Subpixel overlap prevents hairline seams between adjacent texture triangles.
 const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 dst.forEach((v,i)=>{const dx=v.x-center.x,dy=v.y-center.y,l=Math.hypot(dx,dy)||1;const x=v.x+dx/l*.35,y=v.y+dy/l*.35;i?c.lineTo(x,y):c.moveTo(x,y);});
 c.closePath();c.clip();c.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);c.drawImage(image,0,0);c.restore();
}

/** No card flight: turn the raised card into a vortex, then immediately trail into the Rift. */
export async function swallowRiftCard(node:HTMLElement,target:HTMLElement,start:DOMMatrix,signal:AbortSignal,onStart:()=>void):Promise<void>{
 const width=innerWidth,height=innerHeight,w=node.offsetWidth,h=node.offsetHeight;
 if(signal.aborted||!w||!h)return;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d');if(!c)throw new Error('Canvas unavailable');
 const host=node.cloneNode(true) as HTMLElement;
 host.removeAttribute('id');host.classList.remove('fx-card-flight','cast-reveal','drag-ghost--hand');
 host.style.cssText=`position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;transform:none;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px`;
 document.body.append(host);
 const sleeve=document.querySelector<HTMLElement>('.pile--deck')?.dataset.sleeve||'/art/frames/back.webp';
 let face:HTMLCanvasElement|undefined;
 // If texture capture fails, the DOM card still collapses locally under the same card-local vortex.
 let cancelCapture=()=>{};
 try{
  const surface=await Promise.race([captureCardSurface(host,sleeve,!node.classList.contains('card--back')),new Promise<null>(resolve=>{cancelCapture=()=>resolve(null);signal.addEventListener('abort',cancelCapture,{once:true});})]);
  if(!surface)return;face=surface.face||surface.back;
 }catch{/* Use the live card below. */}finally{signal.removeEventListener('abort',cancelCapture);host.remove();}
 if(signal.aborted||!node.isConnected)return;
 const project=(x:number,y:number):Point=>{const p=start.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w};};
 const source=project(w/2,h/2),r=target.getBoundingClientRect(),sink=target.id==='rift-me'||target.id==='rift-opp'?boardPoint(innerWidth/2+RIFT_MOUNT.x*readingScale(),innerHeight/2+(target.id==='rift-me'?1:-1)*RIFT_MOUNT.z*readingScale(),RIFT_MOUNT.height*readingScale()):{x:r.left+r.width/2,y:r.top+r.height/2};
 const sourceWidth=Math.hypot(project(w,h/2).x-project(0,h/2).x,project(w,h/2).y-project(0,h/2).y);
 // Rasterizing a 1536px capture per triangle wastes work for a 30–180px board card.
 if(face){const small=document.createElement('canvas');small.width=Math.max(192,Math.min(384,Math.ceil(sourceWidth*3)));small.height=Math.round(small.width*face.height/face.width);const raster=small.getContext('2d');if(raster){raster.drawImage(face,0,0,small.width,small.height);face=small;}}
 const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 canvas.className='rift-fold-canvas rift-transmute-canvas';canvas.setAttribute('aria-hidden','true');
 const cols=sourceWidth<60?6:8,rows=sourceWidth<60?10:13,grid:{rest:Point;uv:Point}[]=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)grid.push({rest:project(-w*CARD_PADDING+x/cols*w*(1+2*CARD_PADDING),-w*CARD_PADDING+y/rows*(h+2*w*CARD_PADDING)),uv:{x:x/cols*(face?.width||1),y:y/rows*(face?.height||1)}});
 // Prepare a fully opaque black-violet coating, preserving the exact card silhouette.
 let coating:HTMLCanvasElement|undefined,mixed:HTMLCanvasElement|undefined;
 if(face){coating=document.createElement('canvas');mixed=document.createElement('canvas');coating.width=mixed.width=face.width;coating.height=mixed.height=face.height;
  const d=coating.getContext('2d')!;d.drawImage(face,0,0);d.globalCompositeOperation='source-in';
  const g=d.createLinearGradient(0,0,face.width,face.height);g.addColorStop(0,'#58317c');g.addColorStop(.22,'#1e102d');g.addColorStop(.55,'#090611');g.addColorStop(.82,'#35154e');g.addColorStop(1,'#78539c');d.fillStyle=g;d.fillRect(0,0,face.width,face.height);
  d.globalCompositeOperation='source-atop';drawVoidSurface(d,face.width,face.height,0);

 }
 if(signal.aborted||!node.isConnected)return;
 const releaseVoid=acquireVoidSurface();const oldStyle=node.getAttribute('style');
 let frame=0,finish=()=>{};
 const abort=()=>finish();signal.addEventListener('abort',abort,{once:true});
 try{
  document.body.append(canvas);const begun=performance.now();
  await new Promise<void>(resolve=>{
   let ended=false;finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);resolve();};
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||!node.isConnected||!target.isConnected||innerWidth!==width||innerHeight!==height){finish();return;}
    const ms=Math.min(RIFT_DURATION,Math.max(0,now-begun)),state=riftState(ms);canvas.dataset.progress=(ms/RIFT_DURATION).toFixed(3);canvas.dataset.phase=state.phase;
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
    drawRiftTransmute(c,source,sink,sourceWidth,ms,suction=>{
     if(!face){
      node.style.transition='none';node.style.left='0';node.style.top='0';node.style.transformOrigin='0 0';
      node.style.visibility=suction>=1?'hidden':'visible';
      const center=riftCardPoint(source,source,sourceWidth,state);node.style.transform=new DOMMatrix().translate(center.x,center.y).rotate(-state.lift*2.6+suction*255).scale((1-state.lift*.48)*(1-suction)**.66).translate(-source.x,-source.y).multiply(start).toString();node.style.clipPath=`inset(0 round ${suction*50}%)`;node.style.filter=`brightness(${1-state.shroud*.8}) sepia(${state.shroud}) hue-rotate(225deg)`;return;
     }
     if(suction>=1)return;
     let texture=face;
     if(mixed&&coating){
      const surface=coating.getContext('2d')!;surface.globalCompositeOperation='source-atop';drawVoidSurface(surface,coating.width,coating.height,ms/1000,state.suction);
      const mix=mixed.getContext('2d')!;mix.clearRect(0,0,mixed.width,mixed.height);mix.globalCompositeOperation='source-over';mix.globalAlpha=1;mix.drawImage(face,0,0);mix.globalAlpha=state.shroud;mix.drawImage(coating,0,0);mix.globalAlpha=1;
      // The dark core and accreting highlights live IN the card texture and deform with it.
      // No disk, portal plane or ring is composited over/under the card.
      if(suction>0){
       mix.globalCompositeOperation='source-atop';const x=mixed.width/2,y=mixed.height/2;
       const core=mix.createRadialGradient(x,y,0,x,y,mixed.width*.43);core.addColorStop(0,'#030718');core.addColorStop(.26,'#090f27ee');core.addColorStop(1,'#08041000');mix.globalAlpha=Math.min(1,suction*5);mix.fillStyle=core;mix.fillRect(0,0,mixed.width,mixed.height);
       mix.globalAlpha=Math.sin(Math.PI*suction)*.65;
       for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mix.beginPath();mix.moveTo(x+Math.cos(a)*mixed.width*.16,y+Math.sin(a)*mixed.width*.16);mix.quadraticCurveTo(x+Math.cos(a+.45)*mixed.width*.32,y+Math.sin(a+.45)*mixed.width*.32,x+Math.cos(a+.8)*mixed.width*.49,y+Math.sin(a+.8)*mixed.width*.49);mix.strokeStyle=j%2?'#b8b5f1':'#7064b9';mix.lineWidth=mixed.width*(j%2?.009:.028);mix.stroke();}
       mix.globalAlpha=1;mix.globalCompositeOperation='source-over';
      }
      texture=mixed;
     }
     const points=grid.map(v=>riftCardPoint(v.rest,source,sourceWidth,state));
     for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const a=y*(cols+1)+x,b=a+1,d=a+cols+1,e=d+1;
      for(const ids of [[a,b,e],[a,e,d]])triangle(c,texture,ids.map(i=>grid[i].uv),ids.map(i=>points[i]));
     }
    });
    if(ms===RIFT_DURATION){finish();return;}frame=requestAnimationFrame(tick);
   };
   tick(begun);if(face)node.style.visibility='hidden';onStart();
  });
 }finally{releaseVoid();cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);canvas.remove();if(oldStyle===null)node.removeAttribute('style');else node.setAttribute('style',oldStyle);}
}
