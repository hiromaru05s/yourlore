export type AimPoint={x:number;y:number};
/** A monotone arc: a short drag cannot put its arrowhead behind the attacker. */
export function aimCurve(a:AimPoint,b:AimPoint){
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),bend=Math.min(36,length*.09);
 const nx=length?-dy/length:0,ny=length?dx/length:0;
 const control={x:(a.x+b.x)/2+nx*bend,y:(a.y+b.y)/2+ny*bend};
 return {length,point(t:number){const s=1-t;return {x:s*s*a.x+2*s*t*control.x+t*t*b.x,y:s*s*a.y+2*s*t*control.y+t*t*b.y};},tangent(t:number){const x=2*((1-t)*(control.x-a.x)+t*(b.x-control.x)),y=2*((1-t)*(control.y-a.y)+t*(b.y-control.y)),n=Math.hypot(x,y)||1;return {x:x/n,y:y/n};}};
}
