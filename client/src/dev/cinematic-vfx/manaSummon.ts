import {ease,lerp,out,rnd,type Rect,type Point} from './direction';
export type ManaVariant='resonance'|'weave';
export const MANA_CONTACT=1.78;
/** boardProjection uses integer layout offsets. Register the projected plane to
 * the browser's fractional box so the same native node never jumps on landing. */
export function alignManaBase(base:DOMMatrix,w:number,h:number,dest:Rect){
 const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{const p=base.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};});
 const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),width=Math.max(...corners.map(p=>p.x))-left,height=Math.max(...corners.map(p=>p.y))-top;
 return new DOMMatrix().translate(dest.x-dest.w/2,dest.y-dest.h/2).scale(dest.w/width,dest.h/height).translate(-left,-top).multiply(base);
}
export const manaPhase=(t:number,v:ManaVariant)=>t<.34?'中央へ開示':t<.72?'中央でカードを読む':t<1.03?(v==='resonance'?'枠からマナが満ちる':'マナの薄膜が重なる'):t<MANA_CONTACT?'具現化しながら盤面へ':t<2.12?'接地・マナの定着':'余光がカードへ戻る';
export function manaPose(t:number,hero:Rect,hand:Rect,base:DOMMatrix,w:number,h:number,v:ManaVariant){
 const lift=out((t-.02)/.32),p={x:lerp(hand.x,hero.x,lift),y:lerp(hand.y,hero.y,lift),w:lerp(hand.w,hero.w,lift),h:lerp(hand.h,hero.h,lift)};
 const heroMatrix=new DOMMatrix().translate(p.x-p.w/2,p.y-p.h/2).scale(p.w/w,p.h/h);
 const q=ease(v==='resonance'?1.02:1.10,MANA_CONTACT,t);
 // Normalize homogeneous matrices at their card centers before interpolating.
 const a=heroMatrix.toFloat64Array(),b=base.toFloat64Array(),center=base.transformPoint(new DOMPoint(w/2,h/2));
 const values=Array.from(a,(x,i)=>lerp(x,b[i]/center.w,q));const matrix=new DOMMatrix(values);
 const bow=Math.sin(q*Math.PI);matrix.m42-=hero.w*.075*bow;matrix.m41+=(v==='resonance'?-.035:.045)*hero.w*bow;
 const conversion=ease(.80,1.18,t)*(1-ease(1.50,MANA_CONTACT,t));
 return{matrix,q,alpha:1-conversion*(v==='resonance'?.28:.40),charge:ease(.69,.99,t)*(1-ease(1.83,2.40,t)),conversion};
}
export function mapPoint(m:DOMMatrix,w:number,h:number,x:number,y:number):Point{const p=m.transformPoint(new DOMPoint((.5+x)*w,(.5+y)*h));return{x:p.x/p.w,y:p.y/p.w};}
type C=CanvasRenderingContext2D;
function stroke(c:C,points:Point[],color:string,width:number,alpha:number){if(alpha<=0||!points.length)return;c.save();c.strokeStyle=color;c.lineWidth=width;c.globalAlpha=alpha;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();}
function bloom(c:C,p:Point,r:number,a:number){if(a<=0||r<=0)return;const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(221,246,255,${a*.8})`);g.addColorStop(.16,`rgba(112,202,255,${a*.43})`);g.addColorStop(.46,`rgba(41,136,217,${a*.14})`);g.addColorStop(1,'rgba(30,100,190,0)');c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);}
/** A finite luminous sheet: volume, textured fibers and a narrow anisotropic rim.
 * Every point is derived from the moving card plane, not from an independent emitter. */
function sheet(c:C,path:(q:number)=>Point,width:number,t:number,life:number,seed:number){if(life<=0)return;
 const points=Array.from({length:65},(_,i)=>path(i/64));
 for(let layer=3;layer>=0;layer--){const broad=[.26,.70,1.1,2][layer],alpha=[.24,.10,.055,.018][layer];
  for(let i=0;i<64;i++){const q=(i+.5)/64,taper=Math.pow(Math.sin(q*Math.PI),1.35),grain=.82+.18*Math.sin(q*36-t*11+seed);stroke(c,[points[i],points[i+1]],layer===0?'#d8f4ff':'#53aee7',Math.max(.35,width*broad*taper),life*alpha*grain);}
 }
 for(let k=0;k<4;k++){const fiber:Point[]=[];for(let i=0;i<65;i++){const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(64,i+1)],d=Math.hypot(after.x-before.x,after.y-before.y)||1,q=i/64,off=(k-1.5)*width*.17*Math.sin(q*Math.PI)+Math.sin(q*17-t*8+k)*width*.045;fiber.push({x:p.x-(after.y-before.y)/d*off,y:p.y+(after.x-before.x)/d*off});}stroke(c,fiber,k===1?'#ecfaff':'#81c5e8',k===1?.75:.45,life*(k===1?.72:.32));}
}
export function manaDetails(rear:C,front:C,t:number,v:ManaVariant,m:DOMMatrix,w:number,h:number,base:DOMMatrix,dest:Rect){
 const P=(x:number,y:number)=>mapPoint(m,w,h,x,y),G=(x:number,y:number)=>mapPoint(base,w,h,x,y);
 const width=Math.hypot(P(.5,0).x-P(-.5,0).x,P(.5,0).y-P(-.5,0).y),life=ease(.74,.94,t)*(1-ease(1.91,2.23,t));
 if(v==='weave'){
  for(let side=0;side<2;side++){
   const phase=side*Math.PI,head=ease(.76+side*.08,1.13+side*.08,t),drain=ease(1.62,2.18,t),start=drain*.93,end=lerp(.10,1,head);
   const path=(q:number)=>{const u=lerp(start,end,q),a=phase+u*Math.PI*1.55+t*.75,contract=1-drain*.43;return P(Math.cos(a)*(.53+.06*Math.sin(u*Math.PI))*contract,lerp(.45,-.45,u)*contract+Math.sin(a)*.10);};
   sheet(side===0?rear:front,path,width*.13,t,life*(side===0?.8:1),side*3);
  }
 }else{
  // Small, offset corner flares; never a square frame or a full-screen flash.
  for(let i=0;i<4;i++){const x=i%2?.47:-.47,y=i<2?-.43:.44,q=ease(.78+i*.035,.96+i*.035,t)*(1-ease(1.10,1.40,t));const p=P(x,y);bloom(front,p,width*.14,q*.48);const a=P(x*.96,y*.96),b=P(x*1.13,y*1.10);stroke(front,[a,b],'#e3f7ff',.75,q*.6);}
  if(t>1.06&&t<MANA_CONTACT){for(let i=0;i<3;i++){const x=(i-1)*.21,path=(q:number)=>P(x+Math.sin(q*3+t*4)*.018,-.5-q*.23);sheet(rear,path,width*.045,t,Math.sin(ease(1.06,MANA_CONTACT,t)*Math.PI)*.45,i);}}
 }
 // Sparse flecks peel from the print perimeter, follow its descent, then die into it.
 for(let i=0;i<18;i++){const a=(t-.84-i*.017)/.82;if(a<=0||a>=1)continue;const sign=i%2?1:-1,y=rnd(i+11)*.88-.44,x=sign*(.49+Math.sin(a*Math.PI)*.10);const p=P(x,y-a*.045),next=P(x,y-a*.045-.018*(1-a));stroke(front,[next,p],i%5?'#d1f2ff':'#c9d9e3',.55,Math.sin(a*Math.PI)*.58);}
 const contact=ease(1.73,1.79,t)*(1-ease(1.90,2.24,t));
 if(contact>0){
  // Grounded contact light is derived from four edges of this exact card footprint.
  for(let i=0;i<4;i++){const s=i%2?1:-1,side=i<2,points:Point[]=[];for(let j=0;j<=24;j++){const q=j/24,a=(q-.5)*.94,spread=(1-ease(1.80,2.17,t))*.07;points.push(side?G(s*(.52+spread),a):G(a,s*(.52+spread)));}stroke(rear,points,'#45a4dd',dest.w*.065,contact*.075);stroke(rear,points,'#b1e5fb',dest.w*.012,contact*.56);}
  for(let i=0;i<6;i++){const x=(i/5-.5)*.94,p=G(x,.48),top=G(x,.48);top.y-=dest.w*(.16+.09*Math.sin(i*1.9))*(1-ease(1.78,2.13,t));stroke(front,[p,top],'#8ecfee',dest.w*.028,contact*.10);stroke(front,[p,top],'#e5f7ff',.55,contact*.32);}
  bloom(rear,G(0,.40),dest.w*.48,contact*.38);
 }
}
