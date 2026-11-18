/** A damped card held at a local grip point. No timer-driven decorative wobble:
 * translation/rotation respond to the pointer and settle when the hand stops. */
export function holdPhysicalCard(node: HTMLElement, source: DOMRect, pointer: {x:number;y:number}, angle:number, sourceSize:{width:number;height:number}) {
 const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 const strong=document.documentElement.dataset.handPhysicsStrength!=='soft';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const w=node.offsetWidth,h=node.offsetHeight;
 const rad=angle*Math.PI/180,dx=pointer.x-(source.left+source.width/2),dy=pointer.y-(source.top+source.height/2);
 const gx=clamp(.5+(dx*Math.cos(rad)+dy*Math.sin(rad))/sourceSize.width,.05,.95),gy=clamp(.5+(-dx*Math.sin(rad)+dy*Math.cos(rad))/sourceSize.height,.05,.95);
 let x=pointer.x,y=pointer.y,tx=x,ty=y,vx=0,vy=0,rx=0,ry=0,rz=angle,vrx=0,vry=0,vrz=0;
 let scale=sourceSize.width/w,vs=0,goalScale=1,goalZ=0,returning=false,dead=false,raf=0,last=performance.now();
 let complete:(()=>void)|null=null,returnStart=0;
 node.classList.add('physical-card');
 node.style.transformOrigin=`${gx*100}% ${gy*100}%`;
 node.style.willChange='transform';
 const shade=document.createElement('div');shade.className='physical-card-sheen';node.append(shade);
 function paint(){
  node.style.left=`${x-gx*w}px`;node.style.top=`${y-gy*h}px`;
  node.style.transform=`perspective(520px) rotateZ(${rz}deg) rotateY(${ry}deg) rotateX(${rx}deg) scale(${scale})`;
  node.style.filter=`drop-shadow(${-ry*.24}px ${returning?4:(strong?17:12)+Math.abs(rx)*.22}px ${returning?4:strong?12:9}px #07132370)`;
  shade.style.background=`linear-gradient(${115+ry*2}deg,rgba(227,243,255,${.025+Math.abs(ry)*.004}),transparent 48%,rgba(5,16,33,${.015+Math.abs(rx)*.004}))`;
 }
 function tick(now:number){
  if(dead)return;
  const dt=Math.min((now-last)/1000,.035);last=now;
  const n=Math.max(1,Math.ceil(dt/.008)),s=dt/n;
  for(let i=0;i<n;i++){
   const stiffness=returning?170:strong?700:1150,damping=returning?25:strong?34:57;
   vx+=((tx-x)*stiffness-vx*damping)*s;vy+=((ty-y)*stiffness-vy*damping)*s;
   x+=vx*s;y+=vy*s;
   const targetX=returning||reduced?0:clamp(-vy*(strong?.0459:.016),strong?-28.8:-18,strong?28.8:18);
   const targetY=returning||reduced?0:clamp(vx*(strong?.0576:.018),strong?-37.8:-22,strong?37.8:22);
   const targetZ=returning?goalZ:reduced?0:clamp(-vx*(strong?.0279:.009)+(gx-.5)*vy*(strong?.0387:.014),strong?-25.2:-16,strong?25.2:16);
   const rotationDamping=strong&&!returning?13.5:18,rotationSpring=strong?205:155;
   vrx+=((targetX-rx)*rotationSpring-vrx*rotationDamping)*s;
   vry+=((targetY-ry)*rotationSpring-vry*rotationDamping)*s;
   vrz+=((targetZ-rz)*(strong?230:185)-vrz*(strong&&!returning?14.5:20))*s;
   rx+=vrx*s;ry+=vry*s;rz+=vrz*s;
   vs+=((goalScale-scale)*220-vs*26)*s;scale+=vs*s;
  }
  if(reduced){x=tx;y=ty;rx=ry=0;rz=returning?goalZ:0;scale=goalScale;}
  paint();
  if(returning&&((Math.hypot(tx-x,ty-y)<.4&&Math.abs(goalScale-scale)<.008&&Math.abs(goalZ-rz)<.3)||now-returnStart>850)){
   x=tx;y=ty;scale=goalScale;rx=ry=0;rz=goalZ;paint();complete?.();complete=null;return;
  }
  raf=requestAnimationFrame(tick);
 }
 paint();raf=requestAnimationFrame(tick);
 return {
  move(px:number,py:number,handScale=1,handProximity=0){if(!returning){
   tx=px;ty=py;
   // Keep the grip attached while returning to the live hand size, before release.
   goalScale=1+(handScale-1)*clamp(handProximity,0,1);
  }},
  rect(){return node.getBoundingClientRect();},
  returnTo(card:HTMLElement){
   returning=true;returnStart=performance.now();const r=card.getBoundingClientRect();
   const m=new DOMMatrix(getComputedStyle(card).transform);goalZ=Math.atan2(m.b,m.a)*180/Math.PI;
   const size=Math.hypot(m.a,m.b),cw=card.offsetWidth*size,ch=card.offsetHeight*size,theta=goalZ*Math.PI/180;
   const ax=(gx-.5)*cw,ay=(gy-.5)*ch;
   tx=r.left+r.width/2+ax*Math.cos(theta)-ay*Math.sin(theta);
   ty=r.top+r.height/2+ax*Math.sin(theta)+ay*Math.cos(theta);goalScale=cw/w;
   return new Promise<void>(resolve=>{complete=resolve;});
  },
  dispose(){dead=true;cancelAnimationFrame(raf);complete?.();complete=null;shade.remove();}
 };
}
