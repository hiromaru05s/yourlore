/** Selected purchase study 03. Analytic, lit air density (not a CFD solver).
 * Same transparent-board appearance as approved preview 99f5473f. */
const W=120,H=76,N=24;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const bell=(x:number,s:number)=>Math.exp(-x*x/(s*s));
const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x:number,y:number){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;}
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function purchaseAirDensity(x:number,y:number,phase:number){
 const behind=Math.max(0,-x),p=phase*Math.PI*2;
 const turbulent=.60+.40*noise(x*3.4+Math.cos(p)*.5,y*5+Math.sin(p)*.5);
 let d=0;
  // Alternating shed eddies. They convect away and widen, rather than orbit the gem.
  const adv=phase;
  for(let k=0;k<5;k++){const u=k+adv,cx=-.48-u*.61,cy=(k%2?1:-1)*(.24+u*.047),dx=(x-cx)/(.32+u*.024),dy=(y-cy)/(.24+u*.04),r=Math.hypot(dx,dy);
   const a=Math.atan2(dy,dx),spiral=r-.71-.12*Math.sin(a*1.7+u*1.5);d+=bell(spiral,.27)*(1-u/6)*(.72+.28*Math.cos(a-.4));
  }
 // The solid body is never a translucent blue blob; wake emerges at its shoulders.
 const core=1-bell(x/.37,1)*bell(y/.40,1);
 const bounds=(1-smooth(1.15,1.55,x))*(1-smooth(3.2,3.9,behind))*(1-smooth(1.2,1.65,Math.abs(y)));
 return clamp(d*turbulent*core*bounds);
}

export class PurchaseAirWake {
 private fields:Array<{density:Float32Array;light:Float32Array}>=[];
 private patch=document.createElement('canvas');
 private image=new ImageData(W,H);
 constructor(){
  this.patch.width=W;this.patch.height=H;
  for(let f=0;f<N;f++){
   const d=new Float32Array(W*H),light=new Float32Array(W*H);
   for(let y=0;y<H;y++)for(let x=0;x<W;x++)d[y*W+x]=purchaseAirDensity(-3.9+x/(W-1)*5.5,-1.65+y/(H-1)*3.3,f/N);
   for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;light[k]=clamp(.52-(d[k+W]-d[k-W])*2.3-(d[k+1]-d[k-1])*.75);}
   this.fields.push({density:d,light});
  }
 }
 draw(c:CanvasRenderingContext2D,x:number,y:number,angle:number,size:number,age:number,strength:number,dissolve:number){
  if(strength<=0||!this.fields.length)return;
  const f=this.fields[Math.floor(Math.max(0,age)/34)%N],out=this.image.data;
  for(let k=0;k<W*H;k++){
   const i=k*4,d=clamp((f.density[k]-dissolve*.7)/(1-dissolve*.7)),lit=f.light[k]>.51;
   out[i]=lit?226:67;out[i+1]=lit?236:89;out[i+2]=lit?242:105;
   out[i+3]=d<.012?0:Math.round(d*(lit?.42:.30)*strength*255);
  }
  this.patch.getContext('2d')!.putImageData(this.image,0,0);
  const r=size*.41;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(this.patch,-3.9*r,-1.65*r,5.5*r,3.3*r);c.restore();
 }
 dispose(){this.fields.length=0;this.patch.width=this.patch.height=0;}
}
