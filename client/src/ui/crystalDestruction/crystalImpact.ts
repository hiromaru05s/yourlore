// The contact print and the eight flying pieces share one set of broken edges.
type Point={x:number;y:number};
type Rect={x:number;y:number;width:number;height:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const rim=[[0,0],[.46,0],[1,0],[1,.55],[1,1],[.57,1],[0,1],[0,.46]];
export const CONTACT_MS=238;
export function fracture(from:Rect,to:Rect){
 const dx=to.x+to.width/2-from.x-from.width/2,dy=to.y+to.height/2-from.y-from.height/2;
 const length=Math.hypot(dx,dy)||1,dir={x:dx/length,y:dy/length};
 const h={x:.5-dir.x*.26,y:.5-dir.y*.29};
 const seams=rim.map(([x,y],i)=>{
  const vx=x-h.x,vy=y-h.y,bend=i%2?.078:-.068;
  return [h,{x:h.x+vx*.42-vy*bend,y:h.y+vy*.42+vx*bend},{x:h.x+vx*.58+vy*bend*.4,y:h.y+vy*.58-vx*bend*.4},{x,y}];
 });
 const plates=seams.map((s,i)=>{
  const outline=[...s,...seams[(i+1)%8].slice(1).reverse()];
  const [a,b]=[rim[i],rim[(i+1)%8]];
  const center={x:(a[0]+b[0]+h.x)/3,y:(a[1]+b[1]+h.y)/3};
  return {outline,center};
 });
 return {dir,h,seams,plates};
}
export type Fracture=ReturnType<typeof fracture>;
type Ctx=CanvasRenderingContext2D;
function seamPath(ctx:Ctx,points:Point[],w:number,h:number,progress:number){
 ctx.beginPath();ctx.moveTo(points[0].x*w,points[0].y*h);
 for(let j=1;j<points.length;j++){
  const u=clamp(progress*3-j+1),a=points[j-1],b=points[j];
  ctx.lineTo(lerp(a.x,b.x,u)*w,lerp(a.y,b.y,u)*h);if(u<1)break;
 }
}
function stroke(ctx:Ctx,color:string,width:number){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
export function paintContactFlash(ctx:Ctx,m:Fracture,w:number,h:number,ms:number){
 const t=clamp(ms/148),radius=w*(.26+.61*(1-(1-t)**4)),width=(1-t)**.72;
 if(!width)return;
 ctx.save();ctx.translate(m.h.x*w,m.h.y*h);ctx.rotate(Math.atan2(m.dir.y,m.dir.x));ctx.scale(.73,1.15);
 for(const [factor,color] of [[1,'#352630'],[.83,'#e7903c'],[.62,'#fff6c1']] as const){
  ctx.beginPath();
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8+.08,k=i%2?(.065+.11*width):(.57+.41*Math.cos(i*1.7)**2);
   const r=radius*k*factor*(i%2?width:1);
   const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.globalAlpha=Math.min(1,width*2);ctx.fillStyle=color;ctx.fill();
 }
 // A short wedge carries the attack direction into the printed crack.
 ctx.save();ctx.scale(radius,radius*width);
 for(const [size,color] of [[1,'#372530'],[.80,'#f3ad58'],[.48,'#fff8d3']] as const){
  ctx.save();ctx.scale(size,size);ctx.beginPath();ctx.moveTo(.32,0);
  ctx.lineTo(-.42,-.21);ctx.lineTo(-.35,-.10);ctx.lineTo(-1.18,-.18);
  ctx.lineTo(-.52,.025);ctx.lineTo(-.76,.13);ctx.lineTo(-.17,.09);ctx.closePath();
  ctx.fillStyle=color;ctx.fill();ctx.restore();
 }
 ctx.restore();
 // The two broad chips flare sideways from the point of compression.
 for(const sign of [-1,1]){
  ctx.save();ctx.scale(1,sign);
  ctx.beginPath();ctx.moveTo(-w*.02,radius*.12);ctx.lineTo(-w*.27,radius*.85);
  ctx.lineTo(-w*.19,radius*.47);ctx.lineTo(-w*.28,radius*.51);ctx.lineTo(-w*.10,radius*.14);
  ctx.closePath();ctx.fillStyle='#31262b';ctx.fill();ctx.translate(w*.018,0);ctx.scale(.78,.88);
  ctx.fillStyle='#ffd78b';ctx.fill();ctx.restore();
 }
 ctx.restore();
}
export function drawSeams(ctx:Ctx,m:Fracture,w:number,h:number,ms:number){
 const t=clamp(ms/185);
 ctx.save();ctx.lineJoin='bevel';
 m.seams.forEach((s,i)=>{
  const grow=clamp((t*1.75-i%3*.09));
  seamPath(ctx,s,w,h,grow);stroke(ctx,'#162632',w*.040);stroke(ctx,'#82a9bc',w*.017);
  seamPath(ctx,s,w,h,grow*.97);stroke(ctx,t<.57?'#fff0be':'#d4e9ed',w*.009);
 });
 ctx.restore();
}
