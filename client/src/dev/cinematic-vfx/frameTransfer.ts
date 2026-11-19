import type {SummonTransferPresentation} from '../../ui/anim';
import {summonPlacement} from '../../ui/summon/runtime';
import {projectedPlacement} from '../../ui/boardProjection';

type Point={x:number;y:number};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const random=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const mix=(a:number,b:number,q:number)=>a+(b-a)*q;
export const TRANSFER_MS=820;
export const CRACK_MS=1000;
const perimeter=(t:number):Point=>{const k=((t%1)+1)%1*4,e=Math.floor(k),q=k-e;return e===0?{x:mix(.035,.965,q),y:.03}:e===1?{x:.965,y:mix(.03,.97,q)}:e===2?{x:mix(.965,.035,q),y:.97}:{x:.035,y:mix(.97,.03,q)};};
const project=(m:DOMMatrix,w:number,h:number,p:Point)=>{const v=m.transformPoint(new DOMPoint(p.x*w,p.y*h));return{x:v.x/v.w,y:v.y/v.w};};
function line(c:CanvasRenderingContext2D,a:Point,b:Point,width:number,color:string,alpha:number){if(alpha<=0)return;c.globalAlpha=alpha;c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}

/** This owns only the gap between the actual focusCard and actual slate landing.
 * Both printed faces, timings and the landing motion remain owned by anim.ts. */
