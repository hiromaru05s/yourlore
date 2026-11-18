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
 return{x:center.x,y:center.y,radius:radius*dest.w,travel:q};
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
