/** Approved study 04: rigid echo. Coordinates remain on the native card face. */
type Point=[number,number];
export const ease=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
export class RigidEcho {
 constructor(private c:CanvasRenderingContext2D){}
 draw(ms:number,entry:number,exit:number,reduced:boolean){
  const c=this.c,time=reduced?1.26:ms/1000,level=entry*(1-exit);
  c.setTransform(1.5,0,0,1.5,0,0);c.clearRect(0,0,180,280);
  if(level<=0)return;
  const q=time%1.7,hit=reduced?0:(1-ease(.06,.42,q))*ease(0,.045,q);
  c.save();c.lineCap='round';c.lineJoin='round';
  // Reserve the name, cost, attack and health areas even during attack transforms.
  c.beginPath();c.rect(0,43,180,197);c.clip();
  const wash=c.createLinearGradient(0,0,180,220);
  wash.addColorStop(0,`rgba(69,30,114,${level*(.2+hit*.1)})`);
  wash.addColorStop(.5,`rgba(133,72,193,${level*.1})`);
  wash.addColorStop(1,`rgba(237,182,70,${level*.16})`);
  c.fillStyle=wash;c.fillRect(7,27,166,223);
  c.translate(90,140);c.scale(1-exit*.18,1-exit*.44);c.translate(-90,-140);
  this.echo(level,time,hit);c.restore();
 }
 private line(points:Point[],alpha:number,width=5,gold=false){
  const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle=`rgba(44,19,72,${alpha*.85})`;c.lineWidth=width+5;c.stroke();
  c.strokeStyle=gold?`rgba(245,188,67,${alpha})`:`rgba(174,111,243,${alpha})`;c.lineWidth=width;c.stroke();
  c.strokeStyle=gold?`rgba(255,247,175,${alpha})`:`rgba(246,222,255,${alpha})`;c.lineWidth=width*.32;c.stroke();
 }
 private bolt(a:Point,b:Point,t:number,seed:number,amp=10):Point[]{
  const pts:Point[]=[],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
  for(let j=0;j<=8;j++){const q=j/8,noise=Math.sin(j*9.7+seed*4.3+Math.floor(t*9)*1.27);const k=j===0||j===8?0:noise*amp;pts.push([a[0]+dx*q-dy/len*k,a[1]+dy*q+dx/len*k]);}return pts;
 }
 private echo(a:number,t:number,hit:number){
  // Staggered displaced card silhouettes snap back: a rigid body with delayed surface echoes.
  const phase=t%1.7,lag=phase<.34?1-ease(.12,.34,phase):.22+.12*Math.sin(t*3);
  for(const side of [-1,1])for(let k=2;k>=1;k--){
   const shift=side*(5+k*5)*(lag+.25),alpha=a*(k===1?.7:.36);
   this.line([[29+shift,51],[21+shift,75],[21+shift,216],[32+shift,242],[148+shift,242],[159+shift,218],[159+shift,76],[150+shift,51]],alpha,4,k===1);
  }
  for(const side of [-1,1]){
   const x=90+side*58;
   const pts=this.bolt([x,66],[x,227],t,side,8+hit*5);this.line(pts,a*.95,6,true);
   this.line([[x,125],[x-side*23,137],[x-side*9,156],[x-side*28,168]],a*.85,4);
  }
 }
}
