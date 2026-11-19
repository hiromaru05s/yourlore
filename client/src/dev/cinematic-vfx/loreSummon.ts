import {ease,lerp,rnd,type Rect,type Point} from './direction';
export const LORE_CONTACT=2.02;
export const lorePhase=(t:number)=>['中央で開示','縁の刻印を解錠','結晶の記録を転写','盤面で実体化','定着'][[.73,1.12,1.79,2.22].filter(v=>t>=v).length];
const blue='#72c9f4',white='#e1f5ff',gold='#d6bd83';
function line(c:CanvasRenderingContext2D,p:Point[],color:string,width:number,alpha:number){if(alpha<=0)return;c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='bevel';c.beginPath();p.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();}
function bloom(c:CanvasRenderingContext2D,p:Point,rx:number,ry:number,a:number){if(a<=0)return;c.save();c.translate(p.x,p.y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,`rgba(198,239,255,${a*.65})`);g.addColorStop(.16,`rgba(93,193,255,${a*.38})`);g.addColorStop(.5,`rgba(35,119,220,${a*.12})`);g.addColorStop(1,'rgba(20,80,180,0)');c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();}
export function loreEtching(c:CanvasRenderingContext2D,hero:Rect,dest:Rect,t:number,project:(x:number,y:number)=>Point){
 const unlock=ease(.65,.95,t)*(1-ease(1.12,1.48,t));
 // The paired book-leaf traces sit inside the printed record, then feed the
 // receiving plate. They are not a replacement card frame.
 const hp=(x:number,y:number)=>({x:hero.x+x*hero.w,y:hero.y+y*hero.h});
 if(unlock>0){for(const s of[-1,1]){
  const leaf=[hp(s*.03,.26),hp(s*.31,.34),hp(s*.36,.24),hp(s*.36,-.28),hp(s*.09,-.36),hp(s*.03,-.29),hp(s*.03,.26)];
  line(c,leaf,blue,hero.w*.025,unlock*.08);line(c,leaf,blue,hero.w*.008,unlock*.5);line(c,leaf,white,.65,unlock*.92);
  for(let j=0;j<5;j++){const y=-.21+j*.095;line(c,[hp(s*.10,y),hp(s*.27,y+.04)],gold,.65,unlock*.65);}
 }
 bloom(c,hero,hero.w*.75,hero.h*.6,unlock*.38);}
 const receiving=ease(1.03,1.60,t)*(1-ease(2.16,2.8,t));
 if(receiving<=0)return;
 // A book-shaped lattice follows the actual perspective of this monster slot.
 const u=dest.w,converge=1-.42*ease(2.07,2.65,t),plane=project;project=(x,y)=>plane(x*converge,y*converge);
 for(const s of[-1,1]){
  const leaf=[project(s*.04,.45),project(s*.50,.57),project(s*.64,.45),project(s*.64,-.43),project(s*.11,-.57),project(s*.04,-.48),project(s*.04,.45)];
  line(c,leaf,blue,u*.065,receiving*.035);line(c,leaf,blue,u*.025,receiving*.16);line(c,leaf,white,Math.max(.65,u*.006),receiving*.9);
  for(let j=0;j<5;j++){const y=-.32+j*.14;line(c,[project(s*.15,y),project(s*.49,y+.10)],gold,.6,receiving*.75);}
  const rail=[project(s*.15,.76),project(s*.76,.92),project(s*.91,.72),project(s*.91,-.69),project(s*.23,-.92)];
  line(c,rail,blue,u*.022,receiving*.10);line(c,rail,gold,.75,receiving*.55);
  for(let j=0;j<4;j++){const y=-.55+j*.33;const rune=[project(s*.85,y-.045),project(s*.91,y),project(s*.85,y+.045),project(s*.79,y),project(s*.85,y-.045)];line(c,rune,white,.65,receiving*.75);}
 }
 const transfer=ease(1.10,1.26,t)*(1-ease(1.84,2.02,t));
 if(transfer>0){
  const flight=(age:number)=>{const q=ease(1.07,1.85,age);return{x:lerp(hero.x,dest.x,q),y:lerp(hero.y,dest.y,q)-Math.sin(q*Math.PI)*hero.w*.12};};
  const p=flight(t),old=flight(Math.max(1.07,t-.18)),length=Math.hypot(p.x-old.x,p.y-old.y)||1,nx=-(p.y-old.y)/length,ny=(p.x-old.x)/length;
  bloom(c,p,hero.w*.25,hero.w*.32,transfer*1.05);
  // The body is a tapered volume following the same past positions as the
  // crystalline record. Its center is bright, its outer air scattering soft.
  for(let k=4;k>=0;k--){const radius=hero.w*(.012+k*.013),alpha=transfer*[.53,.19,.08,.035,.015][k];c.save();c.globalAlpha=alpha;c.fillStyle=k===0?white:blue;c.beginPath();
   for(let j=0;j<=30;j++){const q=j/30,a=flight(lerp(Math.max(1.07,t-.24),t,q)),r=radius*Math.pow(q,1.8);j?c.lineTo(a.x+nx*r,a.y+ny*r):c.moveTo(a.x+nx*r,a.y+ny*r);}
   for(let j=30;j>=0;j--){const q=j/30,a=flight(lerp(Math.max(1.07,t-.24),t,q)),r=radius*Math.pow(q,1.8);c.lineTo(a.x-nx*r,a.y-ny*r);}c.closePath();c.fill();c.restore();
  }
  for(let i=0;i<24;i++){const age=(t*1.2+i*.041)%1,head=flight(Math.max(1.07,t-age*.22)),spread=hero.w*.12*(1-age),x=head.x+(rnd(i+7)-.5)*spread,y=head.y+(rnd(i+24)-.5)*spread;line(c,[{x:x-nx*1.8,y:y-ny*1.8},{x,y}],i%5?white:gold,.75,transfer*(1-age)*.75);}
  for(let k=0;k<4;k++){const pts:Point[]=[];for(let j=0;j<=18;j++){const q=j/18,a=flight(lerp(Math.max(1.07,t-.18),t,q)),r=(k-1.5)*hero.w*.023*q+Math.sin(q*7+t*9+k)*hero.w*.006*q;pts.push({x:a.x+nx*r,y:a.y+ny*r});}line(c,pts,k%2?gold:white,.5,transfer*.42);}
 }
 const form=ease(1.70,1.91,t)*(1-ease(2.02,2.32,t));
 bloom(c,dest,u*1.3,u*.85,form*.7);
 // A fast, planar scan returns the registered image to matter, with no flying orb.
 if(t>=1.76&&t<2.15){const q=ease(1.76,2.15,t),y=lerp(-.66,.66,q);const beam=[project(-.67,y),project(.67,y)];line(c,beam,blue,u*.11,Math.sin(q*Math.PI)*.15);line(c,beam,white,u*.012,Math.sin(q*Math.PI)*.9);}
}
