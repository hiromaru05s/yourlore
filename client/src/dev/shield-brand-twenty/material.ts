import type {Study} from './catalog';
import {Surface} from './surface';
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const ease=(x:number)=>1-Math.pow(1-clamp(x),3);
const TAU=Math.PI*2;
type C=CanvasRenderingContext2D;
type P=[number,number];
export class Material {
 original:HTMLImageElement;image:HTMLImageElement|HTMLCanvasElement;mask:HTMLCanvasElement;gold:HTMLCanvasElement;shade:HTMLCanvasElement;sheen=document.createElement('canvas');
 constructor(image:HTMLImageElement,public surface:Surface){this.original=image;this.sheen.width=this.sheen.height=256;this.image=image;this.mask=this.tint('#a5e6ff');this.gold=this.tint('#ffddb0');this.shade=this.tint('#061025');}
 tint(color:string){const a=document.createElement('canvas');a.width=a.height=512;const c=a.getContext('2d')!;c.drawImage(this.image,0,0,512,512);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,512,512);return a;}
 face(c:C,x=0,y=0,scale=1,alpha=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.globalAlpha*=clamp(alpha);c.drawImage(this.image,-100,-100,200,200);c.restore();}
 shadow(c:C,dx=0,dy=5,a=.3){c.save();c.globalAlpha*=a;c.drawImage(this.shade,-100+dx,-100+dy,200,200);c.restore();}
 clip(c:C,points:P[]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();}
 piece(c:C,points:P[],dx:number,dy:number,angle:number,sx=1,sy=1,shine=0){
  const center: P=[points.reduce((a,p)=>a+p[0],0)/points.length,points.reduce((a,p)=>a+p[1],0)/points.length];
  c.save();c.translate(center[0]+dx,center[1]+dy);c.rotate(angle);c.scale(sx,sy);c.translate(-center[0],-center[1]);
  for(let depth=Math.min(5,Math.ceil((Math.abs(dx)+Math.abs(dy))*.09+Math.abs(angle)*7));depth>=1;depth--){c.save();c.translate(depth*.55,depth*.9);this.clip(c,points);c.globalAlpha*=.9;c.drawImage(depth<2?this.gold:this.shade,-100,-100,200,200);c.restore();}
  this.clip(c,points);this.face(c);if(shine>0){c.globalCompositeOperation='screen';c.globalAlpha*=shine;c.drawImage(this.mask,-100,-100,200,200);}c.restore();
 }
 glint(c:C,t:number,hot=false,strength=1){
  if(t<=0||t>=1)return;const x=-160+t*320;c.save();c.globalCompositeOperation='screen';
  const g=c.createLinearGradient(x-28,0,x+28,0);g.addColorStop(0,'transparent');g.addColorStop(.4,hot?'#ff561755':'#8ddeff55');g.addColorStop(.5,hot?'#ffd1a0cc':'#f1ffffbb');g.addColorStop(.62,hot?'#c9200c55':'#648cee55');g.addColorStop(1,'transparent');
  const a=this.sheen;const q=a.getContext('2d')!;q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,256,256);q.translate(128,128);q.scale(1.28,1.28);q.drawImage(this.image,-100,-100,200,200);q.globalCompositeOperation='source-in';q.transform(1,0,-.35,1,0,0);q.fillStyle=g;q.fillRect(-250,-200,500,400);c.globalAlpha*=strength;c.drawImage(a,-100,-100,200,200);c.restore();
 }
 filament(c:C,path:P[],p:number,color:string,width=1){
  const total=(path.length-1)*clamp(p);if(total<=0)return;
  for(const [w,a]of [[width*4,.11],[width*1.8,.4],[width,.95]]){c.save();c.globalAlpha*=a;c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...path[0]);for(let j=1;j<=Math.floor(total);j++)c.lineTo(...path[j]);const j=Math.floor(total);if(j<path.length-1){const f=total-j;c.lineTo(path[j][0]+(path[j+1][0]-path[j][0])*f,path[j][1]+(path[j+1][1]-path[j][1])*f);}c.stroke();c.restore();}
 }
 draw(c:C,s:Study,ms:number){
  const t=ms/s.duration,add=s.mode==='add',b=s.family==='brand';
  const kinds=s.family==='shield'?(add?[0,0,1,0,0]:[0,1,2,0,3]):(add?[1,4,3,1,5]:[1,4,5,3,2]);
  this.image=this.surface.draw(this.original,kinds[s.index],t*3,Math.sin(Math.PI*clamp(t/.97))*.85,b);
  if(t<=0){if(add)this.face(c);return;}if(t>=1){this.face(c);return;}
  const q=smooth(.11,.71,t),settle=smooth(.74,.97,t),heat=Math.sin(Math.PI*clamp((t-.12)/.75));
  c.save();
  if(add){this.shadow(c,1,5,.28);this.face(c);}
  if(!add&&s.family==='shield')this.shieldFirst(c,s.index,t,q,settle);
  if(add&&s.family==='shield')this.shieldAdd(c,s.index,t,q,settle);
  if(!add&&b)this.brandFirst(c,s.index,t,q,settle);
  if(add&&b)this.brandAdd(c,s.index,t,q,settle);
  // Narrow late surface reflection follows the physical material, never a full-screen flash.
  this.glint(c,clamp((t-.64)/.31),b,.55*heat);
  c.restore();
 }
 shieldFirst(c:C,i:number,t:number,q:number,settle:number){
  switch(i){
   case 0:{ // Six thick irregular plates; rotation finishes before contact.
    const polys:P[][]=[[[0,-100],[-100,-100],[-100,-27],[0,-15]],[[0,-100],[100,-100],[100,-27],[0,-15]],[[-100,-27],[0,-15],[0,42],[-86,56]],[[100,-27],[0,-15],[0,42],[86,56]],[[-86,56],[0,42],[0,105],[-60,105]],[[86,56],[0,42],[0,105],[60,105]]];
    polys.forEach((poly,j)=>{const a=ease((t-.14-j*.032)/.43),side=j%2?1:-1;if(a<=0)return;this.piece(c,poly,side*90*(1-a),-24*(1-a),side*.5*(1-a),.48+.52*a,1,Math.sin(a*Math.PI)*.23);});
    const k=smooth(.59,.70,t);if(k>0){c.save();c.globalAlpha=1-settle;this.filament(c,[[0,-80],[0,-14],[-2,42],[0,86]],k,'#f2e2bd',1.1);c.restore();}break;
   }
   case 1:{ // Meniscus, refraction bands, cooling front.
    const level=106-220*q;c.save();c.beginPath();c.moveTo(-110,110);c.lineTo(-110,level);for(let x=-110;x<=110;x+=3)c.lineTo(x,level+Math.sin(x*.038+t*21)*7*(1-q));c.lineTo(110,110);c.closePath();c.clip();
    for(let y=-100;y<100;y+=3){const d=Math.sin(y*.052+t*17)*9*(1-settle)*(1-q*.7);c.drawImage(this.image,0,(y+100)/200*this.image.height,this.image.width,this.image.height*3/200,-100+d,y,200,3.2);}
    c.globalCompositeOperation='screen';c.globalAlpha=.34*(1-settle);c.drawImage(this.mask,-100,-100,200,200);c.restore();
    if(q>.025&&q<.98){c.save();c.globalAlpha=Math.sin(Math.PI*q)*.85;c.beginPath();c.moveTo(-97,-109);c.bezierCurveTo(-56,-104,-18,level-45,0,level);c.strokeStyle='#386887';c.lineWidth=5+Math.sin(t*23)*.7;c.lineCap='round';c.stroke();c.strokeStyle='#c7f2ff';c.lineWidth=1.1;c.stroke();c.restore();}
    if(q>0&&q<1){c.save();c.beginPath();c.moveTo(-72,level);c.bezierCurveTo(-28,level-9,30,level+9,72,level);c.strokeStyle='#d1f7ff';c.lineWidth=1.8;c.stroke();c.restore();}if(settle)this.face(c,0,0,1,settle);break;
   }
   case 2:{ // Radial crystal fronts; each facet has its own seed and normal.
    const n=11;for(let j=0;j<n;j++){const a=j/n*TAU-Math.PI/2,z=(j+1)/n*TAU-Math.PI/2,k=smooth(.1+(j%3)*.07,.61+(j%4)*.025,t);if(!k)continue;
     const poly:P[]=[[0,5],[Math.cos(a)*150,Math.sin(a)*150],[Math.cos(z)*150,Math.sin(z)*150]];c.save();this.clip(c,poly);c.beginPath();c.arc(0,5,170*k,0,TAU);c.clip();this.face(c);c.globalCompositeOperation='screen';c.globalAlpha=(1-settle)*(.06+(j%4)*.07);c.drawImage(this.mask,-100,-100,200,200);c.restore();
     if(k<1)this.filament(c,[[0,5],[Math.cos(a)*85*k,Math.sin(a)*85*k]],1,'#b4f1ff',.65*(1-settle));}break;
   }
   case 3:{ // Broad folded leaves with visible hinge perspective.
    this.piece(c,[[-18,-100],[18,-100],[18,104],[-18,104]],0,-32*(1-q),0,1,q,.1*(1-q));
    for(let j=0;j<4;j++){const sign=j%2?1:-1,row=Math.floor(j/2),a=ease((t-.16-row*.12)/.45),y0=row?-6:-100,y1=row?104:-6;
     this.piece(c,[[sign*18,y0],[sign*105,y0],[sign*105,y1],[sign*18,y1]],sign*22*(1-a),-12*(1-a),sign*(1-a)*.24,.06+.94*a,1,Math.sin(a*Math.PI)*.3);
    }break;
   }
   case 4:{ // Interlaced strips; over/under offsets converge to zero.
    const N=12;for(let pass=0;pass<2;pass++)for(let j=0;j<N;j++){const a=smooth(.10+j*.022+pass*.07,.52+j*.019+pass*.06,t);if(a<=0)continue;const pos=-100+j*200/N;c.save();
     if(pass===0)c.beginPath(),c.rect(pos,-100,200/N-.5,200*a);else c.beginPath(),c.rect(-100,pos,200*a,200/N-.5);c.clip();
     this.face(c,pass?0:Math.sin(j*2+t*13)*5*(1-q),pass?Math.cos(j+t*10)*5*(1-q):0);
     c.globalCompositeOperation='screen';c.globalAlpha=.18*(1-settle);c.drawImage(this.gold,-100,-100,200,200);c.restore();}
    if(settle)this.face(c,0,0,1,settle);break;
   }
  }
 }
 shieldAdd(c:C,i:number,t:number,q:number,settle:number){
  const h=Math.sin(Math.PI*q)*(1-settle);
  switch(i){
   case 0:{const edge:P[]=[[0,-93],[-29,-75],[-77,-70],[-75,-9],[-54,50],[0,91],[54,50],[75,-9],[77,-70],[29,-75],[0,-93]];
    c.save();c.globalAlpha=1-settle;this.filament(c,edge,q,'#ffce84',2.6);c.restore();
    const k=q*(edge.length-1),j=Math.min(edge.length-2,Math.floor(k)),f=k-j,x=edge[j][0]*(1-f)+edge[j+1][0]*f,y=edge[j][1]*(1-f)+edge[j+1][1]*f;
    if(q<1){this.spark(c,x,y,t,13,'#ffe7ba',.7);this.glint(c,q,true,.5);}break;
   }
   case 1:{const a=ease((t-.14)/.49);c.save();c.globalAlpha=.9*(1-settle);this.piece(c,[[-96,-94],[96,-94],[95,90],[-96,100]],-35*(1-a),-60*(1-a),-.29*(1-a),.95+.05*a,1,.15);c.restore();
    for(let j=0;j<3;j++){const k=smooth(.53+j*.055,.65+j*.055,t),a=[-.7,1.6,3.9][j],x=Math.cos(a)*64,y=Math.sin(a)*62;if(k>0){c.save();c.globalAlpha=(1-settle)*k;this.diamond(c,x,y,4+5*Math.sin(k*Math.PI),'#f6dfab');c.restore();}}break;
   }
   case 2:{ // Expanding lens distortion remains inside original silhouette.
    c.save();c.globalAlpha=.95*(1-settle);for(let y=-100;y<100;y+=2){const wave=Math.exp(-Math.pow((y+100-240*q)/28,2))*h;const dx=wave*7;const sx=1+wave*.08;c.drawImage(this.image,0,(y+100)/200*this.image.height,this.image.width,this.image.height*.01,-100*sx+dx,y,200*sx,2.2);}c.restore();this.glint(c,q,false,.95);break;
   }
   case 3:{ // Raised central boss, short punch then elastic settling.
    const punch=Math.sin(clamp((t-.34)/.22)*Math.PI)*7+Math.sin(clamp((t-.60)/.17)*Math.PI)*3;
    this.piece(c,[[0,-72],[42,-12],[0,66],[-42,-12]],0,-punch,0,1+.08*h,1+.035*h,.24*h);
    c.save();c.globalAlpha=h;this.filament(c,[[0,-72],[0,66]],1,'#dcf5ff',1.4);this.filament(c,[[-42,-12],[0,2],[42,-12]],1,'#c2ecff',1);c.restore();break;
   }
   case 4:{for(let j=0;j<5;j++){const a=ease((t-.12-j*.075)/.33);if(a<=0)continue;const y=62-j*32;c.save();c.globalAlpha=(1-settle)*.95;this.piece(c,[[-64,y-18],[64,y-18],[54,y+10],[0,y+32],[-54,y+10]],(j%2?1:-1)*22*(1-a),46*(1-a),.15*(j%2?1:-1)*(1-a),1,1,.26*Math.sin(a*Math.PI));c.restore();}break;}
  }
 }
 brandFirst(c:C,i:number,t:number,q:number,settle:number){
  switch(i){
   case 0:{ // Viscous deposited seal and descending embossing die.
    const spread=smooth(.15,.48,t),press=smooth(.42,.60,t),release=smooth(.64,.84,t);c.save();c.scale(.30+.70*spread, .2+.8*spread-.10*Math.sin(press*Math.PI));this.face(c,0,0,1,spread);c.restore();
    if(t>.32&&release<1){const y=-65*(1-press)-36*release,scale=.91+.10*(1-press);c.save();c.globalAlpha=(1-release)*.9;c.translate(0,y);c.scale(scale,scale);this.shadow(c,4,10,.65);this.face(c);c.globalCompositeOperation='multiply';c.fillStyle='#3d202866';c.beginPath();c.ellipse(0,0,69,78,0,0,TAU);c.fill();c.restore();}
    if(press>0)this.glint(c,press,true,.45);break;
   }
   case 1:{ // Carved hot lines reveal contiguous sectors.
    c.save();c.beginPath();for(let j=0;j<7;j++){const a=-Math.PI/2+j*TAU/7,k=smooth(.1+j*.035,.55+j*.025,t);c.moveTo(0,0);c.arc(0,0,150*k,a,a+TAU/7);c.lineTo(0,0);}c.clip();this.face(c);c.restore();
    for(let j=0;j<7;j++){const a=-Math.PI/2+j*TAU/7; c.save();c.globalAlpha=(1-settle)*.8;this.filament(c,[[Math.cos(a)*88,Math.sin(a)*88],[Math.cos(a+.15)*48,Math.sin(a+.15)*48],[Math.cos(a-.15)*21,Math.sin(a-.15)*21],[0,0]],smooth(.12+j*.034,.57+j*.035,t),'#ffbd77',1.4);c.restore();}break;
   }
   case 2:{ // Capillary lacquer, asymmetric growth from three wet roots.
    c.save();c.beginPath();for(let j=0;j<23;j++){const a=j*2.39996,rr=20+Math.sqrt(j/23)*65,k=smooth(.09+(j%7)*.025,.58+(j%4)*.043,t);c.moveTo(Math.cos(a)*rr+65*k,Math.sin(a)*rr);c.ellipse(Math.cos(a)*rr,Math.sin(a)*rr,65*k,44*k,a,0,TAU);}c.clip();
    for(let y=-100;y<100;y+=3){const dx=Math.sin(y*.046+t*18)*8*(1-q);c.drawImage(this.image,0,(y+100)/200*this.image.height,this.image.width,this.image.height*.015,-100+dx,y,200,3.2);}c.restore();
    for(let j=0;j<5;j++){const a=j*1.256;c.save();c.globalAlpha=.5*(1-settle);this.filament(c,[[0,0],[Math.cos(a+.2)*40,Math.sin(a+.2)*40],[Math.cos(a)*75,Math.sin(a)*75]],q,'#b22c48',1.5);c.restore();}if(settle)this.face(c,0,0,1,settle);break;
   }
   case 3:{ // Broad lacquer ribbons bend around the forming seal and sink into it.
    this.face(c,0,0,.82+.18*q,smooth(.23,.63,t));
    for(let j=0;j<3;j++){const a=j*TAU/3,k=smooth(.1+j*.065,.68+j*.015,t);if(!k)continue;c.save();c.rotate(a);c.translate(0,-20*(1-k));c.globalAlpha=1-settle;
     this.ribbon(c,k,t,j);c.restore();}
    if(settle)this.face(c,0,0,1,settle);break;
   }
   case 4:{const a=ease((t-.08)/.38);this.face(c,0,-36*(1-a),.86+.14*a,a,.22*(1-a));
    const open=smooth(.42,.84,t);for(let j=0;j<8;j++){const ang=j*TAU/8,next=(j+1)*TAU/8;c.save();c.globalAlpha=(1-open)*.96;c.translate(Math.cos(ang)*open*43,Math.sin(ang)*open*43);c.rotate(open*(j%2?.25:-.25));this.clip(c,[[0,0],[Math.cos(ang)*120,Math.sin(ang)*120],[Math.cos(next)*120,Math.sin(next)*120]]);c.drawImage(this.shade,-100,-100,200,200);c.strokeStyle='#a7526066';c.lineWidth=1;c.stroke();c.restore();}
    if(open>0&&open<1)this.spark(c,0,0,t,8,'#ffb281',.9*Math.sin(open*Math.PI));break;}
  }
 }
 brandAdd(c:C,i:number,t:number,q:number,settle:number){
  const h=Math.sin(q*Math.PI)*(1-settle);
  switch(i){
   case 0:{const one=smooth(.13,.42,t),two=smooth(.45,.66,t),recoil=Math.sin(one*Math.PI)*5+Math.sin(two*Math.PI)*3;
    c.save();c.globalAlpha=.83*(1-settle);this.shadow(c,2,-recoil+6,.4);this.face(c,0,-recoil,1+.04*h,1);c.restore();
    for(const [x,y,a]of [[-19,-10,one],[25,22,two]])if(a>0&&a<1){c.save();c.globalAlpha=Math.sin(a*Math.PI)*.65;this.face(c,x,y-52*(1-a),.36+.12*(1-a),1,.2*(1-a));c.restore();}this.glint(c,t<.45?one:two,true,.4);break;}
   case 1:{for(let j=0;j<6;j++){const a=j*TAU/6+.23,k=smooth(.12+j*.028,.66+j*.018,t);const path:P[]=[[0,-84],[Math.sin(a)*27,-32],[Math.cos(a)*51,Math.sin(a)*53],[Math.cos(a+.24)*72,Math.sin(a+.24)*73]];c.save();c.globalAlpha=1-settle;this.filament(c,path,k,'#ed7749',2.4);this.filament(c,path,k,'#ffd5a3',.55);c.restore();}break;}
   case 2:{for(let j=0;j<7;j++){const y=-58+j*18,k=smooth(.12+j*.042,.35+j*.04,t);if(!k)continue;const bow=12*(1-k),path:P[]=[[-35,y],[0,y+bow+9],[35,y+10]];c.save();c.globalAlpha=(1-settle)*.95;this.filament(c,path,k,'#8b142b',4);this.filament(c,path,k,'#ffc39b',.65);this.diamond(c,-35,y,2,'#dd8f70');this.diamond(c,35,y+10,2,'#dd8f70');c.restore();}break;}
   case 3:{for(let j=2;j>=0;j--){const k=ease((t-.12-j*.1)/.42);if(k<=0)continue;c.save();c.globalAlpha=(1-settle)*(.48+j*.1);this.shadow(c,(j-1)*23*(1-k),-35*(1-k),.24);this.face(c,(j-1)*23*(1-k),-40*(j+1)/3*(1-k),1-.045*j*(1-k),1,(j-1)*.24*(1-k));c.restore();}break;}
   case 4:{for(let j=0;j<5;j++){const a=j*TAU/5+.35,k=smooth(.12+j*.035,.71+j*.02,t),r=36*(1-k),w=Math.sin(k*Math.PI);c.save();c.globalAlpha=(1-settle)*.9;c.rotate(a+(1-k)*.34);c.translate(r,0);c.beginPath();c.moveTo(-7,-92);c.bezierCurveTo(45,-70,60,-20,10,40);c.lineTo(-4,55);c.bezierCurveTo(29,-20,9,-63,-7,-92);c.closePath();c.clip();this.face(c,0,0,1+.18*w);c.globalCompositeOperation='multiply';c.fillStyle='#28062066';c.fillRect(-100,-100,200,200);c.restore();}this.glint(c,q,true,.7);break;}
  }
 }
 ribbon(c:C,k:number,t:number,seed:number){
  // Project a twisting, tapered strip. Each small quad has its own surface normal.
  const sample=(u:number)=>{const v=1-u;return[-87*v*v*v-249*v*v*u+258*v*u*u+73*u*u*u,-39*v*v*v-351*v*v*u-300*v*u*u+38*k*u*u*u] as P;};
  const nodes=Array.from({length:45},(_,i)=>{const u=i/44,p=sample(u),prev=sample(Math.max(0,u-.005)),next=sample(Math.min(1,u+.005)),dx=next[0]-prev[0],dy=next[1]-prev[1],length=Math.hypot(dx,dy)||1,twist=Math.sin(u*7.4+t*4+seed*.6),w=14*Math.pow(Math.sin(Math.PI*u),.45)*(.2+.8*Math.abs(Math.cos(u*5+t+seed)));return{u,x:p[0],y:p[1]+twist*7,nx:-dy/length,ny:dx/length,w,twist};});
  for(let i=0;i<nodes.length-1;i++){const a=nodes[i],b=nodes[i+1],light=.5+.5*Math.cos(a.u*7.4+t*4+seed*.6);c.beginPath();c.moveTo(a.x-a.nx*a.w,a.y-a.ny*a.w);c.lineTo(b.x-b.nx*b.w,b.y-b.ny*b.w);c.lineTo(b.x+b.nx*b.w,b.y+b.ny*b.w);c.lineTo(a.x+a.nx*a.w,a.y+a.ny*a.w);c.closePath();
   const g=c.createLinearGradient(a.x-a.nx*a.w,a.y-a.ny*a.w,a.x+a.nx*a.w,a.y+a.ny*a.w);g.addColorStop(0,'#300d28');g.addColorStop(.30,`rgb(${95+light*65},${13+light*14},${32+light*20})`);g.addColorStop(.57,`rgb(${131+light*94},${28+light*95},${40+light*60})`);g.addColorStop(.69,'#8f203a');g.addColorStop(1,'#310e24');c.fillStyle=g;c.fill();
   c.beginPath();c.moveTo(a.x+a.nx*a.w*.78,a.y+a.ny*a.w*.78);c.lineTo(b.x+b.nx*b.w*.78,b.y+b.ny*b.w*.78);c.strokeStyle=`rgba(246,179,118,${light*.64})`;c.lineWidth=.8;c.stroke();
  }
 }
 diamond(c:C,x:number,y:number,r:number,color:string){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.6,y);c.lineTo(x,y+r);c.lineTo(x-r*.6,y);c.closePath();c.fill();}
 spark(c:C,x:number,y:number,t:number,n:number,color:string,strength:number){for(let j=0;j<n;j++){const a=j*2.3999,u=(t*1.4+j*.123)%1,r=8+u*31;c.save();c.globalAlpha*=strength*(1-u);this.diamond(c,x+Math.cos(a)*r,y+Math.sin(a)*r+u*u*11,1.4*(1-u),color);c.restore();}}
}
