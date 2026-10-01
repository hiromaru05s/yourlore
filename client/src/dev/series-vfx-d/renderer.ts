import {RiftRenderer,disposeMaterial} from '../../../../docs/vfx-prototypes/2026-09-27-rift-ink-rich/renderer';
import type {Op,Config} from './timeline';
export type Point={x:number;y:number;w:number;h:number};
type C=CanvasRenderingContext2D;
const ink=new RiftRenderer();
export const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const sm=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const rnd=(i:number)=>{const x=Math.sin(i*127.1+39.7)*43758.54;return x-Math.floor(x);};
const palette:Record<string,string[]>={S07:['#24191f','#89444a','#df9f5e','#fff1c8'],S15:['#151024','#624090','#ba95dc','#f3e6ff'],S23:['#1c2924','#436846','#a1bf68','#e9f6bd'],S24:['#1e253a','#355b81','#cdb578','#fff1c8'],S25:['#31231e','#8d6538','#e4c174','#fff5d3']};
function poly(c:C,pts:number[][],fill:string,stroke?:string,lw=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c:C,pts:number[][],color:string,width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function surface(c:C,face:HTMLCanvasElement,w:number,h:number){c.drawImage(face,-w/2,-h/2,w,h);}
function shadow(c:C,p:Point,scale=1){c.save();c.fillStyle='#111220';c.globalAlpha=.18*scale;c.filter=`blur(${p.w*.045}px)`;c.beginPath();c.ellipse(p.x,p.y+p.h*.42,p.w*.39*scale,p.w*.07,0,0,7);c.fill();c.restore();}
function contact(c:C,p:Point,t:number,col:string){const a=Math.sin(clamp(t)*Math.PI);if(a<=0)return;c.save();c.translate(p.x,p.y);c.scale(1,.38);for(let j=0;j<5;j++){const angle=j*1.256+.2;const r=p.w*(.12+t*.65);c.rotate(angle);poly(c,[[r,0],[r+p.w*.12*(1-t),-p.w*.035*(1-t)],[r+p.w*.22*(1-t),0],[r+p.w*.12*(1-t),p.w*.035*(1-t)]],col);c.rotate(-angle);}c.restore();}
function trace(c:C,w:number,h:number,t:number,colors:string[],style:number){c.save();c.beginPath();c.rect(-w*.40,-h*.41,w*.80,h*.82);c.clip();c.globalAlpha=sm(0,.22,t)*(1-sm(.78,1,t));
 for(let k=0;k<11;k++){const pts:number[][]=[];for(let j=0;j<18;j++){const x=(-.4+j/17*.8)*w,y=(-.38+k/10*.76)*h+Math.sin(j*.75+k+t*8)*w*.019;pts.push([x,y]);}line(c,pts,colors[2],w*.003);}
 for(let k=0;k<7;k++){const x=(rnd(k)-.5)*w*.64,y=(rnd(k+31)-.5)*h*.7;const r=w*(.035+rnd(k+22)*.035);if(style===1)poly(c,[[x,y-r],[x+r*.6,y],[x,y+r],[x-r*.6,y]],colors[1],colors[3],w*.003);else{c.beginPath();c.ellipse(x,y,r,r*.32,t*2,0,7);c.strokeStyle=colors[3];c.lineWidth=w*.005;c.stroke();}}
 c.restore();c.strokeStyle=colors[2];c.lineWidth=w*.013;c.globalAlpha=Math.sin(t*Math.PI)*.6;line(c,[[-w*.365,h*.32],[-w*.365,-h*.34],[-w*.30,-h*.405],[w*.30,-h*.405],[w*.365,-h*.34],[w*.365,h*.32],[w*.3,h*.405],[-w*.30,h*.405],[-w*.365,h*.32]],colors[2],w*.008);c.globalAlpha=1;
}
function rust(c:C,face:HTMLCanvasElement,w:number,h:number,t:number,v:number,collapse:boolean,count:number){
 const p=palette.S23,charge=sm(.02,.42,t)*(.34+Math.min(3,count)*.22),breakup=collapse?sm(.40,.94,t):0;const cellsX=5,cellsY=7;
 if(v===1){
  const vertex=(x:number,y:number)=>[(-.5+x/cellsX)*w+(x===0||x===cellsX?0:(rnd(x+y*13)-.5)*w/cellsX*.75),(-.5+y/cellsY)*h+(y===0||y===cellsY?0:(rnd(x+y*17+3)-.5)*h/cellsY*.75)];
  for(let y=0;y<cellsY;y++)for(let x=0;x<cellsX;x++){
   const seed=x+y*cellsX,points=[vertex(x,y),vertex(x+1,y),vertex(x+1,y+1),vertex(x,y+1)],cx=points.reduce((n,p)=>n+p[0],0)/4,cy=points.reduce((n,p)=>n+p[1],0)/4;
   const local=sm(rnd(seed)*.35,.75,t),dx=cx*.62*breakup,dy=cy*.36*breakup+h*.30*breakup*breakup;
   c.save();c.translate(cx+dx,cy+dy);c.rotate((rnd(seed+8)-.5)*2.5*breakup);c.scale(1-breakup*.92,1-breakup*.92);c.translate(-cx,-cy);c.beginPath();points.forEach((pt,i)=>i?c.lineTo(pt[0],pt[1]):c.moveTo(pt[0],pt[1]));c.closePath();c.clip();surface(c,face,w,h);
   if(local>.01){const alpha=local*(.25+count*.13);c.fillStyle=`rgba(28,41,31,${alpha})`;c.fillRect(-w/2,-h/2,w,h);const inset=points.map(pt=>[cx+(pt[0]-cx)*.90,cy+(pt[1]-cy)*.90]);line(c,[...inset,inset[0]],p[2],w*.012*charge);line(c,[...points,points[0]],p[0],w*.018*charge);for(let k=0;k<3;k++){const px=cx+(rnd(seed+k)-.5)*w*.09,py=cy+(rnd(seed+k+18)-.5)*h*.08;line(c,[[px-w*.012,py-w*.009],[px+w*.014,py],[px,py+w*.017]],p[3],w*.003*local);}}
   c.restore();}
 }else{
  c.save();c.scale(1-breakup*.84,1-breakup*.25);surface(c,face,w,h);c.beginPath();c.rect(-w*.4,-h*.42,w*.8,h*.84);c.clip();
  for(let k=0;k<14;k++){const x=(rnd(k+22)-.5)*w*.7,y=(rnd(k+18)-.5)*h*.65,r=w*(.09+rnd(k+91)*.10)*charge;c.beginPath();for(let j=0;j<=40;j++){const a=j/40*Math.PI*2,rr=r*(1+Math.sin(a*3+t*10+k)*.15);const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*1.32;if(j===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.closePath();c.fillStyle=k%2?p[0]+'bb':p[1]+'bd';c.fill();c.strokeStyle=p[2];c.lineWidth=w*.009;c.stroke();c.beginPath();c.ellipse(x-r*.27,y-r*.4,r*.25,r*.09,-.6,0,7);c.fillStyle=p[3];c.fill();
   const grow=sm(k*.025,.65,t);const pts:number[][]=[];for(let j=0;j<15;j++)pts.push([x+Math.sin(j*.6+k)*w*.03,y+j*h*.022*grow]);line(c,pts,p[2],w*.009);for(let j=3;j<14;j+=3){const q=pts[j];line(c,[[q[0],q[1]],[q[0]+(j%2?1:-1)*w*.08*grow,q[1]-h*.025]],p[3],w*.003);}}
  c.restore();
  if(collapse){for(let k=0;k<8;k++){const dx=(rnd(k)-.5)*w*breakup*1.8,dy=h*.6*breakup;c.save();c.translate(dx,dy);c.rotate(k*.73);const len=w*.5*breakup*(1-breakup),wide=w*.04*(1-breakup);poly(c,[[-len,0],[0,-wide],[len*.2,0],[0,wide]],p[1],p[2],w*.004);c.restore();}}
 }
}
function jaw(c:C,face:HTMLCanvasElement,w:number,h:number,t:number,v:number,chest:boolean){
 const p=palette[chest?'S25':'S07'],open=Math.sin(sm(.15,.83,t)*Math.PI)*.78,settle=sm(.78,1,t);
 if(v===1){
  c.save();c.translate(0,-h*.035);poly(c,[[-w*.37,-h*.10],[w*.37,-h*.10],[w*.34,h*.24],[-w*.34,h*.24]],p[0],p[2],w*.01);
  const rays=5;for(let k=0;k<rays;k++)poly(c,[[(-.25+k*.125)*w,h*.10],[(-.4+k*.17)*w,-h*.70*open],[(-.32+k*.17)*w,-h*.67*open]],p[2]+(k%2?'50':'80'));
  c.save();c.translate(0,-h*.22*open);c.rotate(-open*.08);c.drawImage(face,0,0,face.width,face.height*.48,-w/2,-h/2,w,h*.48);c.restore();c.drawImage(face,0,face.height*.48,face.width,face.height*.52,-w/2,-h*.02,w,h*.52);
  for(let k=0;k<8;k++){const x=(-.32+k*.092)*w;const len=(k%2?.095:.13)*h*open;if(!chest){poly(c,[[x,-h*.03-h*.22*open],[x+w*.06,-h*.03-h*.22*open],[x+w*.025,-h*.03-h*.22*open+len]],p[3],p[1],w*.004);poly(c,[[x,h*.09],[x+w*.057,h*.09],[x+w*.038,h*.09-len*.74]],p[2]);}}
  const lock=h*.07*(1-open);poly(c,[[-w*.08,-lock],[w*.08,-lock],[w*.10,lock],[0,lock*1.3],[-w*.10,lock]],p[1],p[3],w*.01);c.restore();
 }else{
  // Six illustrated petals retain the card's image as the center turns inside out.
  c.save();c.globalAlpha=open;const membrane:number[][]=[];for(let k=0;k<6;k++){const a=k/6*Math.PI*2;membrane.push([Math.cos(a)*w*(.36+open*.06),Math.sin(a)*h*(.41+open*.04)]);}poly(c,membrane,p[0],p[1],w*.02);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;line(c,[[0,0],[Math.cos(a)*w*.37,Math.sin(a)*h*.42]],p[2],w*.009);}c.restore();
  for(let k=0;k<6;k++){c.save();const a=k/6*Math.PI*2;const dx=Math.cos(a)*w*.18*open,dy=Math.sin(a)*h*.14*open;c.translate(dx,dy);c.rotate((k%2?1:-1)*open*.3);c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*w*1.2,Math.sin(a)*h*1.2);c.lineTo(Math.cos(a+Math.PI/3)*w*1.2,Math.sin(a+Math.PI/3)*h*1.2);c.closePath();c.clip();surface(c,face,w,h);trace(c,w,h,t,p,2);c.restore();}
  c.save();c.scale(open,open);poly(c,[[-w*.27,0],[-w*.16,-h*.18],[w*.18,-h*.16],[w*.3,0],[w*.12,h*.16],[-w*.14,h*.18]],p[0],p[2],w*.015);
  if(!chest)for(let k=0;k<10;k++){const a=k*Math.PI*2/10;poly(c,[[Math.cos(a)*w*.27,Math.sin(a)*h*.17],[Math.cos(a+.35)*w*.27,Math.sin(a+.35)*h*.17],[Math.cos(a+.16)*w*.12,Math.sin(a+.16)*h*.06]],p[3]);}
  else for(let j=0;j<4;j++){const q=j*.23;line(c,[[-w*.3,h*(q-.3)],[0,h*(q-.38)],[w*.3,h*(q-.3)]],p[3],w*.018*(1-settle));}c.restore();
 }
 trace(c,w,h,t,p,v);
}
function fold(c:C,face:HTMLCanvasElement,w:number,h:number,t:number,v:number){const p=palette.S15;for(let k=0;k<12;k++){const q=k/11,f=sm(.15+q*.16,.82,t),ww=w/12;c.save();c.translate((-w/2+k*ww)*(1-f),Math.sin(q*5+t*4)*h*.12*f);c.rotate((q-.5)*1.8*f);c.scale(Math.max(.025,1-f),1-f*.72);c.drawImage(face,k*face.width/12,0,face.width/12,face.height,-ww/2,-h/2,ww,h);poly(c,[[-ww/2,-h/2],[ww/2,-h/2],[ww/2,h/2],[-ww/2,h/2]],p[k%2?1:0]+Math.round(f*200).toString(16).padStart(2,'0'),p[2],w*.004);for(let j=0;j<9;j++)line(c,[[-ww*.25,-h*.4+j*h*.1],[ww*.3,-h*.36+j*h*.1]],p[3],w*.002);c.restore();}if(v===2)trace(c,w,h,t,p,2);}
function die(c:C,x:number,y:number,size:number,roll:number,tilt:number,p:string[]){c.save();c.translate(x,y);c.rotate(tilt);const s=size;poly(c,[[-s,-s*.65],[0,-s],[s,-s*.65],[0,-s*.28]],p[3],p[1],s*.04);poly(c,[[0,-s*.28],[s,-s*.65],[s,s*.55],[0,s]],p[1],p[2],s*.04);poly(c,[[-s,-s*.65],[0,-s*.28],[0,s],[-s,s*.57]],p[2],p[0],s*.035);for(let k=0;k<roll;k++){const dx=(k%2)*.37-.7,dy=Math.floor(k/2)*.37-.30;c.beginPath();c.ellipse(s*dx,s*dy,s*.075,s*.08,.2,0,7);c.fillStyle=p[0];c.fill();}line(c,[[-s*.84,-s*.59],[-s*.09,-s*.30],[-s*.09,s*.85]],p[3],s*.025);c.restore();}
function trail(c:C,a:Point,b:Point,t:number,p:string[],variant:number){const f=sm(.03,.87,t),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f-Math.sin(f*Math.PI)*Math.min(120,a.w*.9);const width=a.w*.10*Math.sin(t*Math.PI);const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx);c.save();c.translate(x,y);c.rotate(angle);poly(c,[[-a.w*.85*(1-f),0],[-a.w*.25,-width],[a.w*.14,0],[-a.w*.25,width]],p[0]);poly(c,[[-a.w*.6*(1-f),0],[-a.w*.15,-width*.52],[a.w*.14,0],[-a.w*.15,width*.52]],p[2]);line(c,[[-a.w*.48*(1-f),0],[a.w*.12,0]],p[3],a.w*.007);if(variant===2)for(let k=0;k<4;k++)line(c,[[-a.w*(.1+k*.14),-width*.7],[-a.w*(.17+k*.14),width*.7]],p[3],a.w*.004);c.restore();contact(c,b,clamp((t-.75)/.25),p[2]);}
export function drawOp(c:C,op:Op,face:HTMLCanvasElement,a:Point,b:Point,elapsed:number,cfg:Config){
 const t=clamp(elapsed/op.duration),v=cfg.variant,p=palette[op.family]||palette.S15,w=a.w,h=a.h; c.save();
 if(cfg.reduced){c.globalAlpha=Math.sin(t*Math.PI);c.strokeStyle=p[2];c.lineWidth=3;c.strokeRect(b.x-b.w*.40,b.y-b.h*.4,b.w*.8,b.h*.8);c.restore();return;}
 if(op.kind==='depart'&&v===1){ink.draw(c,face,'inscription',a,b,w,t*2800,{heightRatio:h/w});c.restore();return;}
 if(op.kind==='transfer'||op.kind==='depart'){
  const f=sm(.2,.9,t),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f-Math.sin(f*Math.PI)*w*.55;shadow(c,{...a,x,y:a.y+(b.y-a.y)*f},1-f*.6);c.translate(x,y);c.scale(1-f*.7,1-f*.7);if(v===2){fold(c,face,w,h,t*.85,v);}else{c.rotate(Math.sin(t*Math.PI)*.22);surface(c,face,w,h);trace(c,w,h,t,p,v);}c.restore();c.save();if(t>.3)trail(c,a,b,clamp((t-.3)/.7),p,v);c.restore();return;
 }
 if(op.kind==='reward'){trail(c,a,b,t,p,v);c.restore();return;}
 if(op.kind==='dice'){
  c.translate(a.x,a.y);surface(c,face,w,h);trace(c,w,h,t,p,v);const n=op.count||1;
  for(let k=0;k<n;k++){const cols=Math.min(n,5),rows=Math.ceil(n/cols),roll=op.rolls?.[k]??(cfg.outcome==='miss'?1:cfg.outcome==='two'?3:6);const phase=clamp((t-k*.015)/.8),bounce=(1-phase)**2*Math.abs(Math.sin(phase*Math.PI*4))*w*.8,x=(k%cols-(cols-1)/2)*w*(n>3?.42:.58),y=-h*.12-bounce+(Math.floor(k/cols)-(rows-1)/2)*w*.49;shadow(c,{x,y:h*.02,w:w*.5,h:h*.5});if(v===1)die(c,x,y,w*(n>3?.16:.22),roll,(1-sm(.3,.83,t))*Math.sin(t*15+k)*.9,p);else{const r=w*(n>3?.21:.31);for(let j=0;j<6;j++){const angle=j*Math.PI/3+Math.PI*.5+(1-sm(.12,.65,t))*t*8;poly(c,[[x+Math.cos(angle)*r,y+Math.sin(angle)*r],[x+Math.cos(angle+.9)*r,y+Math.sin(angle+.9)*r],[x,y]],j===(t>.56?roll-1:Math.floor(t*30)%6)?p[2]:p[0],p[2],w*.01);}if(t>.50){c.fillStyle=p[3];c.font=`600 ${w*.24}px Georgia`;c.textAlign='center';c.fillText(String(roll),x,y+w*.08);}}}
  c.restore();return;
 }
 if(['counter','ability'].includes(op.kind)&&op.from!==op.to&&t<.5)trail(c,a,b,t*2,p,v);
 const target=['counter','ability'].includes(op.kind)?b:a;shadow(c,target);c.translate(target.x,target.y);
 if(op.kind==='collapse'){rust(c,face,target.w,target.h,t,v,true,3);c.restore();if(t>.55){c.save();trail(c,a,b,(t-.55)/.45,p,v);c.restore();}return;}
 if(op.kind==='counter'&&op.family==='S23'){rust(c,face,target.w,target.h,t*.7,v,false,op.count||1);const n=Math.min(3,op.count||1);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*target.w*.18,y=target.h*.29;poly(c,[[x,y-target.w*.07],[x+target.w*.045,y],[x,y+target.w*.07],[x-target.w*.045,y]],p[0],p[3],target.w*.008);}c.restore();return;}
 if(op.kind==='open'){jaw(c,face,w,h,t,v,op.family==='S25');c.restore();return;}
 if(op.kind==='arrive'){
  const f=sm(.05,.78,t);c.translate(0,-h*.28*(1-f));c.scale(.85+.15*f,.86+.14*f);
  if(op.family==='S07'||op.family==='S25'){jaw(c,face,w,h,t,v,op.family==='S25');}
  else if(op.family==='S23'){rust(c,face,w,h,.65*(1-f),v,false,1);}
  else if(op.family==='S15'){if(v===2)fold(c,face,w,h,(1-f)*.9,v);else {c.globalAlpha=f;surface(c,face,w,h);trace(c,w,h,t,p,v);}}
  else{surface(c,face,w,h);trace(c,w,h,t,p,v);}c.restore();c.save();contact(c,{...a,y:a.y+h*.41},clamp((t-.65)/.35),p[2]);c.restore();return;
 }
 surface(c,face,target.w,target.h);trace(c,target.w,target.h,t,p,v);
 if(op.kind==='ability'){
  if(op.label?.includes('強化')||op.label?.includes('攻撃力')){
   const amount=Math.sin(Math.PI*t),tw=target.w,th=target.h,both=op.label.includes('強化');
   for(let i=0;i<(both?2:1);i++){c.save();c.translate((both?(i-.5):0)*tw*.35,th*(.20-.46*sm(.1,.85,t)));c.scale(amount,amount);poly(c,[[0,-th*.22],[tw*.14,-th*.04],[tw*.065,-th*.04],[tw*.065,th*.19],[-tw*.065,th*.19],[-tw*.065,-th*.04],[-tw*.14,-th*.04]],i?'#7c2d31':'#173d6e',i?'#f99586':'#8cd4ff',tw*.015);line(c,[[0,th*.14],[0,-th*.13]],i?'#ffe4ce':'#e4f6ff',tw*.014);c.restore();}c.restore();return;
  }
  // Attack ability: two blade-shaped engravings, deliberately no circular counter pips.
  const g=Math.sin(sm(.05,.95,t)*Math.PI),tw=target.w,th=target.h;c.globalAlpha=g;
  for(const sign of [-1,1]){c.save();c.rotate(sign*.55);if(v===1)poly(c,[[-tw*.045,th*.30],[tw*.025,th*.12],[tw*.08,-th*.28],[0,-th*.40],[-tw*.04,-th*.22]],p[1],p[3],tw*.009);else{line(c,[[0,th*.34],[-tw*.02,0],[sign*tw*.10,-th*.33]],p[2],tw*.028);for(let i=0;i<5;i++)line(c,[[0,th*(.2-i*.10)],[sign*tw*.14,th*(.15-i*.10)]],p[3],tw*.007);}c.restore();}
 }else if(op.kind==='lock'||op.kind==='protect'){
  const q=Math.sin(t*Math.PI);c.globalAlpha=q;const tw=target.w,th=target.h;
  if(v===1){for(let k=-3;k<=3;k++){const y=k*th*.085;poly(c,[[-tw*.38,y-th*.028],[tw*.38,y-th*.028],[tw*.38,y+th*.028],[-tw*.38,y+th*.028]],p[0],p[2],tw*.004);}}
  else for(let k=0;k<4;k++){c.save();c.rotate(k*Math.PI/2);poly(c,[[-tw*.12,-th*.28],[tw*.12,-th*.28],[tw*.22,-th*.06],[0,0],[-tw*.22,-th*.06]],p[1]+'bb',p[3],tw*.006);c.restore();}
  poly(c,[[0,-th*.14],[tw*.13,0],[0,th*.14],[-tw*.13,0]],p[0],p[3],tw*.014);
 }else if(op.kind==='counter'){for(let k=0;k<12;k++){const x=(k%4-1.5)*target.w*.12,y=(Math.floor(k/4)-1)*target.h*.11;poly(c,[[x,y-target.w*.04],[x+target.w*.035,y],[x,y+target.w*.04],[x-target.w*.035,y]],t>k/20?p[2]:p[0],p[3],target.w*.004);}}
 c.restore();
}
export function dispose(){disposeMaterial();}
