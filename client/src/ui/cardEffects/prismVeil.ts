/** Selected 01 / Prism Veil. The shared card-effect runtime owns scheduling,
 * visibility, reduced motion and ownership. This class only owns its material.
 * Match the approved 320 x 500 card-local surface at twice the original clock. */
const TAU=Math.PI*2;
const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const PRISM_VEIL_EFFECT_ID='effect:prism-veil';
export class PrismVeilMaterial {
 readonly canvas=document.createElement('canvas');
 private readonly ctx:CanvasRenderingContext2D;
 private readonly ridges=document.createElement('canvas');
 private ready=false;
 private removed=false;
 readonly phase:number;
 constructor(readonly card:HTMLElement,seed=0){
  this.phase=hash(seed+31)*TAU;
  const art=card.querySelector<HTMLElement>('.card-art');
  if(!art)throw new Error('Prism Veil requires a public card art surface');
  this.canvas.className='card-effect-surface card-effect-prism-veil';
  this.canvas.setAttribute('aria-hidden','true');
  this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;mix-blend-mode:screen';
  this.canvas.width=320;this.canvas.height=500;
  const ctx=this.canvas.getContext('2d');
  if(!ctx)throw new Error('Prism Veil canvas unavailable');
  this.ctx=ctx;art.append(this.canvas);
  let img=art.querySelector<HTMLImageElement>('img');
  // Persistent spell/quest tiles expose their art as a CSS background.
  if(!img&&art.classList.contains('buff-art')){
   const url=getComputedStyle(art).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
   if(url){img=new Image();img.src=url;}
  }
  if(img)void img.decode().then(()=>{if(this.removed)return;this.makeRelief(img);this.ready=true;}).catch(()=>{});
 }
 private makeRelief(img:HTMLImageElement){
  const c=this.ridges;c.width=320;c.height=500;const g=c.getContext('2d',{willReadFrequently:true})!;
  const tile=this.card.classList.contains('buff-icon'),field=this.card.classList.contains('card--field');
  const x=tile?0:24,y=tile?0:field?22.5:90,h=tile?500:field?455:385,w=tile?320:272;
  const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/s,sh=h/s;
  g.drawImage(img,(img.naturalWidth-sw)*.5,(img.naturalHeight-sh)*(tile?.5:.22),sw,sh,x,y,w,h);
  const pixels=g.getImageData(0,0,320,500),a=pixels.data,luma=new Float32Array(320*500);
  for(let i=0;i<luma.length;i++)luma[i]=(a[i*4]*.2126+a[i*4+1]*.7152+a[i*4+2]*.0722)/255;
  for(let i=0;i<luma.length;i++){const edge=Math.abs(luma[i]-luma[Math.max(0,i-1)])+Math.abs(luma[i]-luma[Math.max(0,i-320)]);a[i*4]=186;a[i*4+1]=224;a[i*4+2]=255;a[i*4+3]=Math.min(140,(edge*290+luma[i]*16))*(a[i*4+3]/255);}
  g.putImageData(pixels,0,0);
 }
 draw(seconds:number,strength=1){
  if(this.removed)return;
  const c=this.ctx,t=seconds*2,phase=this.phase;
  c.clearRect(0,0,320,500);c.save();c.globalAlpha=strength;

   const x=170+Math.sin(t*.48+phase)*155,g=c.createLinearGradient(x-155,0,x+145,170);
   const stops:[number,string][]=[[0,'#71d9ff00'],[.18,'#78dcff12'],[.36,'#70e4ff65'],[.49,'#f5cfff88'],[.61,'#f9d58c65'],[.78,'#afc7ff18'],[1,'#bb91ff00']];stops.forEach(([p,v])=>g.addColorStop(p,v));c.fillStyle=g;c.fillRect(0,0,320,500);
   for(let i=0;i<65;i++){const y=i*9,a=.018+.065*Math.pow(Math.max(0,Math.sin(i*.12-t*.65+phase)),8);c.strokeStyle=`rgba(207,236,255,${a})`;c.lineWidth=.6;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(100,y-35,210,y+65,320,y+12);c.stroke();}
   if(this.ready){c.globalAlpha=strength*(.3+.25*Math.sin(t*.48+phase)**2);c.drawImage(this.ridges,0,0);}
   for(let i=0;i<7;i++)this.star(30+hash(i+71)*260,110+hash(i+81)*330,Math.pow(Math.max(0,Math.sin(t*.7+phase+i*1.7)),20)*.65,2.6,'229,243,255');

  c.restore();
 }
 private star(x:number,y:number,a:number,r:number,rgb:string){if(a<.035)return;const c=this.ctx;c.save();c.globalAlpha*=a;c.fillStyle=`rgba(${rgb},.95)`;c.beginPath();c.moveTo(x-r,y);c.quadraticCurveTo(x-.6,y-.6,x,y-r*1.4);c.quadraticCurveTo(x+.6,y-.6,x+r,y);c.quadraticCurveTo(x+.6,y+.6,x,y+r*1.4);c.quadraticCurveTo(x-.6,y+.6,x-r,y);c.fill();c.restore();}
 dispose(){
  if(this.removed)return;
  this.removed=true;this.canvas.remove();
  this.ridges.width=this.canvas.width=0;
 }
}
export function createPrismVeil(card:HTMLElement,seed=0):PrismVeilMaterial{return new PrismVeilMaterial(card,seed);}
