import {createTransferSound} from './manaTransferSound';
import type {SummonTransferPresentation} from '../anim';
import {summonPlacement,summonTime} from './runtime';
import {STANDARD_FX} from '../animationTempo';
import {boardLens,projectedPlacement} from '../boardProjection';

type Point={x:number;y:number};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const random=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const mix=(a:number,b:number,q:number)=>a+(b-a)*q;
export const TRANSFER_MS=820;
export const CRACK_MS=1000;
const MANA_OPACITY=.52;
const TRAIL_MS=190,TRAIL_STEP_MS=12,IMPACT_SPARKS=72;
const perimeter=(t:number):Point=>{const k=((t%1)+1)%1*4,e=Math.floor(k),q=k-e;return e===0?{x:mix(.035,.965,q),y:.03}:e===1?{x:.965,y:mix(.03,.97,q)}:e===2?{x:mix(.965,.035,q),y:.97}:{x:.035,y:mix(.97,.03,q)};};
const project=(m:DOMMatrix,w:number,h:number,p:Point,z=0)=>{const v=m.transformPoint(new DOMPoint(p.x*w,p.y*h,z));return{x:v.x/v.w,y:v.y/v.w};};
function line(c:CanvasRenderingContext2D,a:Point,b:Point,width:number,color:string,alpha:number){if(alpha<=0)return;c.globalAlpha=alpha;c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}

