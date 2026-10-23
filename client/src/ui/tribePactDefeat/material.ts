/** The same public spell face carries the inscription, break and falling halves. */
export const PACT_DURATION = 4900;
export const smooth = (a:number,b:number,t:number) => {const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
const fracture = [[-.5,-.5],[-.15,-.35],[-.23,-.20],[.04,-.08],[-.06,.07],[.18,.22],[.09,.32],[.5,.5]];
const crests = [[0,-.24],[-.25,-.06],[.25,-.06],[-.18,.22],[.20,.22]];
export class PactMaterial {
 readonly canvas=document.createElement('canvas');
 private ctx:CanvasRenderingContext2D;
 private surface:HTMLCanvasElement;
 readonly ratio:number;
 constructor(face:HTMLCanvasElement){
  this.canvas.width=this.canvas.height=1000;this.ctx=this.canvas.getContext('2d')!;
  // Crop capture padding; native alpha and the complete frame are retained.
  this.ratio=(face.height-768*.24)/768;
  this.surface=document.createElement('canvas');this.surface.width=768;this.surface.height=Math.round(768*this.ratio);
  this.surface.getContext('2d')!.drawImage(face,768*.12,768*.12,768,768*this.ratio,0,0,768,768*this.ratio);
 }
 draw(t:number){
  const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1000,1000);
  c.translate(500,500);c.scale(460,460*this.ratio);
  const charge=smooth(500,1500,t),split=smooth(2150,2950,t),burn=smooth(3100,4270,t);
  // An actual contact shadow under the card shrinks as the contract rises.
  if(t<3300){c.save();c.translate(0,.59);c.scale(1,.14);c.fillStyle=`rgba(12,6,11,${.23*(1-split)})`;c.beginPath();c.ellipse(0,0,.48,.4,0,0,Math.PI*2);c.fill();c.restore();}
  for(const half of [-1,1]){
   c.save();c.translate(half*split*.17,split*split*.10);c.rotate(half*split*.19);
   c.scale(1-burn*.62,1-burn*.35);
   c.beginPath();c.moveTo(fracture[0][0],fracture[0][1]);for(const p of fracture.slice(1))c.lineTo(p[0],p[1]);
   if(half<0){c.lineTo(-.5,.5);c.lineTo(-.5,-.5);}else{c.lineTo(.5,-.5);c.lineTo(-.5,-.5);}c.closePath();c.clip();
   c.drawImage(this.surface,-.5,-.5,1,1);
   // Ink collects within the material. The artwork stays legible below the gold writing.
   c.globalCompositeOperation='source-atop';c.fillStyle=`rgba(37,9,23,${charge*.38+burn*.3})`;c.fillRect(-.5,-.5,1,1);c.globalCompositeOperation='source-over';
   c.strokeStyle=`rgba(246,211,145,${charge*.8})`;c.lineWidth=.003;
   c.strokeRect(-.437,-.437,.874,.874);c.strokeRect(-.416,-.416,.832,.832);
   // Five promises are linked on the printed pact. Each extinguishes separately.
   for(let i=0;i<5;i++){
    const p=crests[i],next=crests[(i+1)%5],fail=smooth(1450+i*95,1820+i*95,t);
    c.strokeStyle=fail>.2?`rgba(255,${Math.round(180-110*fail)},70,${charge})`:`rgba(255,229,165,${charge})`;
    c.lineWidth=.004;c.beginPath();c.moveTo(p[0],p[1]);c.quadraticCurveTo(0,.06,next[0],next[1]);c.stroke();
    c.save();c.translate(p[0],p[1]);c.rotate(Math.PI/4);c.strokeRect(-.042,-.042,.084,.084);c.restore();
    // Short engraved glyph strokes, not particles, follow the face's transform.
    for(let j=0;j<4;j++){const x=p[0]-.055+j*.032,y=p[1]+.075;c.beginPath();c.moveTo(x,y);c.lineTo(x+.012,y-.016);c.lineTo(x+.022,y);c.moveTo(x+.011,y-.015);c.lineTo(x+.011,y+.012);c.stroke();}
   }
   const cut=smooth(1540,2160,t);
   if(cut>0){
    // Hot edge, dark incision and a fine white core all share the exact tear path.
    const path=()=>{c.beginPath();c.moveTo(fracture[0][0],fracture[0][1]);const n=cut*(fracture.length-1);for(let i=1;i<fracture.length;i++){const f=Math.min(1,Math.max(0,n-i+1)),a=fracture[i-1],b=fracture[i];c.lineTo(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);if(f<1)break;}};
    for(const [width,color] of [[.035,'#290b15'],[.016,'#de4939'],[.004,'#ffe5a3']] as const){path();c.lineWidth=width;c.strokeStyle=color;c.stroke();}
   }
   // Irregular bites eat through the two original halves; no replacement sprite.
   if(burn>0){c.globalCompositeOperation='destination-out';for(let i=0;i<26;i++){
    const x=Math.sin(i*18.31)*.50,y=Math.cos(i*8.77)*.50,r=Math.max(0,burn-.17*(i%5))*.30;
    c.beginPath();for(let j=0;j<7;j++){const a=j*Math.PI*2/7,rr=r*(.76+.24*Math.sin(i+j*13));const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fill();
   }}
   c.restore();
  }
  // Broad, sharp-edged seal strikes the card before it opens; it breaks with it.
  if(t>1750&&t<2900){const stamp=smooth(1750,1910,t),fade=1-smooth(2350,2900,t);c.save();c.globalAlpha=fade;c.scale(1+(1-stamp)*.55,1+(1-stamp)*.55);c.rotate(-.12);c.strokeStyle='#ffb98c';c.lineWidth=.012;c.fillStyle='#511623e8';c.fillRect(-.31,-.085,.62,.17);c.strokeRect(-.31,-.085,.62,.17);c.fillStyle='#ffe6c4';c.font='bold .07px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('×  ×  ×',0,.006);c.restore();}
 }
 dispose(){this.canvas.width=this.canvas.height=1;this.surface.width=this.surface.height=1;}
}