export function createFrameTransfer(report:(phase:string,detail?:object)=>void,reviewTime:()=>number|undefined=()=>undefined):SummonTransferPresentation{
 let canvas:HTMLCanvasElement|undefined,frame=0,abortTransfer:(()=>void)|undefined;
 const sprite=document.createElement('canvas');sprite.width=sprite.height=64;
 const sc=sprite.getContext('2d')!,glow=sc.createRadialGradient(32,32,0,32,32,32);
 glow.addColorStop(0,'#f2fbff');glow.addColorStop(.10,'#cff4ff');glow.addColorStop(.23,'#69c9ffcc');glow.addColorStop(.5,'#268ee545');glow.addColorStop(1,'#1466cb00');sc.fillStyle=glow;sc.fillRect(0,0,64,64);
 const ensure=()=>{canvas?.remove();canvas=document.createElement('canvas');canvas.className='mana-frame-transfer';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136';const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.ceil(innerWidth*dpr);canvas.height=Math.ceil(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';document.body.append(canvas);const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.lineCap='round';c.lineJoin='round';return c;};
 const clear=()=>{cancelAnimationFrame(frame);canvas?.remove();canvas=undefined;};
 const dispose=()=>{abortTransfer?.();clear();};
 return{
  dispose,
  async transfer(flight,face,signal){
   const c=ensure(),saved=flight.style.cssText,w=flight.offsetWidth,h=flight.offsetHeight,r=flight.getBoundingClientRect();
   const source=new DOMMatrix().translate(r.left,r.top).scale(r.width/w,r.height/h);
   const destination=summonPlacement(face,w,h,0,false);
   flight.style.transition='none';flight.style.left=flight.style.top='0';flight.style.transformOrigin='0 0';
   const start=performance.now();let complete=false;
   const particles=Array.from({length:336},(_,i)=>({p:i<216?perimeter(i/216):{x:.09+random(i+4)*.82,y:.07+random(i+12)*.86},delay:random(i+3)*.075,flight:.22+random(i+10)*.05,size:.9+random(i+32)*1.6,spread:random(i+82)-.5}));
   const contracted=source.translate(w/2,h/2).scale(.78).translate(-w/2,-h/2);
   const path=(i:number,t:number)=>{
    const p=particles[i],a=project(contracted,w,h,p.p),b=project(destination,w,h,p.p),q=clamp((t-.24-p.delay)/p.flight),u=q*q*(3-2*q),fan=Math.sin(q*Math.PI);
    return{x:mix(a.x,b.x,u)+p.spread*r.width*.18*fan,y:mix(a.y,b.y,u)-r.width*(.10+.07*random(i+15))*fan,q};
   };
   const rim=(m:DOMMatrix,alpha:number,broken:boolean,t:number)=>{
    // A continuous luminous edge, with its body wider than the fine moving core.
    // At the destination individual pieces join only as their particles arrive.
    const points=Array.from({length:109},(_,i)=>project(m,w,h,perimeter(i/108)));
    if(broken&&t<.23){
     c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
     for(const [width,color,strength,blur]of [[10,'#168de5',.9,25],[5,'#65d7ff',1,11],[1.8,'#edfcff',1,2]] as const){c.lineWidth=width;c.strokeStyle=color;c.shadowColor='#168ded';c.shadowBlur=blur;c.globalAlpha=alpha*strength;c.stroke();}c.shadowBlur=0;
    }else{
     // Batch equal-brightness fragments: a few soft light passes instead of
     // one expensive blur for each tiny perimeter segment.
     const bands=Array.from({length:8},()=>[] as Array<[Point,Point]>);
     for(let i=0;i<108;i++){
      const p=particles[i*2],arrival=.24+p.delay+p.flight;
      const life=broken?1-ease(.23+p.delay,.29+p.delay,t):ease(arrival-.035,arrival+.055,t);
      const strength=alpha*life*(.8+.2*Math.sin(i*.19-t*12)**2);
      if(strength>.005)bands[Math.min(7,Math.floor(strength*8))].push([points[i],points[i+1]]);
     }
     c.lineCap='butt';
     bands.forEach((segments,index)=>{
      if(!segments.length)return;c.beginPath();for(const [a,b]of segments){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}
      c.shadowColor='#168ded';c.shadowBlur=9;c.lineWidth=4.8;c.strokeStyle='#25b3fa';c.globalAlpha=(index+1)/8*.9;c.stroke();
      c.shadowBlur=2;c.lineWidth=1.5;c.strokeStyle='#e2faff';c.globalAlpha=(index+1)/8;c.stroke();
     });c.shadowBlur=0;
    }
    c.lineCap='round';
   };
   const filledMana=(m:DOMMatrix,alpha:number,heat:number,t:number)=>{
    if(alpha<=0)return;
    const corners=[0,.25,.5,.75].map(q=>project(m,w,h,perimeter(q))),center=project(m,w,h,{x:.5,y:.5});
    const ww=Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y);
    c.save();c.beginPath();corners.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
    const tone=c.createLinearGradient(corners[0].x,corners[0].y,corners[2].x,corners[2].y);
    tone.addColorStop(0,'#137ac1');tone.addColorStop(.42,'#74dcfa');tone.addColorStop(.64,'#a9efff');tone.addColorStop(1,'#1166b5');
    c.globalAlpha=alpha*.94;c.fillStyle=tone;c.fillRect(0,0,innerWidth,innerHeight);
    // Moving broad filaments give the filled face internal flow, rather than an empty border.
    for(let i=0;i<7;i++){
     const points=Array.from({length:25},(_,j)=>{const q=j/24;return project(m,w,h,{x:q,y:.13+i*.12+Math.sin(q*4.5+t*8+i*.8)*(.035+.04*heat)});});
     c.beginPath();points.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=i%2?'#b9f3ff':'#1686d7';c.lineWidth=ww*(i%2?.016:.032);c.globalAlpha=alpha*(i%2?.30:.20);c.stroke();
    }
    c.globalAlpha=alpha*(.42+.55*heat);c.drawImage(sprite,center.x-ww*.85,center.y-ww*1.05,ww*1.7,ww*2.1);c.restore();
   };
   const outerFrame=(t:number)=>{
    const q=ease(.04,.34,t),scale=mix(1.08,1.46,q),alpha=ease(.025,.075,t)*(1-ease(.10,.34,t));
    if(alpha<=0)return;
    const m=source.translate(w/2,h/2).scale(scale).translate(-w/2,-h/2),points=[0,.25,.5,.75].map(q=>project(m,w,h,perimeter(q)));
    c.save();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
    c.shadowColor='#189fee';c.shadowBlur=20;c.strokeStyle='#32baff';c.lineWidth=7;c.globalAlpha=alpha*.8;c.stroke();c.shadowBlur=5;c.strokeStyle='#d1f7ff';c.lineWidth=2.2;c.globalAlpha=alpha*.9;c.stroke();c.restore();
   };
   try{return await new Promise<boolean>(resolve=>{
    const finish=(ok=false)=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',hidden);abortTransfer=undefined;complete=ok;resolve(ok);};
    const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();};abortTransfer=abort;
    signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort,{once:true});document.addEventListener('visibilitychange',hidden);
    const tick=()=>{
     if(signal.aborted||document.hidden||!face.isConnected||!flight.isConnected){finish();return;}
     const ms=Math.min(TRANSFER_MS,reviewTime()??performance.now()-start),t=ms/1000;
     canvas!.dataset.time=String(ms);canvas!.dataset.phase=t<.24?'afterimage':t<.54?'transfer':t<.64?'reform':'materialize';
     report(t<.24?'満ちたマナを凝縮':t<.54?'光の粒が高速移動':t<.64?'着地直前で枠を再形成':'カードが現れる',{transferMs:ms});
     c.clearRect(0,0,innerWidth,innerHeight);
     flight.style.transform=(t<.30?source:destination).toString();
     flight.style.opacity=String(t<.30?1-ease(.015,.13,t):ease(.59,.79,t));
     const compression=ease(.075,.235,t),inner=source.translate(w/2,h/2).scale(mix(1,.78,compression)).translate(-w/2,-h/2);
     outerFrame(t);
     filledMana(inner,ease(.01,.095,t)*(1-ease(.23,.345,t)),compression,t);
     rim(inner,ease(0,.08,t),true,t);
     filledMana(destination,ease(.47,.62,t)*(1-ease(.66,.81,t))*.85,1,t);
     rim(destination,ease(.47,.63,t)*(1-ease(.66,.82,t)),false,t);
     for(let i=0;i<particles.length;i++){
      const p=particles[i],position=path(i,t),age=t-.24-p.delay;
      if(age<-.045||t>.80)continue;
      const before=path(i,t-.022),alpha=ease(-.045,0,age)*(1-ease(.62+p.delay*.25,.79,t));
      const size=p.size*mix(1,.58,position.q);
      // A short directional streak has a soft blue body and a narrow white core.
      line(c,before,position,size*5.5,'#198ee5',alpha*.30);line(c,before,position,size*2.1,'#77dbff',alpha*.85);line(c,before,position,size*.65,'#effcff',alpha);
      c.globalAlpha=alpha*.95;c.drawImage(sprite,position.x-size*7,position.y-size*7,size*14,size*14);
     }
     c.globalAlpha=1;
     if(ms===TRANSFER_MS){finish(true);return;}frame=requestAnimationFrame(tick);
    };tick();
   });}finally{
    // The borrowed print returns to its original field owner in carrySlatePrint.
    flight.style.cssText=saved;if(complete){flight.style.transition='none';flight.style.left=flight.style.top='0';flight.style.transformOrigin='0 0';flight.style.transform=destination.toString();flight.style.opacity='1';}
    clear();report('現行の落下・接地');
   }
  },
  impact(face){
   if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
   const c=ensure();canvas!.className='mana-ground-cracks';canvas!.style.zIndex='134';
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
    if(!face.isConnected||document.hidden){clear();return;}
    const ms=performance.now()-start;if(ms>=CRACK_MS){clear();report('ヒビ消失・定着',{crackMs:CRACK_MS});return;}
    canvas!.dataset.age=String(ms);report('接地・ヒビがゆっくり消える',{crackMs:ms});
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
    c.restore();c.globalAlpha=1;frame=requestAnimationFrame(tick);
   };tick();
  }
 };
}
