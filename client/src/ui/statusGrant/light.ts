type P = [number, number];
type C = CanvasRenderingContext2D;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** A continuous optical filament: tapered white core, colored penumbra and reflected light. */
export function luminousPath(c:C, path:P[], progress:number, brand=false, width=1, tail=.4):void {
 const end=clamp(progress);if(end<=0||path.length<2)return;
 const start=Math.max(0,end-tail),samples=64;
 const point=(u:number):P=>{const f=clamp(u)*(path.length-1),i=Math.min(path.length-2,Math.floor(f)),t=f-i;
  const a=path[Math.max(0,i-1)],b=path[i],d=path[i+1],e=path[Math.min(path.length-1,i+2)];
  return [0,1].map(k=>.5*((2*b[k])+(-a[k]+d[k])*t+(2*a[k]-5*b[k]+4*d[k]-e[k])*t*t+(-a[k]+3*b[k]-3*d[k]+e[k])*t*t*t)) as P;};
 c.save();c.globalCompositeOperation='screen';c.lineCap='round';
 const colors=brand?['#ba183c','#f14b55','#ffba8c','#fff1d9']:['#1677cf','#42cafa','#bdedff','#f5fcff'];
 for(let layer=0;layer<4;layer++){
  c.strokeStyle=colors[layer];const original=c.globalAlpha;
  for(let j=0;j<samples;j++){
   const u=j/samples,v=(j+1)/samples,a=point(start+(end-start)*u),b=point(start+(end-start)*v);
   const taper=Math.pow(Math.sin(Math.PI*(.015+.97*u)),.7),pulse=.78+.22*Math.sin(u*12+end*8);
   c.globalAlpha=original*[.08,.2,.55,.94][layer]*taper*pulse;
   c.lineWidth=width*[13,5.2,1.5,.48][layer]*(.18+.82*taper);
   c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
  }c.globalAlpha=original;
 }
 const head=point(Math.max(start,end-.012)),r=width*12,g=c.createRadialGradient(...head,0,...head,r);
 g.addColorStop(0,brand?'#fff0dacc':'#eefaffcc');g.addColorStop(.07,brand?'#ffb89088':'#b4edff88');g.addColorStop(.3,brand?'#eb29462b':'#36b8ed2b');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(head[0]-r,head[1]-r,r*2,r*2);c.restore();
}
export function transferLight(c:C,t:number,a:P,b:P,brand:boolean,scale=1):void{
 const smooth=(a:number,b:number,t:number)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v)};
 const p=smooth(.04,.33,t),fade=1-smooth(.26,.45,t);if(!p||!fade)return;
 c.save();c.globalAlpha*=fade;
 luminousPath(c,[a,[a[0]+(b[0]-a[0])*.32,a[1]+(b[1]-a[1])*.32-24*scale],[a[0]+(b[0]-a[0])*.7,a[1]+(b[1]-a[1])*.7-15*scale],b],p,brand,1.25*scale,.26);c.restore();
}
