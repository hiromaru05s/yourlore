import {CARD_PADDING} from './cardSurface';
import {acquireSilverInk,silverInkState,SILVER_INK_DURATION} from './riftInkRenderer';
import type {Point} from './riftTransmute';

/** Approved silver-ink surface, projected through the actual card's DOMMatrix. */
export async function playSilverRift(node:HTMLElement,target:HTMLElement,face:HTMLCanvasElement,start:DOMMatrix,sink:Point,signal:AbortSignal,onStart:()=>void):Promise<boolean>{
 const width=innerWidth,height=innerHeight,w=node.offsetWidth,h=node.offsetHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(signal.aborted||!w||!h)return true;
 const project=(x:number,y:number):Point=>{const p=start.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w};};
 const source=project(w/2,h/2),left=project(0,h/2),right=project(w,h/2);
 const padded=w*(1+2*CARD_PADDING),screenWidth=Math.hypot(right.x-left.x,right.y-left.y)*(1+2*CARD_PADDING);
 if(!Number.isFinite(screenWidth)||screenWidth<1)return false;
 const unit=Math.min(320,Math.max(96,screenWidth*dpr*1.2)),ratio=(h+2*w*CARD_PADDING)/padded;
 // Preserve the source location even for the opponent's hand near the upper edge.
 const lift=Math.min(screenWidth*.2,Math.max(0,source.y-screenWidth*.85));
 const local=document.createElement('canvas');local.width=Math.ceil(unit*2.8);local.height=Math.ceil(unit*3.4);
 const lc=local.getContext('2d')!;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.className='rift-fold-canvas rift-transmute-canvas rift-silver-ink-canvas';canvas.setAttribute('aria-hidden','true');canvas.dataset.variant='inscription';canvas.dataset.duration=String(SILVER_INK_DURATION);
 const cols=8,rows=10,grid:{uv:Point;rest:Point}[]=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)grid.push({uv:{x:x/cols*local.width,y:y/rows*local.height},rest:project(w/2+(x/cols-.5)*padded*2.8,h/2+(y/rows-.5)*padded*3.4)});
 let acquired:ReturnType<typeof acquireSilverInk>;
 try{acquired=acquireSilverInk();}catch{return false;}
 const style=node.getAttribute('style');let frame=0,finish=(_ok:boolean)=>{},ok=true;
 const abort=()=>finish(true);
 const invalid=()=>signal.aborted||document.hidden||!node.isConnected||!target.isConnected||innerWidth!==width||innerHeight!==height;
 function paint(ms:number){
  const s=silverInkState(ms);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
  canvas.dataset.progress=(ms/SILVER_INK_DURATION).toFixed(3);canvas.dataset.phase=['浮上','カード発光','銀紋の流墨','リフトへの軌跡','到着'][s.phase];
  if(ms<2040){
   // The contact shadow stays on the board while the material rises above it.
   c.save();c.globalAlpha=.17*s.lift*(1-s.collapse);c.fillStyle='#20102e';c.shadowColor='#281733';c.shadowBlur=screenWidth*.08;c.beginPath();c.ellipse(source.x,source.y+screenWidth*.35,screenWidth*.35,screenWidth*.08,0,0,Math.PI*2);c.fill();c.restore();
   lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,local.width,local.height);lc.translate(local.width/2,local.height/2);
   acquired.renderer.draw(lc,face,{x:0,y:0},{x:0,y:0},unit,ms,{part:'source',heightRatio:ratio,lift:0,ground:false});
   const points=grid.map(v=>({x:v.rest.x,y:v.rest.y-lift*s.lift}));
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,d=a+cols+1,e=d+1;for(const ids of [[a,b,e],[a,e,d]])triangle(c,local,ids.map(i=>grid[i].uv),ids.map(i=>points[i]));}
  }
  acquired.renderer.draw(c,face,source,sink,screenWidth,ms,{part:'transfer',lift});
 }
 try{
  // Warm the shader before starting the animation clock or hiding the live card.
  paint(0);if(invalid())return true;
  document.body.append(canvas);node.style.visibility='hidden';onStart();
  const begun=performance.now();
  ok=await new Promise<boolean>(resolve=>{
   let ended=false;finish=value=>{if(ended)return;ended=true;cancelAnimationFrame(frame);resolve(value);};
   signal.addEventListener('abort',abort,{once:true});
   const tick=(now:number)=>{if(invalid()){finish(true);return;}const ms=Math.min(SILVER_INK_DURATION,Math.max(0,now-begun));try{paint(ms);}catch{finish(false);return;}if(ms===SILVER_INK_DURATION)finish(true);else frame=requestAnimationFrame(tick);};
   frame=requestAnimationFrame(tick);
  });
 }catch{ok=false;}finally{cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);canvas.remove();acquired.release();if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}
 return ok;
}
/** Texture triangles retain perspective without changing the card's initial silhouette. */
function triangle(c:CanvasRenderingContext2D,image:HTMLCanvasElement,src:Point[],dst:Point[]){
 const [a,b,d]=src,[p,q,r]=dst,den=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
 if(Math.abs((q.x-p.x)*(r.y-p.y)-(r.x-p.x)*(q.y-p.y))<.02)return;
 const aa=((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,bb=((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))/den,cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))/den,dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))/den;
 c.save();c.beginPath();const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 dst.forEach((v,i)=>{const dx=v.x-center.x,dy=v.y-center.y,l=Math.hypot(dx,dy)||1,x=v.x+dx/l*.25,y=v.y+dy/l*.25;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.clip();c.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);c.drawImage(image,0,0);c.restore();
}
