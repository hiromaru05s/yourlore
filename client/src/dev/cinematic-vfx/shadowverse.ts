import {bezier,clamp,ease,lerp,rnd,type Rect,type Point} from './direction';
import {glow} from './paint';
export const SV={vanish:.94,light:1.00,scatter:1.14,orb:1.22,flight:1.57,impact:1.94,contact:1.99,rebound:2.04,settled:2.43};
export function summonHero(w:number,h:number,nativeWidth:number,nativeHeight:number):Rect{
 const scale=Math.min(h*.62/nativeHeight,w*.58/nativeWidth,3.4);
 return{x:w/2,y:h/2,w:nativeWidth*scale,h:nativeHeight*scale};
}
export function orbPath(hero:Point,dest:Rect,q:number):Point{
 const u=dest.w;return bezier(hero,{x:hero.x+u*1.65,y:Math.min(hero.y,dest.y)-u*1.95},{x:dest.x+u*1.45,y:dest.y-u*2.20},dest,clamp(q));
}
export function summonOrb(hero:Rect,dest:Rect,t:number){
 const q=clamp((t-SV.flight)/(SV.impact-SV.flight));
 const center=t<SV.flight?hero:orbPath(hero,dest,q*q);
 const radius=lerp(.12,.92,ease(SV.orb,1.40,t))*(1-.52*ease(1.41,SV.flight,t));
 // Increasing camera distance: the impact core is 24% of its launch radius.
 const depth=1/(1+3.2*q*q);
 const before=orbPath(hero,dest,Math.max(0,q*q-.001)),after=orbPath(hero,dest,Math.min(1,q*q+.001));
 const length=Math.hypot(after.x-before.x,after.y-before.y)||1;
 return{x:center.x,y:center.y,radius:radius*dest.w*depth,travel:q,dx:(after.x-before.x)/length,dy:(after.y-before.y)/length};
}
export function reboundAngle(t:number){return t<2.17?13*ease(SV.rebound,2.17,t):13*(1-ease(2.17,SV.settled,t));}
export function summonPhase(t:number){return t<.38?'中央へ拡大':t<SV.vanish?'中央で開示':t<SV.light?'一瞬の消失':t<SV.scatter?'光のカード・枠の拡大':t<SV.orb?'光の粒へ':t<SV.flight?'中央で光球を形成':t<SV.impact?'円弧で着弾へ':t<2.00?'衝突・ヒビ':t<2.23?'光円の収束・出現':t<SV.settled?'右下の反動・再着地':'定着';}
export function impactShake(t:number){const a=t-SV.impact;if(a<0||a>.24)return{x:0,y:0};const amp=2.4*Math.pow(1-a/.24,2);return{x:Math.cos(a*111)*amp,y:Math.sin(a*147+.6)*amp*.75};}
const light=document.createElement('canvas');light.width=light.height=64;const lc=light.getContext('2d')!;const g=lc.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffff');g.addColorStop(.12,'#ffffeaff');g.addColorStop(.28,'#eaffd7bb');g.addColorStop(1,'#d9ffdf00');lc.fillStyle=g;lc.fillRect(0,0,64,64);
/** Particles begin on the disappearing print and its border, not at an unrelated emitter. */
export function cardScatter(c:CanvasRenderingContext2D,hero:Rect,u:number,t:number){const age=t-SV.scatter;if(age<0||age>.42)return;const q=age/.42;c.save();
 for(let i=0;i<116;i++){const edge=i<60,px=(rnd(i*7+9)-.5)*hero.w,py=(rnd(i*11+3)-.5)*hero.h;const x0=edge?(i%2?Math.sign(px)*hero.w*.5:px):px,y0=edge?(i%2?py:Math.sign(py)*hero.h*.5):py;const a=Math.atan2(y0,x0),distance=(.12+rnd(i+29)*.70)*u*(1-Math.exp(-q*3.8));const x=hero.x+x0+Math.cos(a)*distance,y=hero.y+y0+Math.sin(a)*distance-q*q*u*.20;const r=(1.8+rnd(i+88)*3.8)*(1-q)*Math.min(1.3,u/65);c.globalAlpha=(1-ease(.32,1,q))*(.45+rnd(i+19)*.55);c.drawImage(light,x-r*3,y-r*3,r*6,r*6);}
 c.restore();
}
/** Jagged, branching fractures projected onto the same board plane as the card. */
export function groundCracks(c:CanvasRenderingContext2D,project:(x:number,y:number)=>Point,u:number,t:number){
 const a=t-SV.impact;if(a<0||a>1.10)return;const grow=ease(0,.075,a),life=1-ease(.65,1.10,a);c.save();c.lineCap='round';c.lineJoin='round';
 const stroke=(points:Point[],alpha:number,width:number,color:string,offset=0)=>{c.globalAlpha=life*alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y+offset):c.moveTo(p.x,p.y+offset));c.stroke();};
 for(let i=0;i<11;i++){const angle=i*2.399+(rnd(i+14)-.5)*.22,length=.68+rnd(i+30)*.70,points:Point[]=[];
  for(let j=0;j<=7;j++){const q=j/7*grow,r=length*q,turn=angle+(rnd(i*17+j+1)-.5)*.33;points.push(project(Math.cos(turn)*r,Math.sin(turn)*r));}
  stroke(points,.20,Math.max(1.6,u*.031),'#182027');stroke(points,.7,Math.max(.5,u*.012),'#f6f0d2',1);stroke(points,.88,Math.max(.65,u*.013),'#273136');
  if(grow>.4)for(const branch of[3,5]){const r0=length*branch/7,theta=angle+(branch===3?-.65:.70),branchPoints=[project(Math.cos(angle)*r0,Math.sin(angle)*r0)];for(let j=1;j<=3;j++){const d=j*.10*grow;branchPoints.push(project(Math.cos(angle)*r0+Math.cos(theta+(rnd(i+j)-.5)*.4)*d,Math.sin(angle)*r0+Math.sin(theta)*d));}stroke(branchPoints,.6,Math.max(.4,u*.007),'#303b3e');}
 }
 glow(c,project(0,0),u*.38,'#f5ffdb',Math.max(0,1-a/.10)*.38,.45);c.restore();
}

