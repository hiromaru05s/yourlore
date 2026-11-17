// Coordinates follow the 256px daylight crop. The brooch holds the two hood hems together.
export type Point = readonly [number, number];
export type Brush = CanvasRenderingContext2D;
export const clasp: Point = [113, 199];
export const clamp = (value:number) => Math.max(0, Math.min(1, value));
export function ease(start:number,end:number,t:number) {
  const u=clamp((t-start)/(end-start));
  return u*u*(3-2*u);
}
export function envelope(t:number,a:number,b:number,c:number,d:number) {
  return ease(a,b,t)*(1-ease(c,d,t));
}
export function curve(points:readonly Point[], t:number): Point {
  const x=clamp(t)*(points.length-1), i=Math.min(points.length-2,Math.floor(x)), u=x-i;
  const a=points[Math.max(0,i-1)], b=points[i], c=points[i+1], d=points[Math.min(points.length-1,i+2)];
  const axis=(j:0|1)=>.5*(2*b[j]+(-a[j]+c[j])*u+(2*a[j]-5*b[j]+4*c[j]-d[j])*u*u+(-a[j]+3*b[j]-3*c[j]+d[j])*u*u*u);
  return [axis(0),axis(1)];
}
export function polygon(ctx:Brush,points:readonly Point[],fill:string|CanvasGradient,stroke?:string) {
  ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}
}
export function taper(ctx:Brush,path:readonly Point[],from:number,to:number,width:number,fill:string) {
  if(to-from<.002 || width<=0)return;
  const top:Point[]=[],bottom:Point[]=[];
  for(let i=0;i<=36;i++){
    const u=i/36,t=from+(to-from)*u, [x,y]=curve(path,t);
    const a=curve(path,t-.003),b=curve(path,t+.003),dx=b[0]-a[0],dy=b[1]-a[1];
    const r=width*.5*Math.pow(Math.sin(Math.PI*u),.64)/(Math.hypot(dx,dy)||1);
    top.push([x-dy*r,y+dx*r]);bottom.push([x+dy*r,y-dx*r]);
  }
  polygon(ctx,[...top,...bottom.reverse()],fill);
}
export function pool(ctx:Brush,x:number,y:number,rx:number,ry:number,color:string,opacity:number) {
  if(opacity<=0)return;
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);ctx.globalAlpha*=clamp(opacity);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(1,color+'00');
  ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
export function glint(ctx:Brush,x:number,y:number,r:number,color:string) {
  if(r<=0)return;
  polygon(ctx,[[x,y-r],[x+r*.16,y-r*.16],[x+r*.75,y],[x+r*.13,y+r*.13],[x,y+r],[x-r*.14,y+r*.14],[x-r*.75,y],[x-r*.16,y-r*.16]],color);
}
