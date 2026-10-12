import {ease,envelope,COUNTER_PREP_MS} from './model';
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

/** Approved 02: the right frame becomes an edge as the same face pivots. */
export function point(t:number,x:number,y:number,reduced=false):P{
 const a=reduced?0:envelope(t),r=-.16*a,px=x+W*.44,py=y-H*.35;
 x=Math.cos(r)*px-Math.sin(r)*py-W*.44;y=Math.sin(r)*px+Math.cos(r)*py+H*.35;
 const z=(x+W/2)*.12*a,f=900/(900-z);return{x:x*f,y:(y-z*.44)*f,z};
}
export class CounterRenderer{
 private mat=document.createElement('canvas');
 private m:C;
 private shadow?:HTMLCanvasElement;
 constructor(){this.mat.width=540;this.mat.height=844;this.m=this.mat.getContext('2d')!;}
 private material(face:HTMLCanvasElement,t:number){
  const c=this.m;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,540,844);c.drawImage(face,0,0,540,844);c.scale(3,844/H);
  const a=envelope(t),pulse=ease(15,100,t)*(1-ease(580,700,t));if(!pulse)return;
  c.globalCompositeOperation='source-atop';
  c.fillStyle=`rgba(18,29,40,${a*.15})`;c.fillRect(0,0,W,H);
   const x=W*(1-ease(30,620,t));const g=c.createLinearGradient(x-22,0,x+18,0);g.addColorStop(0,'#e5eee900');g.addColorStop(.47,`rgba(222,239,225,${pulse*.1})`);g.addColorStop(.50,`rgba(255,247,216,${pulse*.85})`);g.addColorStop(.56,`rgba(190,206,209,${pulse*.2})`);g.addColorStop(1,'#e5eee900');c.save();c.translate(0,-18);c.transform(1,.32,0,1,0,0);c.fillStyle=g;c.fillRect(-30,-40,W+60,H+80);c.restore();
   c.strokeStyle=`rgba(247,238,210,${pulse*.75})`;c.lineWidth=2;c.beginPath();c.moveTo(W-10,H-24);c.lineTo(W-6,30);c.lineTo(W-24,17);c.stroke();

  c.globalCompositeOperation='source-over';
 }
 draw(c:C,face:HTMLCanvasElement,t:number,reduced=false){
  c.save();c.translate(135,202.5);
  const active=t>0&&t<COUNTER_PREP_MS;
  if(active)this.material(face,t);
  const a=envelope(t),map=(x:number,y:number)=>point(t,x,y,reduced);
  if(!this.shadow){this.shadow=document.createElement('canvas');this.shadow.width=face.width;this.shadow.height=face.height;const sc=this.shadow.getContext('2d')!;sc.drawImage(face,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle='#182027';sc.fillRect(0,0,face.width,face.height);}
  c.save();c.globalAlpha=.14;c.filter='blur(2px)';c.drawImage(this.shadow,-W/2+1,-H/2+3+a*3,W,H);c.restore();
  if(!active||reduced){c.drawImage(active?this.mat:face,-W/2,-H/2,W,H);c.restore();return;}
  const nx=2,ny=4,grid:P[][]=[];
  for(let j=0;j<=ny;j++){grid[j]=[];for(let i=0;i<=nx;i++)grid[j][i]=map(-W/2+i*W/nx,-H/2+j*H/ny);}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const p=grid[j][i],b=grid[j][i+1],d=grid[j+1][i],e=grid[j+1][i+1],u=i*540/nx,v=j*844/ny;
   triangle(c,this.mat,p,b,d,u,v,540/nx,844/ny);triangle(c,this.mat,b,e,d,u,v,540/nx,844/ny,true);
  }
  for(let layer=2;layer>=0;layer--){
   c.beginPath();for(let j=0;j<=28;j++){const p=map(W*.455+layer*a*2.8,-H*.42+j*H*.84/28);j?c.lineTo(p.x,p.y+layer*1.1):c.moveTo(p.x,p.y+layer*1.1);}
   c.strokeStyle=layer===0?`rgba(252,237,195,${a*.9})`:layer===1?`rgba(150,132,96,${a*.9})`:`rgba(32,41,50,${a*.9})`;c.lineWidth=layer===0?1:2;c.stroke();
  }
  c.restore();
 }
 dispose(){this.mat.width=this.mat.height=1;if(this.shadow)this.shadow.width=this.shadow.height=1;this.shadow=undefined;}
}
