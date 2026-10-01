import {Material} from './material';
import {families,type Beat,type Anchor} from './choreography';
export interface Point{x:number;y:number;w:number;h:number;}
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
export class Renderer{
 readonly canvas=document.createElement('canvas');private c:CanvasRenderingContext2D;readonly material:Material|null;drawCalls=0;
 constructor(){this.canvas.id='series-a-fx';this.canvas.style.cssText='position:fixed;inset:0;z-index:80;pointer-events:none';document.body.append(this.canvas);this.c=this.canvas.getContext('2d')!;let material=null;try{material=new Material();}catch{}this.material=material;}
 clear(){const d=Math.min(devicePixelRatio,2);if(this.canvas.width!==Math.round(innerWidth*d)||this.canvas.height!==Math.round(innerHeight*d)){this.canvas.width=innerWidth*d;this.canvas.height=innerHeight*d;this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';}this.c.setTransform(d,0,0,d,0,0);this.c.clearRect(0,0,innerWidth,innerHeight);this.drawCalls=0;}
 private line(points:number[],width:number,color:string){const c=this.c;c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
 private stamp(p:Point,k:number,f:number,v:number,kind:string,count=1){const c=this.c,col=families[f],r=Math.max(12,p.w*.39)*Math.sin(Math.PI*clamp(k))**.45;
 if(r<.1)return;c.save();c.translate(p.x,p.y);c.scale(1,.85);const release=['unseal','reset','shatter'].includes(kind)?ease(k):0;
 for(let j=0;j<count;j++){c.save();c.translate((j-(count-1)/2)*r*.7,0);const rr=r/(count>1?1.4:1);c.globalAlpha=.9;
 const forms:number[][]=[
 [-.7,.7,-.25,-.8,-.05,.15,.7,-.7,.2,.8,-.05,.3],
 [0,-.85,.7,0,0,.85,-.7,0,0,-.85],
 [-.5,-.8,.5,-.7,.4,.75,.15,.58,0,.8,-.2,.55,-.5,.7,-.5,-.8],
 [0,.85,-.13,.2,-.6,-.15,-.75,-.7,-.3,-.35,0,-.75,.3,-.35,.75,-.7,.6,-.15,.13,.2],
 [-.7,.6,-.5,-.05,.55,-.75,.25,-.08,.7,.22,.3,.58,-.7,.6],
 [-.12,.85,-.22,.0,-.02,-.9,.16,-.3,.12,.85],
 [-.75,-.75,-.6,.4,0,.8,.6,.4,.75,-.75,.3,-.2,0,-.5,-.3,-.2,-.75,-.75],
 [-.55,.7,-.55,-.75,.5,-.15,-.55,.1,.5,.7,.5,-.65],
 [-.7,-.65,-.05,-.5,.1,-.65,.7,-.75,.7,.65,.08,.78,-.08,.65,-.7,.55,-.7,-.65]
 ];
 const pts=forms[f];
 if(v===0){c.beginPath();c.moveTo(pts[0]*rr,pts[1]*rr);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i]*rr*(1+release),pts[i+1]*rr);c.closePath();c.fillStyle=col.dark;c.fill();c.strokeStyle=col.color;c.lineWidth=2;c.stroke();c.save();c.scale(.72,.72);c.strokeStyle=col.light;c.lineWidth=.85;c.stroke();c.restore();}
 else{c.fillStyle=col.dark;c.beginPath();c.moveTo(pts[0]*rr,pts[1]*rr);for(let i=2;i<pts.length;i+=2){const px=pts[i-2]*rr,py=pts[i-1]*rr,x=pts[i]*rr,y=pts[i+1]*rr;c.quadraticCurveTo((px+x)*.5+rr*.12*Math.sin(k*5+i),(py+y)*.5-rr*.12,x,y);}c.closePath();c.fill();c.strokeStyle=col.color;c.lineWidth=1.5;c.stroke();
  for(let i=0;i<4;i++){const y=(i-1.5)*rr*.24;c.beginPath();c.moveTo(-rr*.45,y);c.bezierCurveTo(-rr*.2,y-rr*.35*(1-k),rr*.2,y+rr*.25,rr*.45,y);c.lineWidth=.85;c.strokeStyle=i%2?col.light:col.color;c.stroke();}}

 if(kind==='deny'||kind==='reset'){this.line([-rr*.5,-rr*.5,rr*.5,rr*.5],3,col.light);this.line([rr*.5,-rr*.5,-rr*.5,rr*.5],2,col.color);}
 if(kind==='complete'||kind==='heal'){this.line([-rr*.35,0,-rr*.1,rr*.3,rr*.5,-rr*.45],2,col.light);}
 c.restore();}c.restore();}
 private ribbon(a:Point,b:Point,k:number,col:typeof families[number],v:number,offset=0){const c=this.c;const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 const head=ease(k),tail=ease((k-.23)/.77),width=Math.min(a.w*.18,13)*Math.sin(Math.PI*k);if(width<=0)return;
 const pos=(t:number)=>{const bend=Math.sin(t*Math.PI)*(v===0?len*.055:len*.12)+offset;return{x:a.x+dx*t+nx*bend,y:a.y+dy*t+ny*bend};};
 c.save();const path=(scale:number)=>{c.beginPath();for(let i=0;i<=24;i++){const t=tail+(head-tail)*i/24,p=pos(t),w=Math.sin(i/24*Math.PI)*width*scale;c.lineTo(p.x+nx*w,p.y+ny*w);}for(let i=24;i>=0;i--){const t=tail+(head-tail)*i/24,p=pos(t),w=Math.sin(i/24*Math.PI)*width*scale;c.lineTo(p.x-nx*w*.5,p.y-ny*w*.5);}c.closePath();};
 path(1.3);c.fillStyle=col.dark;c.fill();path(.68);c.fillStyle=col.color;c.fill();
 c.beginPath();for(let i=0;i<=22;i++){const p=pos(tail+(head-tail)*i/22);c.lineTo(p.x,p.y);}c.lineWidth=1;c.strokeStyle=col.light;c.stroke();c.restore();}
 private card(face:HTMLCanvasElement,p:Point,power:number,f:number,v:number,time:number,scale=1,rotation=0){const c=this.c,col=families[f];c.save();c.translate(p.x,p.y);c.rotate(rotation);
 const w=p.w*scale,h=p.h*scale;c.shadowColor=col.dark+'aa';c.shadowBlur=5;c.shadowOffsetY=5;
 if(this.material){const surface=this.material.draw(face,f,v,power,time/1000,col.color);c.drawImage(surface,-w*.92,-h*.681,w*1.84,h*1.362);}else{c.drawImage(face,-w*.62,-h*.575,w*1.24,h*1.15);}c.restore();this.drawCalls++;}
 render(beat:Beat,time:number,anchors:Record<Anchor,Point>,faces:Map<string,HTMLCanvasElement>,baseFace:HTMLCanvasElement,f:number,v:number,reduced:boolean){let k=(time-beat.at)/beat.duration;if(k<0||k>1)return; k=v===0?(k<.22?k*.54:k<.56?.119+(k-.22)*1.83:.741+(k-.56)*.589):ease(k);const a=anchors[beat.from],b=anchors[beat.to],col=families[f],c=this.c;const envelope=Math.sin(Math.PI*k);const face=faces.get(beat.card||'')||faces.get('@'+beat.from)||baseFace;
 if(reduced||!this.material){this.stamp(b,k,f,v,beat.kind,beat.count);return;}
 if(beat.kind==='awaken'){
  const lift=Math.sin(Math.PI*k)*Math.min(14,a.h*.08);
  c.save();c.translate(a.x,a.y+a.h*.47);c.scale(1,.18);c.fillStyle=col.dark+'33';c.beginPath();c.ellipse(0,0,a.w*.4*(1-envelope*.15),a.w*.34,0,0,Math.PI*2);c.fill();c.restore();
  this.card(face,{...a,y:a.y-lift},envelope*.7,f,v,time,1+envelope*.055,v===0?envelope*-.018:0);
  // A narrow engraving chases the artwork boundary, with a delayed inner hairline.
  if(envelope>.15){c.save();c.translate(a.x,a.y-lift);c.strokeStyle=col.light;c.lineWidth=.8;c.globalAlpha=envelope*.7;c.beginPath();c.moveTo(-a.w*.4,a.h*.25);c.lineTo(-a.w*.4,-a.h*.34);c.lineTo(-a.w*.1,-a.h*.40);c.stroke();c.restore();}
  return;
 }
 if(beat.kind==='echo'&&['hp','enemyHp','mana','enemyMana'].includes(beat.from)){this.ribbon(a,b,k,col,v);this.stamp(a,k,f,v,'seal');if(k>.6)this.stamp(b,(k-.6)/.4,f,v,'complete');return;}
 if(['transfer','summon','echo','shatter'].includes(beat.kind)){
  const move=ease((k-.24)/.62),same=beat.from===beat.to;const p={x:a.x+(b.x-a.x)*move,y:a.y+(b.y-a.y)*move-Math.sin(move*Math.PI)*Math.min(46,Math.abs(b.x-a.x)*.15+24),w:a.w+(b.w-a.w)*move,h:a.h+(b.h-a.h)*move};
  // The original surface is carried by the deformed mesh; the trail follows it.
  if(!same)this.ribbon(a,b,clamp((k-.12)/.88),col,v);
  let scale=1;
  if(beat.kind==='shatter')scale=1-ease((k-.32)/.68)*.97;
  else if(beat.kind==='summon')scale=.64+.36*ease(k/.65);
  else scale=1-.62*Math.sin(Math.PI*move);
  this.card(face,p,envelope*(v===0?.9:1),f,v,time,scale,Math.sin(Math.PI*k)*(v===0?-.06:.09));
  if(k>.2&&k<.8){const energy=Math.sin((k-.2)/.6*Math.PI);for(let j=0;j<3;j++){const sign=j%2?-1:1;const x=p.x+sign*p.w*scale*.39,y=p.y+(j-1)*p.h*.21;const length=p.w*energy*(v===0?.25:.16);c.save();c.fillStyle=col.dark;c.strokeStyle=col.color;c.lineWidth=1;c.beginPath();c.moveTo(x,y);if(v===0){c.lineTo(x+sign*length,y-p.h*.18*energy);c.lineTo(x+sign*length*.25,y+p.h*.055*energy);}else{c.bezierCurveTo(x+sign*length,y-p.h*.12,x+sign*length*1.3,y+p.h*.05,x,y+p.h*.18*energy);c.bezierCurveTo(x+sign*length*.7,y+p.h*.04,x+sign*length*.4,y-p.h*.06,x,y);}c.closePath();c.fill();c.stroke();c.restore();}}
  if(beat.count&&beat.count>1){for(let j=1;j<beat.count;j++){const kk=clamp(k-j*.05);const mm=ease((kk-.24)/.62);this.ribbon({...a,x:a.x+j*2},{...b,x:b.x+j*4},kk,col,v,j*3);if(kk>.15&&kk<.9)this.card(face,{...p,x:a.x+(b.x-a.x)*mm+j*4,y:a.y+(b.y-a.y)*mm-j*3},envelope*.6,f,v,time,.35,0);}}
  if(k>.7)this.stamp(b,(k-.7)/.3,f,v,beat.kind==='shatter'?'unseal':'complete');return;
 }
 if(beat.kind==='buffAtk'||beat.kind==='buffHp'){
  const color=beat.kind==='buffAtk'?'#378bf5':'#f4536e',sign=beat.kind==='buffAtk'?-1:1;const size=Math.max(8,b.w*.19),x=b.x+sign*b.w*.34,y=b.y+b.h*.2-ease(k)*b.h*.5;c.save();c.translate(x,y);c.globalAlpha=Math.sin(Math.PI*k);c.beginPath();c.moveTo(0,-size);c.lineTo(size,size*.1);c.lineTo(size*.36,size*.1);c.lineTo(size*.36,size);c.lineTo(-size*.36,size);c.lineTo(-size*.36,size*.1);c.lineTo(-size,size*.1);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#edf6ff';c.lineWidth=1;c.stroke();c.restore();return;
 }
 if(['strike','cost','heal'].includes(beat.kind)){
  this.ribbon(a,b,k,col,v);if(k<.5&&['source','ally','enemy'].includes(beat.from))this.card(baseFace,a,envelope*.5,f,v,time,1,0);
  if(k>.48)this.stamp(b,(k-.48)/.52,f,v,beat.kind);return;
 }
 if(beat.kind==='deny'){
  if(beat.from!==beat.to&&k<.5)this.ribbon(a,{...b,x:a.x+(b.x-a.x)*.4,y:a.y+(b.y-a.y)*.4},k*2,col,v);
  this.stamp(b,k,f,v,'deny');return;
 }
 if(['seal','inscribe','unseal','progress','reset','complete'].includes(beat.kind)){
  if(beat.from!==beat.to)this.ribbon(a,b,clamp(k/.72),col,v);
  const arrival=beat.from===beat.to?0:.36;
  if(k>arrival)this.stamp(b,(k-arrival)/(1-arrival),f,v,beat.kind,beat.count);
  if(beat.to==='source'||beat.to==='ally'||beat.to==='enemy')this.card(faces.get('@'+beat.to)||baseFace,b,envelope*.48,f,v,time,1,0);
  if(beat.kind==='progress'){c.save();c.fillStyle=col.light;for(let i=0;i<3;i++){if(k>(i+1)*.2)c.fillRect(b.x+(i-1)*8-2,b.y+b.h*.38,4,3);}c.restore();}
 }
 }
 dispose(){this.material?.dispose();this.canvas.remove();}
}
