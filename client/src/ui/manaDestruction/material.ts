import {makeSkin,type Skin} from './illumination';
import {variants,type P} from './catalog';
export type Piece={poly:P[];center:P;canvas:HTMLCanvasElement;base:HTMLCanvasElement;box:{x:number;y:number;w:number;h:number};depth:number;area:number};
export type Material={face:HTMLCanvasElement;mana:HTMLCanvasElement;rim:HTMLCanvasElement;pieces:Piece[][];skins:Skin[]};
const cv=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;};
const noise=(n:number)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
function cut(poly:P[],a:number,b:number,d:number){const out:P[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],u=p.x*a+p.y*b-d,v=q.x*a+q.y*b-d;if(u<=0)out.push(p);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}}return out;}
/** Irregular interlocking facets. Every fragment is a partition of the card, never an emitted sprite. */
function fracture(mode:number,n:number):P[][]{
 const sites:P[]=[];
 // Blue-noise-like seeds avoid the rows of equally sized confetti in the previous version.
 for(let k=0;sites.length<n&&k<n*80;k++){
  const q={x:noise(k*2+mode*179),y:noise(k*2+1+mode*179)};
  if(sites.every(p=>Math.hypot((p.x-q.x)*.8,p.y-q.y)>.043))sites.push(q);
 }
 return sites.map((s,i)=>{let poly:P[]=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];for(let j=0;j<sites.length&&poly.length;j++){if(i===j)continue;const q=sites[j];poly=cut(poly,2*(q.x-s.x),2*(q.y-s.y),q.x*q.x+q.y*q.y-s.x*s.x-s.y*s.y);}return poly;}).filter(p=>p.length>2);
}
function trace(c:CanvasRenderingContext2D,poly:P[],w:number,h:number){c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h));c.closePath();}
export function makeMaterial(face:HTMLCanvasElement):Material{
 const w=face.width,h=face.height,mana=cv(w,h),ctx=mana.getContext('2d',{willReadFrequently:true})!,data=ctx.createImageData(w,h),p=data.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4,u=x/w,v=y/h,ex=Math.max(Math.abs(u-.5)-.363,0),ey=Math.max(Math.abs(v-.5)-.400,0),f=Math.exp(-((u-.44)**2*15+(v-.46)**2*4));
  p[k+3]=Math.round(Math.max(0,Math.min(1,(.039-Math.hypot(ex,ey))*w))*255);p[k]=25+f*143;p[k+1]=112+f*114;p[k+2]=255;
 }ctx.putImageData(data,0,0);
 const rim=cv(w,h),r=rim.getContext('2d',{willReadFrequently:true})!;r.drawImage(mana,0,0);r.globalCompositeOperation='source-in';r.fillStyle='#b5edff';r.fillRect(0,0,w,h);r.globalCompositeOperation='destination-out';r.drawImage(mana,2,2,w-4,h-4);
 const skins=variants.map(v=>makeSkin(face,v.mode));
 const pieces=variants.map(v=>fracture(v.mode,v.n).map((poly,i)=>{
  const xs=poly.map(p=>p.x*w),ys=poly.map(p=>p.y*h),x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys)),pw=Math.ceil(Math.max(...xs))-x,ph=Math.ceil(Math.max(...ys))-y,base=cv(pw+6,ph+6),bc=base.getContext('2d',{willReadFrequently:true})!;
  bc.translate(3-x,3-y);trace(bc,poly,w,h);bc.clip();bc.drawImage(skins[v.mode].lit,0,0,w,h);
  const pic=cv(pw+6,ph+6),c=pic.getContext('2d',{willReadFrequently:true})!;c.drawImage(base,0,0);c.translate(3-x,3-y);c.globalCompositeOperation='source-atop';
  const depth=noise(i*4.7+v.mode*101),g=c.createLinearGradient(x,y,x+pw*.9,y+ph);
  g.addColorStop(0,'#e8f2f6');g.addColorStop(.25,'#bbdfe9');g.addColorStop(.60,depth>.68?'#88bdd6':'#639cbe');g.addColorStop(1,'#46769b');c.fillStyle=g;c.fillRect(x,y,pw,ph);
  const center={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length};
  // Broad clear face, narrow reflection, and a subdued blue side. No star sprite or noisy grain.
  const edge=poly[(i+1)%poly.length],next=poly[(i+2)%poly.length];
  c.fillStyle=depth>.5?'#effcff7a':'#d9f8ff48';trace(c,[edge,next,{x:center.x+(edge.x-center.x)*.12,y:center.y+(edge.y-center.y)*.12}],w,h);c.fill();
  trace(c,poly,w,h);c.strokeStyle='#095b9c66';c.lineWidth=1.7;c.stroke();
  c.strokeStyle='#d7f8ff';c.lineWidth=.85;c.beginPath();c.moveTo(edge.x*w,edge.y*h);c.lineTo(next.x*w,next.y*h);c.stroke();
  let area=0;poly.forEach((p,j)=>{const q=poly[(j+1)%poly.length];area+=p.x*q.y-q.x*p.y;});
  return{poly,center,canvas:pic,base,box:{x:(x-3)/w,y:(y-3)/h,w:(pw+6)/w,h:(ph+6)/h},depth,area:Math.abs(area)/2};
 }));return{face,mana,rim,pieces,skins};
}
