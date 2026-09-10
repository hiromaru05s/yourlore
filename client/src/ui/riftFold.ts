/** Each strip reaches the slit at its own time. No opacity envelope: absorbed
 * vertices collapse at the aperture while the trailing paper stays visible. */
export type RiftPoint={x:number;y:number;z:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function foldIntoRift(point:RiftPoint,row:RiftPoint,target:RiftPoint,q:number,t:number,width:number):RiftPoint {
  if(t<=0)return {...point};
  const u=clamp(t/(1-.34*clamp(q)));
  if(u===1)return {...target};
  const p=u*u*(3-2*u),remain=1-p;
  const dx=target.x-row.x,dy=target.y-row.y,length=Math.hypot(dx,dy)||1;
  const wave=Math.sin(Math.PI*u)*Math.sin(q*Math.PI*2-u*Math.PI)*width*.035;
  const twist=Math.sin(Math.PI*u)*Math.sin(q*Math.PI+u*2)*.10;
  const ox=point.x-row.x,oy=point.y-row.y,shrink=remain**.85;
  return {
    x:row.x+dx*p+((ox*Math.cos(twist)-oy*Math.sin(twist))*shrink)-dy/length*wave,
    y:row.y+dy*p+((ox*Math.sin(twist)+oy*Math.cos(twist))*shrink)+dx/length*wave,
    z:(point.z*remain)+Math.sin(Math.PI*u)*Math.sin(q*Math.PI*2+u*4)*width*.045,
  };
}
