import {ease,envelope,PREP} from './catalog';
type C=CanvasRenderingContext2D;
type P={x:number;y:number;z:number};
const W=180,H=281.25;
function triangle(c:C,img:HTMLCanvasElement,a:P,b:P,d:P,u:number,v:number,uw:number,vh:number,second=false){
 const src=second?[[u+uw,v],[u+uw,v+vh],[u,v+vh]]:[[u,v],[u+uw,v],[u,v+vh]];
 const [s0,s1,s2]=src,den=(s1[0]-s0[0])*(s2[1]-s0[1])-(s2[0]-s0[0])*(s1[1]-s0[1]);
 const ax=((b.x-a.x)*(s2[1]-s0[1])-(d.x-a.x)*(s1[1]-s0[1]))/den;
 const ay=((b.y-a.y)*(s2[1]-s0[1])-(d.y-a.y)*(s1[1]-s0[1]))/den;
 const bx=((d.x-a.x)*(s1[0]-s0[0])-(b.x-a.x)*(s2[0]-s0[0]))/den;
 const by=((d.y-a.y)*(s1[0]-s0[0])-(b.y-a.y)*(s2[0]-s0[0]))/den;
 c.save();c.beginPath();const cx=(a.x+b.x+d.x)/3,cy=(a.y+b.y+d.y)/3;
 for(const [i,p]of [a,b,d].entries()){const x=cx+(p.x-cx)*1.008,y=cy+(p.y-cy)*1.008;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.clip();c.transform(ax,ay,bx,by,a.x-ax*s0[0]-bx*s0[1],a.y-ay*s0[0]-by*s0[1]);c.drawImage(img,0,0);c.restore();
}
/** Four separate deformation fields. All use the same public card surface. */
export function point(v:number,t:number,x:number,y:number,reduced=false):P{
 const a=reduced?0:envelope(v,t),q=(y+H/2)/H;let z=0;
 if(v===0){z=35*a*Math.sin(q*Math.PI);y=y*(1-.12*a)+10*a*Math.sin(q*Math.PI);x*=1-.09*a*Math.sin(q*Math.PI);}
 if(v===1){const r=-.16*a,px=x+W*.44,py=y-H*.35;x=Math.cos(r)*px-Math.sin(r)*py-W*.44;y=Math.sin(r)*px+Math.cos(r)*py+H*.35;z=(x+W/2)*.12*a;}
 if(v===2){const wave=Math.sin(q*7-t*.015)*Math.sin(q*Math.PI);z=5*a*wave;y+=8*a*Math.sin(q*Math.PI);}
 if(v===3){const d=Math.max(0,Math.abs(x)-W*.17),r=a*.83;x=Math.sign(x)*(Math.min(Math.abs(x),W*.17)+d*Math.cos(r));z=d*Math.sin(r);y+=4*a*Math.sin(q*Math.PI);}
 const f=900/(900-z);return{x:x*f,y:(y-z*.44)*f,z};
}
export class Renderer{
 private mat=document.createElement('canvas');
 private m:C;
 private shadows=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
 constructor(){this.mat.width=540;this.mat.height=844;this.m=this.mat.getContext('2d')!;}
 private material(face:HTMLCanvasElement,v:number,t:number,reduced:boolean){
  const c=this.m;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,540,844);c.drawImage(face,0,0,540,844);c.scale(3,844/H);
  const a=envelope(v,t),pulse=ease(15,100,t)*(1-ease(580,700,t));if(!pulse)return;
  c.globalCompositeOperation='source-atop';
  // Readable portrait at every point; the dark material provides headroom for a narrow highlight.
  c.fillStyle=`rgba(18,29,40,${a*.15})`;c.fillRect(0,0,W,H);
  if(v===0){
   const y=H*(.10+.8*ease(0,520,t));const g=c.createLinearGradient(0,y-28,0,y+24);g.addColorStop(0,'#fff4d000');g.addColorStop(.47,`rgba(228,207,146,${pulse*.23})`);g.addColorStop(.51,`rgba(255,248,215,${pulse*.72})`);g.addColorStop(.57,`rgba(131,108,62,${pulse*.3})`);g.addColorStop(1,'#fff4d000');c.fillStyle=g;c.fillRect(0,0,W,H);
   for(const s of [1,-1])for(let i=0;i<3;i++){const x=s>0?8+i*3:W-8-i*3;c.strokeStyle=`rgba(255,232,172,${pulse*(.75-i*.17)})`;c.lineWidth=i? .6:1.5;c.beginPath();c.moveTo(x,H*.10);c.bezierCurveTo(x+s*8,H*.30,x+s*7,H*.60,x,H*.88);c.stroke();}
  }else if(v===1){
   const x=W*(1-ease(30,620,t));const g=c.createLinearGradient(x-22,0,x+18,0);g.addColorStop(0,'#e5eee900');g.addColorStop(.47,`rgba(222,239,225,${pulse*.1})`);g.addColorStop(.50,`rgba(255,247,216,${pulse*.85})`);g.addColorStop(.56,`rgba(190,206,209,${pulse*.2})`);g.addColorStop(1,'#e5eee900');c.save();c.translate(0,-18);c.transform(1,.32,0,1,0,0);c.fillStyle=g;c.fillRect(-30,-40,W+60,H+80);c.restore();
   c.strokeStyle=`rgba(247,238,210,${pulse*.75})`;c.lineWidth=2;c.beginPath();c.moveTo(W-10,H-24);c.lineTo(W-6,30);c.lineTo(W-24,17);c.stroke();
  }else if(v===2){
   // Two tapered viscous fronts travel down, reverse, and join the leading frame.
   const flow=t<300?ease(0,300,t):1-ease(330,650,t);const y=22+flow*(H-56);
   for(const s of [-1,1]){const x=W/2+s*W*.29;c.beginPath();c.moveTo(x,18);c.bezierCurveTo(x-s*20,y*.6,x+s*15,y-20,x-s*14,y+32);c.bezierCurveTo(x+s*16,y+7,x+s*27,y-25,x+s*7,18);c.closePath();
    const g=c.createLinearGradient(x-22,0,x+22,0);g.addColorStop(0,`rgba(18,31,45,${pulse*.82})`);g.addColorStop(.52,`rgba(80,104,105,${pulse*.75})`);g.addColorStop(.72,`rgba(232,227,185,${pulse*.85})`);g.addColorStop(.85,`rgba(68,92,97,${pulse*.68})`);g.addColorStop(1,`rgba(21,34,45,${pulse*.8})`);c.fillStyle=g;c.fill();
    c.strokeStyle=`rgba(255,242,195,${pulse*.7})`;c.lineWidth=.9;c.beginPath();c.moveTo(x+s*6,20);c.bezierCurveTo(x+s*23,y-22,x+s*15,y+9,x-s*14,y+32);c.stroke();
   }
   // A moving surface wave is short, bounded and never a full-card blur.
   c.fillStyle=`rgba(252,229,162,${pulse*.32})`;c.fillRect(12,y,156,1.4);
  }else{
   for(const s of [-1,1]){const x=W/2+s*W*.17;const g=c.createLinearGradient(x-10,0,x+10,0);g.addColorStop(0,'#ffe9b200');g.addColorStop(.45,`rgba(18,26,35,${a*.5})`);g.addColorStop(.51,`rgba(255,237,185,${pulse*.95})`);g.addColorStop(.66,`rgba(198,167,103,${pulse*.3})`);g.addColorStop(1,'#ffe9b200');c.fillStyle=g;c.fillRect(x-10,14,20,H-28);
    for(let j=0;j<9;j++){const yy=35+j*24;c.strokeStyle=`rgba(225,210,159,${pulse*.42})`;c.lineWidth=.6;c.beginPath();c.moveTo(x+s*4,yy);c.lineTo(x+s*20,yy-7);c.lineTo(x+s*25,yy-4);c.stroke();}
   }
  }
  if(reduced){c.fillStyle=`rgba(240,216,146,${pulse*.08})`;c.fillRect(0,0,W,H);}
  c.globalCompositeOperation='source-over';
 }
 draw(c:C,face:HTMLCanvasElement,v:number,t:number,x:number,y:number,width:number,reduced=false,dir=1){
  c.save();c.translate(x,y);c.scale(width/W,width/W);this.material(face,v,t,reduced);
  const a=envelope(v,t),map=(xx:number,yy:number)=>point(v,t,xx,yy,reduced);
  // Quiet, attached contact shadow; no floating circular stamp beneath the card.
  let shadow=this.shadows.get(face);if(!shadow){shadow=document.createElement('canvas');shadow.width=face.width;shadow.height=face.height;const sc=shadow.getContext('2d')!;sc.drawImage(face,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle='#182027';sc.fillRect(0,0,shadow.width,shadow.height);this.shadows.set(face,shadow);}
  c.save();c.globalAlpha=.14;c.filter='blur(2px)';c.drawImage(shadow,-W/2+1,-H/2+3+a*3,W,H);c.restore();
  if(t<=0||t>=PREP||reduced){c.drawImage(t>0&&t<PREP?this.mat:face,-W/2,-H/2,W,H);c.restore();return;}
  // Curvature is one-dimensional in 01/03; a dense 2D mesh buys no detail there.
  const nx=[1,2,1,6][v],ny=[24,4,28,12][v],grid:P[][]=[];
  for(let j=0;j<=ny;j++){grid[j]=[];for(let i=0;i<=nx;i++)grid[j][i]=map(-W/2+i*W/nx,-H/2+j*H/ny);}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const p=grid[j][i],b=grid[j][i+1],d=grid[j+1][i],e=grid[j+1][i+1],u=i*540/nx,sv=j*844/ny;
   triangle(c,this.mat,p,b,d,u,sv,540/nx,844/ny);triangle(c,this.mat,b,e,d,u,sv,540/nx,844/ny,true);

  }
  if(!reduced&&t>0&&t<PREP){
   // Material thickness is drawn along the deformed frame rather than at a fixed screen position.
   const sides=v===1?[1]:[-1,1];
   for(const s of sides){
    for(let layer=2;layer>=0;layer--){c.beginPath();for(let j=0;j<=28;j++){const yy=-H*.42+j*H*.84/28,xx=s*(W*.455+layer*a*2.8),p=map(xx,yy);j?c.lineTo(p.x,p.y+layer*1.1):c.moveTo(p.x,p.y+layer*1.1);}c.strokeStyle=layer===0?`rgba(252,237,195,${a*.9})`:layer===1?`rgba(150,132,96,${a*.9})`:`rgba(32,41,50,${a*.9})`;c.lineWidth=layer===0?1:2;c.stroke();}
   }
   if(v===0||v===3){
    const end=ease(490,610,t)*(1-ease(630,700,t));
    if(end){const p=map(0,-dir*H*.43);c.strokeStyle=`rgba(255,239,189,${end*.85})`;c.lineWidth=1.2;c.beginPath();c.moveTo(p.x-30*end,p.y);c.lineTo(p.x+30*end,p.y);c.stroke();}
   }
  }
  c.restore();
 }
 dispose(){this.mat.width=this.mat.height=1;}
}