/** A connected, tapered wake follows actual past positions, then drains into the impact. */
export function orbWake(c:CanvasRenderingContext2D,hero:Rect,dest:Rect,t:number){
 if(t<=SV.flight||t>=SV.impact+.12)return;
 const end=Math.min(t,SV.impact),head=summonOrb(hero,dest,end);
 let start=Math.max(SV.flight,t-.12),last=head,length=0;
 const maxLength=head.radius*5.5;
 // Bound the visible wake in projected space as the orb recedes; avoid a long laser line.
 for(let i=1;i<=24;i++){const age=lerp(end,start,i/24),p=summonOrb(hero,dest,age),step=Math.hypot(p.x-last.x,p.y-last.y);if(length+step>maxLength){start=lerp(lerp(end,start,(i-1)/24),age,(maxLength-length)/step);break;}length+=step;last=p;}
 const strength=ease(SV.flight,SV.flight+.045,t)*(1-ease(SV.impact+.015,SV.impact+.12,t));
 const samples=36;
 const point=(q:number)=>{const age=lerp(start,end,q),p=summonOrb(hero,dest,age);return {...p,nx:-p.dy,ny:p.dx};};
 const strip=(offset:number,width:number,color:string,alpha:number,phase:number)=>{
  const edges:Point[][]=[[],[]];
  for(let j=0;j<=samples;j++){const q=j/samples,p=point(q),taper=Math.pow(q,1.35),r=head.radius*taper;
   const shear=Math.sin(q*11-t*32+phase)*Math.sin(q*Math.PI)*.09;
   const center=(offset+shear)*r,half=width*r*(.82+.18*Math.sin(q*19-t*40+phase));
   edges[0].push({x:p.x+p.nx*(center+half),y:p.y+p.ny*(center+half)});edges[1].push({x:p.x+p.nx*(center-half),y:p.y+p.ny*(center-half)});
  }
  c.globalAlpha=alpha*strength;c.fillStyle=color;c.beginPath();[...edges[0],...edges[1].reverse()].forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
 };
 c.save();
 // Broad translucent volume, a brighter inner stream, and narrow moving surface filaments.
 strip(0,1.03,'#6babc7',.14,0);strip(0,.75,'#b3deea',.26,1);strip(0,.43,'#f3ffff',.66,2);strip(0,.13,'#ffffff',.86,3);
 for(let i=0;i<7;i++)strip((i-3)*.23,.016+(i%2)*.012,i%2?'#f7ffff':'#8ec7dc',i%2?.78:.46,i*1.7);
 // Short slipping strands trail the flanks; each lies on the same curved flow, never a radial burst.
 for(let i=0;i<6;i++){const progress=(t*4.8+i*.167)%1,sign=i%2?1:-1;c.beginPath();
  for(let j=0;j<=9;j++){const q=clamp(.12+progress*.68+j*.012),p=point(q),r=head.radius*Math.pow(q,1.35)*(1.04+.20*Math.sin(progress*Math.PI));const x=p.x+p.nx*r*sign,y=p.y+p.ny*r*sign;j?c.lineTo(x,y):c.moveTo(x,y);}
  c.globalAlpha=strength*Math.sin(progress*Math.PI)*.56;c.strokeStyle='#d8f5ff';c.lineWidth=Math.max(.5,head.radius*.025);c.stroke();
 }
 c.restore();
}
