import {paintContactFriction} from './friction';
export type Point=[number,number];
type SeamImage=(time:number,length:number)=>HTMLCanvasElement|null;

/** The default light is attached to both moving edges, before and after contact. */
export function paintSeam(g:CanvasRenderingContext2D,points:Point[],t:number,seamImage?:SeamImage,reduced=false){
 const [a,b]=points,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(length<1)return;
 g.save();g.translate(a[0],a[1]);g.rotate(Math.atan2(dy,dx));
 const light=seamImage?.(t,length);
 g.globalCompositeOperation='screen';
 if(light)g.drawImage(light,0,-120,length,240);
 else{
  // Explicit non-WebGL fallback keeps the same default blue-white edge.
  const glow=g.createLinearGradient(0,-26,0,26);
  glow.addColorStop(0,'#73baff00');glow.addColorStop(.45,'#73baff55');
  glow.addColorStop(.5,'#e2f4ff');glow.addColorStop(.55,'#73baff55');glow.addColorStop(1,'#73baff00');
  g.fillStyle=glow;g.fillRect(0,-26,length,52);
 }
 if(!reduced)paintContactFriction(g,t,length);
 g.restore();
}
