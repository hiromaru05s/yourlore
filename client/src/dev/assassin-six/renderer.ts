import {ease,rank,DURATION} from './catalog';
type C=CanvasRenderingContext2D;
const TAU=Math.PI*2;
let sourceFace:HTMLCanvasElement;

function path(c:C,pts:number[][]){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function card(c:C,face:HTMLCanvasElement){c.drawImage(face,-90,-135,180,270);}
function clipped(c:C,face:HTMLCanvasElement,pts:number[][],dx=0,dy=0,angle=0){c.save();c.translate(dx,dy);c.rotate(angle);path(c,pts);c.clip();card(c,face);c.restore();}
/** A tapered, folded textile strip. Highlights follow its folds; weave is clipped to the material. */
function silk(c:C,points:number[][],width:number,red=false,phase=0){
 if(width<.08)return;
 const upper:number[][]=[],lower:number[][]=[];
 for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,t=i/(points.length-1),w=width*Math.pow(Math.sin(Math.PI*t),.68)*(.74+.19*Math.sin(t*13+phase)+.07*Math.sin(t*31+phase*.6));upper.push([p[0]-(b[1]-a[1])/d*w,p[1]+(b[0]-a[0])/d*w]);lower.push([p[0]+(b[1]-a[1])/d*w,p[1]-(b[0]-a[0])/d*w]);}
 const shape=[...upper,...lower.reverse()];c.save();path(c,shape);c.clip();
 const grad=c.createLinearGradient(-170,-130,180,160);grad.addColorStop(0,red?'#341820':'#080d13');grad.addColorStop(.27,red?'#74333b':'#25313d');grad.addColorStop(.43,red?'#b36969':'#596473');grad.addColorStop(.49,red?'#61252f':'#151b27');grad.addColorStop(.7,red?'#923f47':'#37414f');grad.addColorStop(1,'#070a10');c.fillStyle=grad;c.fillRect(-400,-400,800,800);
 c.save();c.globalAlpha=red?.14:.24;c.globalCompositeOperation='soft-light';c.drawImage(sourceFace,-120,-170,240,340);c.restore();
 // Curved fold valleys and narrow reflected ridges give the textile local depth.
 for(let j=0;j<4;j++){c.beginPath();points.forEach(([x,y],i)=>{const t=i/(points.length-1),off=(j-1.5)*width*.32*Math.sin(t*Math.PI),xx=x+off,yy=y+Math.sin(t*11+phase+j)*width*.16;i?c.lineTo(xx,yy):c.moveTo(xx,yy);});c.strokeStyle=j%2?(red?'#e2aaa18a':'#b0b9c56b'):'#03070b88';c.lineWidth=j%2?.7:2.5;c.stroke();}
 c.globalAlpha=.19;c.strokeStyle=red?'#e0a7a0':'#a1afb9';c.lineWidth=.45;
 for(let i=-400;i<400;i+=3){c.beginPath();c.moveTo(i,-300);c.bezierCurveTo(i+28,0,i-35,70,i+40,300);c.stroke();}
 c.restore();c.save();c.beginPath();upper.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=red?'#d5a6a1':'#9ea8b1';c.globalAlpha=.6;c.lineWidth=.65;c.stroke();c.restore();
}
function curve(fn:(t:number)=>number[],n=32){return Array.from({length:n+1},(_,i)=>fn(i/n));}
function blade(c:C,x:number,y:number,length:number,angle:number,q:number){if(q<.001)return;c.save();c.translate(x,y);c.rotate(angle);c.scale(q,Math.sqrt(q));path(c,[[-length/2,0],[-length*.3,-4],[length/2,-1],[length*.28,2],[-length*.3,4]]);const g=c.createLinearGradient(0,-5,0,5);g.addColorStop(0,'#090e15');g.addColorStop(.43,'#84929c');g.addColorStop(.51,'#eef0ed');g.addColorStop(.64,'#56616f');g.addColorStop(1,'#131a22');c.fillStyle=g;c.fill();c.restore();}
function surfaceLight(c:C,face:HTMLCanvasElement,amount:number,ms:number){if(amount<.005)return;c.save();c.globalAlpha=amount*.22;c.globalCompositeOperation='screen';card(c,face);c.restore();c.save();c.beginPath();c.roundRect(-84,-129,168,258,10);c.clip();const y=-170+ease(150,1200,ms)*380;const g=c.createLinearGradient(-90,y-24,90,y+24);g.addColorStop(0,'#acbac600');g.addColorStop(.45,'#cad6dd00');g.addColorStop(.5,`rgba(226,236,240,${amount*.4})`);g.addColorStop(.58,'#b8c5d000');g.addColorStop(1,'#b8c5d000');c.fillStyle=g;c.fillRect(-90,-135,180,270);c.restore();}
export function draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,id:string,reduced=false,ground=true){
 sourceFace=face;c.save();c.translate(x,y);c.scale(w/180,w/180);
 if(reduced||ms<=0||ms>=DURATION){card(c,face);c.restore();return;}
 const r=rank(id),p=ease(240,840,ms),out=ease(1050,2250,ms),q=p*(1-out),hit=ease(1020,1220,ms),tail=1-ease(1320,2520,ms);
 if(ground){c.save();const lift=(1-hit)*26;const g=c.createRadialGradient(0,130,3,0,130,125);g.addColorStop(0,`rgba(9,13,22,${.28+hit*.12})`);g.addColorStop(1,'#080f1800');c.translate(0,lift);c.scale(1,.24);c.fillStyle=g;c.fillRect(-160,5,320,260);c.restore();}
 c.translate(0,-(1-hit)*12*Math.sin(ease(0,1200,ms)*Math.PI));
 // The source surface remains identifiable throughout all six transformations.
 if(v===1){
  const shift=q*16*r;
  clipped(c,face,[[-90,-135],[90,-135],[90,-72],[-90,68]],-shift*.55,-shift*.3,-q*.025);
  clipped(c,face,[[-90,68],[90,-72],[90,30],[-90,168]],shift*.55,shift*.3,q*.025);
  clipped(c,face,[[-90,168],[90,30],[90,135],[-90,135]],-shift*.25,shift*.65,-q*.015);
  for(let i=0;i<(id==='ASSASSIN4'?3:2);i++){const z=ease(400+i*75,800+i*75,ms)*(1-ease(1100+i*100,1620+i*100,ms));blade(c,(-30+i*20)*q,(i-1)*72,260*r,-.55,z);}

 }else if(v===2){
  const wet=ease(180,780,ms)*(1-ease(1150,2220,ms));
  // Contiguous image strips compress into the wet base; never substitute the card for a separate actor.
  const h=270*(1-wet*.26),top=135-h;
  for(let i=0;i<90;i++){const t=i/90,wiggle=Math.sin(t*11-ms*.002)*wet*Math.pow(t,3)*9,ww=180*(1-wet*.18*Math.pow(t,2));c.drawImage(face,0,face.height*t,face.width,face.height/90,-ww/2+wiggle,top+i*h/90,ww,h/90+.6);}
  c.save();c.translate(0,130);c.scale(1,.31);const g=c.createRadialGradient(0,0,8,0,0,140*r);g.addColorStop(0,'#070d17');g.addColorStop(.65,'#172230');g.addColorStop(.83,'#4a555f');g.addColorStop(1,'#0d182300');c.globalAlpha=wet*.85;c.fillStyle=g;c.beginPath();for(let i=0;i<=90;i++){const a=i/90*TAU,rr=(96+8*Math.sin(a*5+ms*.0008)+4*Math.sin(a*11))*r*(.5+wet*.5),xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fill();c.restore();
  for(const s of[-1,1])silk(c,curve(t=>[s*(73+Math.sin(t*3.3)*35*wet),132-t*160*wet]),9*wet,false,ms*.001);
  // The highlight is mapped with the compressed image, avoiding a second ghost surface.
  c.save();c.globalAlpha=wet*.2;c.globalCompositeOperation="screen";c.drawImage(face,-90,top,180,h);c.restore();
 }else if(v===5){
  const wings=id==='ASSASSIN4'?8:id==='ASSASSIN_SQUAD'?6:4;
  for(let i=0;i<wings;i++){const y0=-135+i*270/wings,y1=-135+(i+1)*270/wings,side=i%2?-1:1,z=ease(220+i*32,820+i*25,ms)*(1-ease(1100+i*45,2020+i*35,ms));const dx=side*z*(22+8*r),dy=(i-wings/2)*z*7,angle=side*z*.15;
   clipped(c,face,[[-90,y0],[90,y0],[90,y1],[-90,y1]],dx,dy,angle);
   c.save();c.translate(dx,dy);c.rotate(angle);blade(c,0,y0+1,177,0,z*.7);c.restore();
   if(z>.03){silk(c,curve(t=>[side*(80+30*z*Math.sin(t*Math.PI)),y0+(y1-y0)*t]),z*4,false,i);}
  }
 }else{
  if(v===4){const count=id==='ASSASSIN_SQUAD'?4:id==='ASSASSIN4'?3:2;for(let i=count;i>=1;i--){const side=i%2?1:-1,z=ease(180+i*65,720+i*50,ms)*(1-ease(900+i*100,1560+i*110,ms));c.save();c.translate(side*(25+i*8)*z,(i-1)*12*z);c.rotate(side*.055*z);c.globalAlpha=z*(.18+.07*(count-i));c.beginPath();c.roundRect(-73,-96,146,196,8);c.clip();card(c,face);c.restore();silk(c,curve(t=>[side*(80+(22+i*4)*z*Math.sin(t*Math.PI)),110-t*205]),z*5,false,i);}}
  card(c,face);surfaceLight(c,face,q*.7,ms);
  if(v===0){for(const s of[-1,1]){const open=ease(560+(s>0?90:0),1610,ms),grow=ease(100,670,ms),shrink=1-ease(1580,2300,ms);silk(c,curve(t=>{const bow=Math.sin(t*Math.PI);return[s*(82-bow*(1-open)*34+bow*open*48*r),-133+270*t+Math.sin(t*4+ms*.001)*open*18];}),grow*shrink*(24+7*r),false,ms*.001);silk(c,curve(t=>[s*(85+Math.sin(t*Math.PI)*open*40*r),-118+250*t+open*20]),grow*shrink*7,true,1);}}
  if(v===3){const n=id==='ASSASSIN1'?2:id==='ASSASSIN4'?4:3;for(let i=0;i<n;i++){const a=ease(180+i*70,680+i*60,ms),b=ease(940+i*80,1930+i*100,ms),amp=a*(1-ease(1700+i*70,2250+i*90,ms));silk(c,curve(t=>[-105+210*t+Math.sin(t*Math.PI)*b*40*(i%2?1:-1),-87+i*72+(t-.5)*85+Math.sin(t*TAU+b*4)*b*43]),(10+r*3)*amp,true,i+b*4);}}
 }
 // Contact is local, narrow and delayed until the card arrives; no summon rings or independent dust actors.
 if(hit>0&&tail>0){for(const s of[-1,1])silk(c,curve(t=>[s*(72+Math.sin(t*Math.PI)*34*r*hit),132+Math.sin(t*Math.PI)*9]),2.7*hit*tail,false,ms*.002);}
 c.restore();
}