/** Local mana departure and arrival, following the adopted shelf-return spatial transfer. */
export function createFrameTransfer(report:(phase:string,detail?:object)=>void=()=>{},reviewTime:()=>number|undefined=()=>undefined):SummonTransferPresentation{
 const sound=createTransferSound();
 let canvas:HTMLCanvasElement|undefined,ground:HTMLCanvasElement|undefined,frame=0,groundFrame=0,abortTransfer:(()=>void)|undefined,restoreOpacity:(()=>void)|undefined,paintLanding:((ms:number)=>void)|undefined,contactMs:number|undefined;
 const ensure=(isGround=false)=>{const old=isGround?ground:canvas;old?.remove();const node=document.createElement('canvas');node.className='mana-frame-transfer';node.setAttribute('aria-hidden','true');node.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136';const dpr=Math.min(devicePixelRatio,2);node.width=Math.ceil(innerWidth*dpr);node.height=Math.ceil(innerHeight*dpr);node.style.width=innerWidth+'px';node.style.height=innerHeight+'px';document.body.append(node);if(isGround)ground=node;else canvas=node;const c=node.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.lineCap='round';c.lineJoin='round';return c;};
 const clear=()=>{cancelAnimationFrame(frame);canvas?.remove();canvas=undefined;};
 const clearGround=()=>{cancelAnimationFrame(groundFrame);ground?.remove();ground=undefined;};
 const retainOpacity=(face:HTMLElement)=>{
  if(restoreOpacity)return;
  const keys=['opacity','mask-image','-webkit-mask-image','clip-path'],saved=keys.map(k=>[k,face.style.getPropertyValue(k),face.style.getPropertyPriority(k)]);
  restoreOpacity=()=>{for(const [key,value,priority]of saved){if(value)face.style.setProperty(key,value,priority);else face.style.removeProperty(key);}restoreOpacity=undefined;};
 };
 const dispose=()=>{sound.stop();paintLanding=undefined;arrivalTrace=undefined;abortTransfer?.();clear();clearGround();restoreOpacity?.();surface.width=surface.height=1;};
 const framePoints=(m:DOMMatrix,w:number,h:number)=>[{x:.06,y:.03},{x:.94,y:.03},{x:.965,y:.055},{x:.965,y:.945},{x:.94,y:.97},{x:.06,y:.97},{x:.035,y:.945},{x:.035,y:.055}].map(p=>project(m,w,h,p));
 const outline=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number)=>{
  const points=framePoints(m,w,h);c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();return points;
 };
 // Soft density replaces the hard diagonal reflection of the previous plate.
 const surface=document.createElement('canvas');
 const haze=document.createElement('canvas');haze.width=128;haze.height=192;
 const hc=haze.getContext('2d')!,pixels=hc.createImageData(128,192);
 for(let y=0;y<192;y++)for(let x=0;x<128;x++){
  const u=x/127,v=y/191,cloud=(Math.sin(u*8+Math.sin(v*6))*Math.sin(v*7-u*3)+Math.sin(u*17+v*12)*.18)*.5;
  const core=Math.exp(-((u-.48)**2*6+(v-.44)**2*4)),light=clamp(.27+core*.56+cloud*.17),i=(y*128+x)*4;
  pixels.data[i]=mix(78,211,light);pixels.data[i+1]=mix(155,234,light);pixels.data[i+2]=255;pixels.data[i+3]=255;
 }hc.putImageData(pixels,0,0);
 const rim=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,alpha:number)=>{
  if(alpha<=0)return;c.save();const points=outline(c,m,w,h),weight=Math.max(.4,Math.min(1,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/230));
  c.globalAlpha=alpha*.4;c.lineWidth=8*weight;c.shadowColor='#79c9ff';c.shadowBlur=25*weight;c.strokeStyle='#89cfff';c.stroke();c.globalAlpha=alpha*.72;c.shadowBlur=8*weight;c.lineWidth=2.2*weight;c.strokeStyle='#e1f6ff';c.stroke();c.restore();
 };
 const filledMana=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,alpha:number,t:number)=>{
  if(alpha<=0)return;c.save();outline(c,m,w,h);c.clip();
  const a=project(m,w,h,{x:0,y:0}),b=project(m,w,h,{x:1,y:0}),d=project(m,w,h,{x:0,y:1});
  c.transform((b.x-a.x)/128,(b.y-a.y)/128,(d.x-a.x)/192,(d.y-a.y)/192,a.x,a.y);
  c.globalAlpha=alpha*MANA_OPACITY;c.drawImage(haze,0,0);
  const glow=c.createRadialGradient(61+Math.sin(t*3)*5,89,2,64,96,105);glow.addColorStop(0,'#f0fbff55');glow.addColorStop(.55,'#c3edff20');glow.addColorStop(1,'#b6e6ff00');c.fillStyle=glow;c.fillRect(0,0,128,192);c.restore();
 };
 // Sample historical poses on a fixed clock: dense full-card impressions,
 // independent of frame rate, with no changes to the card's movement or easing.
 let arrivalTrace:((ms:number)=>Point[])|undefined;
 const afterimages=(c:CanvasRenderingContext2D,now:number,landingTrace?:(ms:number)=>Point[])=>{
  const poseAt=(ms:number)=>ms<TRANSFER_MS?arrivalTrace?.(ms):landingTrace?.((ms-TRANSFER_MS)/STANDARD_FX.durationScale);
  const lastBirth=Math.min(now,TRANSFER_MS+STANDARD_FX.milliseconds(760)),samples:Array<{born:number;age:number;alpha:number;points:Point[]}>=[];
  for(let born=Math.ceil(Math.max(600,now-TRAIL_MS)/TRAIL_STEP_MS)*TRAIL_STEP_MS;born<=lastBirth;born+=TRAIL_STEP_MS){
   const points=poseAt(born),previous=poseAt(born-TRAIL_STEP_MS);if(!points||!previous)continue;
   const movement=Math.max(...points.map((p,i)=>Math.hypot(p.x-previous[i].x,p.y-previous[i].y)));
   if(movement<.12)continue; // A stationary card must not build up stacked light.
   const age=now-born,alpha=.30*ease(0,12,age)*(1-age/TRAIL_MS)**2*Math.min(1,movement/.65);if(alpha<.001)continue;
   samples.push({born,age,alpha,points});
   const unit=Math.max(.5,Math.min(1.1,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/100));
   c.save();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
   c.globalAlpha=alpha*.10;c.fillStyle='#9bd7ff';c.fill();
   c.globalAlpha=alpha*.42;c.lineWidth=5*unit;c.strokeStyle='#54b2f4';c.stroke();
   c.globalAlpha=alpha;c.lineWidth=1.25*unit;c.strokeStyle='#b9e7ff';c.stroke();c.restore();
  }
  if(canvas){canvas.dataset.trailCount=String(samples.length);canvas.dataset.trailLifeMs=String(TRAIL_MS);canvas.dataset.trailSamples=JSON.stringify(samples);}
 };
 const sparkStroke=(c:CanvasRenderingContext2D,tip:Point,end:Point,alpha:number,size=1)=>{
  line(c,end,tip,6*size,'#52b8ff',alpha*.26);line(c,end,tip,2.2*size,'#a6e2ff',alpha*.9);line(c,end,tip,1.05*size,'#f0fcff',alpha);
 };
 const spatialSparks=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,ms:number,mode:'ambient'|'depart'|'arrive')=>{
  let count=0;const total=mode==='ambient'?70:110;
  const left=project(m,w,h,{x:0,y:.5}),right=project(m,w,h,{x:1,y:.5}),unit=Math.hypot(right.x-left.x,right.y-left.y),scale=Math.max(.55,Math.min(1.4,unit/180));
  for(let i=0;i<total;i++){
   const born=mode==='ambient'?35+random(i+850)*270:random(i+20)*200,age=ms-born,life=80+random(i+70)*130;if(age<0||age>life)continue;count++;
   const point=perimeter(random(i+6)),base=project(m,w,h,point),q=age/life;
   const angle=Math.atan2(point.y-.5,point.x-.5)+(mode==='ambient'?0:Math.PI)+(random(i+2)-.5)*.7;
   const distance=(mode==='ambient'?8+random(i+8)*22:13+random(i+8)*34)*scale*q,tail=(3+random(i+19)*7)*scale*(1-q);
   const tip={x:base.x+Math.cos(angle)*distance,y:base.y+Math.sin(angle)*distance+8*q*q*scale},end={x:tip.x-Math.cos(angle)*tail,y:tip.y-Math.sin(angle)*tail};
   sparkStroke(c,tip,end,(1-q)**1.3,mode==='ambient'?.7:.85);
  }c.globalAlpha=1;return count;
 };
 // Card-local Z is perpendicular to its printed face. X/Y never translate.
 // The material bows through a portal parallel to its back, not an edge slit.
 const normalDepth=(m:DOMMatrix,w:number,h:number)=>{const a=project(m,w,h,{x:0,y:.5}),b=project(m,w,h,{x:1,y:.5});return Math.hypot(b.x-a.x,b.y-a.y)*1.65;};
 const portalPlane=(m:DOMMatrix,w:number,h:number,arrival:boolean)=>m.translate(0,0,normalDepth(m,w,h)*(arrival?.75:-.8));
 type Vertex={u:number;v:number;z:number};
 const portalSurface=(target:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,t:number,q:number,arrival:boolean,alpha:number)=>{
  if((!arrival&&q===0)||(arrival&&q===1)){filledMana(target,m,w,h,alpha,t);rim(target,m,w,h,alpha);return;}
  const depth=normalDepth(m,w,h),gateZ=depth*(arrival?.75:-.8),bow=Math.sin(q*Math.PI)*depth*.26;
  const local=(u:number,v:number):Vertex=>({u,v,z:depth*(arrival?1-q:-q)-bow*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)});
  const position=(v:Vertex)=>project(m,w,h,{x:.035+v.u*.93,y:.03+v.v*.94},v.z);
  const centerVertex=local(.5,.5),center=position(centerVertex),reference=project(m,w,h,{x:.5,y:.5});
  canvas!.dataset[arrival?'arrivalGeometry':'departureGeometry']=JSON.stringify({center,reference,centerZ:centerVertex.z,edgeZ:local(0,.5).z,gateZ,axis:[0,0,-1]});
  if(surface.width!==canvas!.width||surface.height!==canvas!.height){surface.width=canvas!.width;surface.height=canvas!.height;}
  const c=surface.getContext('2d')!,dpr=surface.width/innerWidth;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
  const seams:Array<[Point,Point]>=[];
  const inside=(v:Vertex)=>arrival?v.z<=gateZ:v.z>=gateZ;
  const intersect=(a:Vertex,b:Vertex):Vertex=>{const k=(gateZ-a.z)/(b.z-a.z);return{u:mix(a.u,b.u,k),v:mix(a.v,b.v,k),z:gateZ};};
  const triangle=(vertices:Vertex[])=>{
   const polygon:Vertex[]=[],crossings:Vertex[]=[];
   for(let i=0;i<3;i++){const a=vertices[i],b=vertices[(i+1)%3],aIn=inside(a),bIn=inside(b);if(aIn)polygon.push(a);if(aIn!==bIn){const hit=intersect(a,b);polygon.push(hit);crossings.push(hit);}}
   if(crossings.length===2)seams.push([position(crossings[0]),position(crossings[1])]);
   for(let i=1;i<polygon.length-1;i++){
    const [a,b,d]=[polygon[0],polygon[i],polygon[i+1]],pa=position(a),pb=position(b),pd=position(d);
    const ux=(b.u-a.u)*128,uy=(b.v-a.v)*192,vx=(d.u-a.u)*128,vy=(d.v-a.v)*192,det=ux*vy-uy*vx;if(Math.abs(det)<.001)continue;
    const ax=((pb.x-pa.x)*vy-(pd.x-pa.x)*uy)/det,ay=((pb.y-pa.y)*vy-(pd.y-pa.y)*uy)/det,bx=((pd.x-pa.x)*ux-(pb.x-pa.x)*vx)/det,by=((pd.y-pa.y)*ux-(pb.y-pa.y)*vx)/det;
    const cx=(pa.x+pb.x+pd.x)/3,cy=(pa.y+pb.y+pd.y)/3;
    c.save();c.beginPath();[pa,pb,pd].forEach((p,j)=>{const length=Math.hypot(p.x-cx,p.y-cy)||1,x=p.x+(p.x-cx)/length*.45,y=p.y+(p.y-cy)/length*.45;if(j)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();c.clip();
    c.transform(ax,ay,bx,by,pa.x-ax*a.u*128-bx*a.v*192,pa.y-ay*a.u*128-by*a.v*192);c.drawImage(haze,0,0);c.restore();
   }
  };
  const cols=12,rows=18;
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=local(i/cols,j/rows),b=local((i+1)/cols,j/rows),d=local(i/cols,(j+1)/rows),e=local((i+1)/cols,(j+1)/rows);triangle([a,b,d]);triangle([b,e,d]);}
  target.save();target.globalAlpha=alpha*MANA_OPACITY;target.drawImage(surface,0,0,innerWidth,innerHeight);target.restore();
  // Only the actual intersection with the portal lights up; no independent wipe.
  for(const [a,b]of seams){line(target,a,b,5,'#66bfff',alpha*.32);line(target,a,b,1.2,'#e6f8ff',alpha*.85);}
  for(let i=0;i<100;i++){const p=perimeter(i/100),r=perimeter((i+1)/100),a=local((p.x-.035)/.93,(p.y-.03)/.94),b=local((r.x-.035)/.93,(r.y-.03)/.94);if(inside(a)&&inside(b)){line(target,position(a),position(b),3,'#78c8ff',alpha*.35);line(target,position(a),position(b),1,'#e4f7ff',alpha*.7);}}
  target.globalAlpha=1;
 };
 const gate=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,t:number,power:number)=>{
  if(power<=0)return;
  const center=project(m,w,h,{x:.5,y:.5}),left=project(m,w,h,{x:0,y:.5}),unit=Math.max(.4,Math.min(1.3,Math.abs(center.x-left.x)/120));
  c.save();outline(c,m,w,h);
  const wash=c.createRadialGradient(center.x,center.y,0,center.x,center.y,150*unit);wash.addColorStop(0,'#0f295900');wash.addColorStop(.65,'#246bbb1c');wash.addColorStop(1,'#94d8ff40');c.globalAlpha=power;c.fillStyle=wash;c.fill();
  c.globalAlpha=power*.35;c.lineWidth=12*unit;c.strokeStyle='#4b9de6';c.shadowColor='#57b8ff';c.shadowBlur=18*unit;c.stroke();
  c.globalAlpha=power*.65;c.lineWidth=2*unit;c.shadowBlur=5*unit;c.strokeStyle='#c0eaff';c.stroke();
  // Broken subpixel glints follow the aperture, with no symbols or ornaments.
  for(let i=0;i<40;i++){const p=perimeter(i/40),b=perimeter((i+.35)/40),strength=.25+.35*Math.sin(t*15+i*2.7)**2;line(c,project(m,w,h,p),project(m,w,h,b),.8*unit,'#f2fbff',power*strength);}
  c.restore();
 };
 const revealRadius=(ms:number)=>ease(220,790,ms)*.62;
 const contactBurst=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,age:number)=>{
  if(age<0)return 0;let count=0;
  const left=project(m,w,h,{x:0,y:.5}),right=project(m,w,h,{x:1,y:.5}),unit=Math.hypot(right.x-left.x,right.y-left.y);
  for(let i=0;i<IMPACT_SPARKS;i++){
   const elapsed=age,life=150+random(i+912)*80;if(elapsed<0||elapsed>life)continue;count++;
   const p=perimeter(i/IMPACT_SPARKS),a=Math.atan2(p.y-.5,p.x-.5)+(random(i+14)-.5)*.14,q=Math.min(1,(elapsed+45)/(life+45)),base=project(m,w,h,p),distance=unit*(.15+random(i+93)*.48)*(1-(1-q)**2),up=Math.sin(q*Math.PI)*unit*(.05+random(i+38)*.10);
   const tip={x:base.x+Math.cos(a)*distance,y:base.y+Math.sin(a)*distance*.65-up},tail=(2+random(i+61)*5)*(1-q);
   sparkStroke(c,tip,{x:tip.x-Math.cos(a)*tail,y:tip.y-Math.sin(a)*tail*.65},(1-q)**1.25*.72,.66);
  }c.globalAlpha=1;return count;
 };
 const front=(angle:number,r:number):Point=>{const edge=1+.024*Math.sin(angle*17)+.018*Math.sin(angle*31+1.7);return{x:.5+Math.cos(angle)*r*edge,y:.5+Math.sin(angle)*r*edge};};
 const sparks=(c:CanvasRenderingContext2D,m:DOMMatrix,w:number,h:number,ms:number)=>{
  let count=0;
  // Birth positions sit on the moving material boundary, not a decorative ring.
  for(let i=0;i<180;i++){
   const born=225+random(i+120)*555,age=ms-born,life=85+random(i+450)*125;
   if(age<0||age>life)continue;
   const angle=random(i+9)*Math.PI*2,r=revealRadius(born),{x,y}=front(angle,r);
   if(x<.025||x>.975||y<.02||y>.98)continue;count++;
   const base=project(m,w,h,{x,y}),out=project(m,w,h,{x:x+Math.cos(angle)*.1,y:y+Math.sin(angle)*.1}),len=Math.hypot(out.x-base.x,out.y-base.y)||1,ux=(out.x-base.x)/len,uy=(out.y-base.y)/len;
   const q=age/life,speed=(12+random(i+66)*26)*Math.max(.5,w/100),distance=speed*q,gravity=10*q*q,tail=(3+random(i+51)*9)*(1-q),alpha=(1-q)**1.3*.8;
   const tip={x:base.x+ux*distance,y:base.y+uy*distance+gravity},end={x:tip.x-ux*tail,y:tip.y-uy*tail};
   sparkStroke(c,tip,end,alpha,.72);if(i%6===0)line(c,tip,{x:tip.x+.5,y:tip.y+.5},1.7,'#ffffff',alpha);
  }
  c.globalAlpha=1;return count;
 };

 return{
  dispose,
  async transfer(flight,face,signal){
   const c=ensure(),saved=flight.style.cssText,w=flight.offsetWidth,h=flight.offsetHeight,r=flight.getBoundingClientRect();
   const source=new DOMMatrix().translate(r.left,r.top).scale(r.width/w,r.height/h),destination=summonPlacement(face,w,h,0,false);
   const a=project(source,w,h,{x:.5,y:.5});
   const arrivalDepth=normalDepth(destination,w,h);
   arrivalTrace=ms=>framePoints(destination.translate(0,0,arrivalDepth*(1-ease(510,760,ms))),w,h);
   const outer=(t:number)=>{
    // Break before the outer frame reaches its former full expansion. Dust is
    // subpixel, short lived and local; none of it becomes a travelling orb.
    const scaleAt=(time:number)=>mix(1.08,1.46,ease(.04,.34,time)),groups=Array.from({length:6},()=>[] as Array<[Point,Point]>);
    const matrix=source.translate(w/2,h/2).scale(scaleAt(t)).translate(-w/2,-h/2);
    for(let i=0;i<180;i++){
     const born=.105+random(i+2)*.055,alpha=ease(.025,.075,t)*(1-ease(born,born+.045,t));
     if(alpha>.01)groups[Math.min(5,Math.floor(alpha*6))].push([project(matrix,w,h,perimeter(i/180)),project(matrix,w,h,perimeter((i+1)/180))]);
    }
    c.save();c.lineCap='butt';groups.forEach((segments,i)=>{if(!segments.length)return;c.beginPath();for(const [p,q]of segments){c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.globalAlpha=(i+1)/6;c.shadowColor='#189fee';c.shadowBlur=14;c.lineWidth=6;c.strokeStyle='#32baff';c.stroke();c.shadowBlur=3;c.lineWidth=1.8;c.strokeStyle='#e3fbff';c.stroke();});c.restore();
    let count=0;
    for(let i=0;i<420;i++){
     const born=.105+random(Math.floor(i*180/420)+2)*.055,age=t-born,life=.09+random(i+70)*.055;
     if(age<0||age>life)continue;count++;
     const p=perimeter(i/420),m=source.translate(w/2,h/2).scale(scaleAt(born)).translate(-w/2,-h/2),start=project(m,w,h,p),length=Math.hypot(start.x-a.x,start.y-a.y)||1,s=age/life,distance=(4+random(i+10)*19)*s;
     const x=start.x+(start.x-a.x)/length*distance+(random(i+31)-.5)*s*7,y=start.y+(start.y-a.y)/length*distance+(random(i+49)-.5)*s*7,size=.32+random(i+1)*.47;
     c.globalAlpha=(1-s)**1.4;c.fillStyle=i%3?'#bcefff':'#55bcf7';c.fillRect(x,y,size,size);
    }
    canvas!.dataset.outerDustCount=String(count);c.globalAlpha=1;
   };
   flight.style.transition='none';flight.style.left=flight.style.top='0';flight.style.transformOrigin='0 0';
   const start=performance.now();let complete=false;
   try{return await new Promise<boolean>(resolve=>{
    const finish=(ok=false)=>{if(!ok)sound.stop();cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',hidden);abortTransfer=undefined;complete=ok;resolve(ok);};
    const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();};abortTransfer=abort;signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort,{once:true});document.addEventListener('visibilitychange',hidden);
    const tick=()=>{
     if(signal.aborted||document.hidden||!face.isConnected||!flight.isConnected){finish();return;}
     const ms=Math.min(TRANSFER_MS,reviewTime()??performance.now()-start),t=ms/1000;
     const departure=ease(.21,.44,t),arrival=ease(.51,.76,t),body=ease(.01,.095,t);
     sound.advance(ms,reviewTime()===undefined);
     canvas!.dataset.time=String(ms);canvas!.dataset.phase=t<.21?'luminous-mana':t<.44?'local-departure':t<.51?'hidden-jump':'local-arrival';canvas!.dataset.orbCount='0';
     canvas!.dataset.sourceVisible=String(departure<1);canvas!.dataset.destinationVisible=String(arrival>0);
     report(t<.21?'青白いマナと火花':t<.44?'中央で光の縁へ消失':t<.51?'空間転移': '召喚先でマナが再形成',{transferMs:ms});c.clearRect(0,0,innerWidth,innerHeight);
     flight.style.transform=(t<.30?source:destination).toString();flight.style.opacity=String(1-ease(.015,.13,t));outer(t);
     canvas!.dataset.portalModel='card-normal-portal';canvas!.dataset.travelAxis='card-negative-z';
     // The centered reveal has its own camera-facing plane. Perspective is
     // centered on that card, so moving along -Z cannot slide it up the screen.
     const lens=new DOMMatrix();lens.m34=-1/boardLens().focal;
     const departurePlane=new DOMMatrix().translate(a.x,a.y).multiply(lens).translate(-a.x,-a.y).multiply(source);
     const sourcePortal=portalPlane(departurePlane,w,h,false),arrivalPortal=portalPlane(destination,w,h,true);
     const sourcePower=ease(.13,.21,t)*(1-ease(.42,.49,t)),arrivalPower=ease(.49,.55,t)*(1-ease(.76,.82,t));
     afterimages(c,ms);
     gate(c,sourcePortal,w,h,t,sourcePower);
     if(departure<1)portalSurface(c,departurePlane,w,h,t,departure,false,body);
     let emitted=spatialSparks(c,source,w,h,ms,'ambient')+spatialSparks(c,sourcePortal,w,h,ms-210,'depart');
     if(arrival>0){portalSurface(c,destination,w,h,t,arrival,true,1);emitted+=spatialSparks(c,arrivalPortal,w,h,ms-510,'arrive');}
     gate(c,arrivalPortal,w,h,t,arrivalPower);
     canvas!.dataset.sparkCount=String(emitted);
     if(ms===TRANSFER_MS){retainOpacity(face);face.style.opacity='0';finish(true);return;}frame=requestAnimationFrame(tick);
    };tick();
   });}finally{
    flight.style.cssText=saved;if(complete){flight.style.transition='none';flight.style.left=flight.style.top='0';flight.style.transformOrigin='0 0';flight.style.transform=destination.toString();flight.style.opacity='0';}
    if(!complete)clear();
   }
  },
  landing(face){
   retainOpacity(face);face.style.opacity='0';cancelAnimationFrame(frame);
   const c=canvas?.getContext('2d')??ensure(),w=face.offsetWidth,h=face.offsetHeight,start=performance.now();
   canvas!.className='mana-landing-light';report('中央から火花とともに具現化');
   paintLanding=(ms:number)=>{
    if(!canvas)return;
    const hit=contactMs!==undefined,pose=summonPlacement(face,w,h,ms,false),radius=hit?.76:revealRadius(ms),progress=hit?1:radius/Math.SQRT1_2;
    c.clearRect(0,0,innerWidth,innerHeight);canvas.dataset.landingMs=String(ms);canvas.dataset.revealProgress=String(progress);canvas.dataset.orbCount='0';canvas.dataset.manaRemaining=hit?'0':'1';
    afterimages(c,TRANSFER_MS+STANDARD_FX.milliseconds(ms),time=>framePoints(summonPlacement(face,w,h,time,false),w,h));
    face.style.opacity='1';face.style.clipPath=hit?'none':`polygon(${Array.from({length:128},(_,j)=>{const p=front(j/128*Math.PI*2,radius);return `${p.x*100}% ${p.y*100}%`;}).join(',')})`;
    if(!hit){
     c.save();outline(c,pose,w,h);
     if(radius>0){for(let j=0;j<=128;j++){const angle=j/128*Math.PI*2,p=project(pose,w,h,front(angle,radius));if(j)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.closePath();}
     c.clip('evenodd');filledMana(c,pose,w,h,1,ms/1000);rim(c,pose,w,h,1);c.restore();
     if(ms>220){for(let j=0;j<160;j++){const angle=j/160*Math.PI*2,next=(j+1)/160*Math.PI*2,{x,y}=front(angle,radius);if(x<.035||x>.965||y<.03||y>.97)continue;
      const p=project(pose,w,h,{x,y}),end=project(pose,w,h,front(next,radius)),alpha=.35+.65*random(j+Math.floor(ms/35));line(c,p,end,4,'#65bdff',alpha*.45);line(c,p,end,1.35,'#effbff',alpha);
     }}
    }
    const burst=hit?contactBurst(c,pose,w,h,ms-contactMs!):0;
    canvas.dataset.impactBurstCount=String(burst);canvas.dataset.burstLeadMs='45';canvas.dataset.sparkCount=String(sparks(c,pose,w,h,ms)+spatialSparks(c,portalPlane(summonPlacement(face,w,h,0,false),w,h,true),w,h,ms+310,'arrive')+burst);
   };
   const tick=()=>{
    if(!face.isConnected||document.hidden){paintLanding=undefined;clear();restoreOpacity?.();return;}
    const ms=summonTime(face);
    if(ms>=1160||performance.now()-start>3000){paintLanding=undefined;clear();restoreOpacity?.();return;}
    paintLanding?.(ms);frame=requestAnimationFrame(tick);
   };tick();
  },
  impact(face){
   if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
   // Execute in the native impact callback, in the same paint as its dust.
   contactMs=summonTime(face)||790;
   paintLanding?.(contactMs);sound.impact(reviewTime()===undefined);if(canvas)canvas.dataset.contactMs=String(contactMs);
   const c=ensure(true);ground!.className='mana-ground-cracks';ground!.style.zIndex='134';ground!.dataset.contactMs=String(contactMs);
   const w=face.offsetWidth,h=face.offsetHeight,base=projectedPlacement(face,w,h),start=performance.now();
   const branches:Array<Point[]>=[];
   // Irregular fractures originate beneath the print and branch across the table.
   for(let i=0;i<9;i++){
    const angle=(i/9)*Math.PI*2+.15*random(i+90),length=.88+random(i+32)*.50,path:Point[]=[];
    for(let j=0;j<6;j++){const d=j/5*length,a=angle+(random(i*17+j+1)-.5)*.32;path.push({x:.5+Math.cos(a)*d,y:.5+Math.sin(a)*d*w/h});}
    branches.push(path);
    const p=path[3],a=angle+(i%2?-.65:.7);branches.push([p,{x:p.x+Math.cos(a)*.16,y:p.y+Math.sin(a)*.16*w/h},{x:p.x+Math.cos(a+.18)*.30,y:p.y+Math.sin(a+.18)*.30*w/h}]);
   }
   const tick=()=>{
    if(!face.isConnected||document.hidden){clearGround();return;}
    const ms=performance.now()-start;if(ms>=CRACK_MS){clearGround();report('ヒビ消失・定着',{crackMs:CRACK_MS});return;}
    ground!.dataset.age=String(ms);report('接地・ヒビがゆっくり消える',{crackMs:ms});
    const alpha=(1-ease(20,CRACK_MS,ms))*.72,grow=ease(0,42,ms);c.clearRect(0,0,innerWidth,innerHeight);c.save();
    c.beginPath();c.rect(0,0,innerWidth,innerHeight);
    for(const n of document.querySelectorAll<HTMLElement>('.zone-mon .card')){const r=n.getBoundingClientRect();c.rect(r.left-1,r.top-1,r.width+2,r.height+2);}c.clip('evenodd');
    for(let i=0;i<branches.length;i++){
     const points=branches[i].map(p=>project(base,w,h,p));
     for(let j=1;j<points.length;j++){
      const p=points[j-1],end=points[j],q=clamp(grow*(points.length-1)-(j-1)),b={x:mix(p.x,end.x,q),y:mix(p.y,end.y,q)},width=(i%2?.7:1.7)*(1-j/points.length*.55);
      line(c,{x:p.x+.7,y:p.y+.9},{x:b.x+.7,y:b.y+.9},width,'#f0f0e1',alpha*.65);
      line(c,p,b,width,'#25303b',alpha);
      line(c,p,b,width*2.8,'#6cb8e4',alpha*.22*(1-ease(30,180,ms)));
     }
    }
    c.restore();c.globalAlpha=1;groundFrame=requestAnimationFrame(tick);
   };tick();
  }
 };
}
