import {boardPoint} from '../../ui/boardProjection';
import {manaSlotLayout} from '../../ui/manaFormationTypes';
import {readingScale} from '../../ui/readingBoardLayout';
import {PURCHASE_CRYSTAL_ATLAS,manaTravelProgress} from '../../ui/manaPurchase';
import {PurchaseAirWake} from '../../ui/purchaseAir';
import {sfx} from '../../ui/sound';

type Point = {x:number;y:number};
const clamp = (v:number) => Math.min(1,Math.max(0,v));
const smooth = (v:number) => {const t=clamp(v);return t*t*(3-2*t);};
const release = 170;
const atlas = new Image();
atlas.src=PURCHASE_CRYSTAL_ATLAS;
const assets=Promise.all([atlas.decode().then(()=>true,()=>false),PurchaseAirWake.prepare(new AbortController().signal).catch(()=>undefined)]);
const center=(r:DOMRect):Point=>({x:r.left+r.width/2,y:r.top+r.height/2});

// The DOM grid is a hit area. Its ten columns differ from the authored crystal spacing.
function crystalPosition(tray:HTMLElement,index:number,side:0|1){
  const maximum=Number(tray.dataset.maximum);
  if(!tray.closest('[data-widgets-ready="true"]')){
    const rect=tray.querySelectorAll('.mana-crystal')[index].getBoundingClientRect();
    return {...center(rect),size:Math.max(6,Math.min(rect.width,rect.height))};
  }
  const slot=manaSlotLayout(index,maximum),scale=readingScale();
  const x=innerWidth/2+(-.345+.0415+slot.x)*scale;
  const y=innerHeight/2+((side?-.397:.397)+slot.z)*scale;
  const height=(.012+slot.y+.004*slot.scale)*scale;
  const pos=boardPoint(x,y,height),edge=boardPoint(x+.02954*.5*slot.scale*scale,y,height);
  return {...pos,size:2*(edge.x-pos.x)};
}

function curve(a:Point,b:Point,u:number,bend:number):Point{
  const x=b.x-a.x,y=b.y-a.y,d=Math.hypot(x,y)||1,h=Math.sin(Math.PI*u)*bend;
  return {x:a.x+x*u-y/d*h,y:a.y+y*u+x/d*h};
}
function drawFacet(c:CanvasRenderingContext2D,p:Point,size:number,spin:number,glow:number){
  if(size<.1)return;
  const frame=Math.round(spin*72)%72;
  c.save();c.translate(p.x,p.y);c.shadowColor='#439fff';c.shadowBlur=size*(.09+.14*glow);
  c.drawImage(atlas,frame%12*320,Math.floor(frame/12)*320,320,320,-size/2,-size/2,size,size);c.restore();
}
// Taper both ends of each ribbon. Keep a navy lower edge legible against the pale table.
function ribbon(c:CanvasRenderingContext2D,path:(p:number)=>Point,end:number,length:number,width:number){
  const start=Math.max(0,end-length);
  if(end-start<.002)return;
  const left:Point[]=[],right:Point[]=[];
  for(let j=0;j<=14;j++){
    const k=j/14,u=start+(end-start)*k,p=path(u),q=path(Math.min(1,u+.001)),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;
    const r=width*Math.sin(k*Math.PI)**.75;
    left.push({x:p.x-dy/d*r,y:p.y+dx/d*r});right.push({x:p.x+dy/d*r*.65,y:p.y-dx/d*r*.65});
  }
  c.beginPath();[...left,...right.reverse()].forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
  const a=path(start),b=path(end),g=c.createLinearGradient(a.x,a.y,b.x,b.y);
  g.addColorStop(0,'#164a8500');g.addColorStop(.32,'#286bc48c');g.addColorStop(.78,'#6cc9fff0');g.addColorStop(1,'#e8faff');
  c.fillStyle=g;c.fill();c.beginPath();left.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=g;c.lineWidth=Math.max(.6,width*.3);c.stroke();
}
function glint(c:CanvasRenderingContext2D,p:Point,size:number,power:number){
  if(power<=0)return;
  c.save();c.translate(p.x,p.y);c.rotate(-.23);c.scale(size*power,size*power);
  c.beginPath();c.moveTo(0,-.96);c.lineTo(.12,-.13);c.lineTo(.72,0);c.lineTo(.1,.10);c.lineTo(0,.88);c.lineTo(-.09,.11);c.lineTo(-.68,0);c.lineTo(-.11,-.09);c.closePath();
  c.fillStyle='#e3fcff';c.shadowColor='#3aafff';c.shadowBlur=size*.34;c.fill();c.restore();
}
// Four cut faces share a center while charged. On spend the seams open a few
// pixels, then the facets shrink toward their own tips above the spent stone.
const burstMs=255;
const rim=[{x:0,y:-.63},{x:.43,y:-.02},{x:0,y:.59},{x:-.43,y:.03}];
const facetColors=['#c0edff','#478fdc','#70bcf7','#e2f8ff'];
function drawLocalSpend(c:CanvasRenderingContext2D,src:Point & {size:number},local:number){
  const age=local-release;
  if(age>=burstMs)return;
  const charge=smooth(local/release);
  const open=1-(1-clamp(age/155))**3;
  const shrink=smooth((age-25)/(burstMs-25));
  c.save();
  c.translate(src.x,src.y);
  c.scale(src.size,src.size);
  for(let i=0;i<rim.length;i++){
    const a=rim[i],b=rim[(i+1)%rim.length];
    const tip={x:(a.x+b.x)*.5,y:(a.y+b.y)*.5};
    c.save();
    c.translate(tip.x*(shrink+open*.92),tip.y*(shrink+open*.92));
    c.scale(1-shrink,1-shrink);
    c.globalAlpha=(age<0?.53*charge:.84*(1-shrink));
    c.fillStyle=facetColors[i];
    c.beginPath();c.moveTo(0,0);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fill();
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(0,0);c.strokeStyle='#edfbff';c.lineWidth=.042;c.stroke();
    c.restore();
  }
  c.restore();
  const flash=age<0?.32*charge:.88*(1-smooth(age/155));
  glint(c,src,src.size,flash);
}
export function setReadout(tray:HTMLElement,value:number){
  tray.dataset.mana=String(value);
  tray.querySelector('.mana-readout b')!.textContent=String(value);
  tray.querySelectorAll('.mana-crystal').forEach((c,i)=>c.classList.toggle('is-lit',i<value));
  tray.setAttribute('aria-label',`マナ ${value}/${tray.dataset.maximum}`);
}

export async function spend(tray:HTMLElement,side:0|1,count:number,card:HTMLElement|null,rate:number,signal:AbortSignal){
  const initial=Number(tray.dataset.mana);
  const [loaded,wake]=card?await assets:[true,undefined] as const;
  if(signal.aborted||count<=0)return;
  if(!loaded||matchMedia('(prefers-reduced-motion: reduce)').matches){
    setReadout(tray,initial-count);sfx('mana-pay');return;
  }
  const canvas=document.createElement('canvas');canvas.className='spend-overlay';canvas.ariaHidden='true';
  const ctx=canvas.getContext('2d');if(!ctx){setReadout(tray,initial-count);return;}
  document.body.append(canvas);
  const stamp=card?.querySelector<HTMLElement>('.card-cost');
  const face=document.createElement('span');face.className='spend-face';face.ariaHidden='true';card?.append(face);
  const gap=Math.min(115,410/Math.max(1,count-1)),travel=610;
  const duration=release+gap*(count-1)+(card?travel+195:burstMs);
  let previous=initial,contacted=false;
  try{
    await new Promise<void>(resolve=>{
      let frame=0;
      function done(){cancelAnimationFrame(frame);signal.removeEventListener('abort',done);document.removeEventListener('visibilitychange',done);resolve();}
      signal.addEventListener('abort',done,{once:true});document.addEventListener('visibilitychange',done,{once:true});
      const start=performance.now();
      function draw(now:number){
        if(!tray.isConnected||signal.aborted||document.hidden){done();return;}
        const age=(now-start)*rate,dpr=Math.min(devicePixelRatio,2);
        if(canvas.width!==Math.round(innerWidth*dpr)||canvas.height!==Math.round(innerHeight*dpr)){canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);}
        ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.clearRect(0,0,innerWidth,innerHeight);
        const remaining=initial-Math.min(count,Math.max(0,Math.floor((age-release)/gap)+1));
        if(remaining!==previous){setReadout(tray,remaining);previous=remaining;}
        const target=card?center((stamp??card).getBoundingClientRect()):null;
        const contact=age-release-travel;
        if(!contacted&&age>=(card?release+travel:release)){contacted=true;sfx('mana-pay');}
        if(card&&contact>0){
          const front=smooth(contact/(gap*(count-1)+145));
          face.style.setProperty('--front',front*125+'%');
          face.style.opacity=String(Math.min(1,contact/45,clamp((duration-age)/150)));
        }
        for(let i=0;i<count;i++){
          const local=age-i*gap;if(local<0||local>release+travel+130)continue;
          const src=crystalPosition(tray,initial-1-i,side),d=src.size;
          if(!target){drawLocalSpend(ctx!,src,local);continue;}
          if(local<release){glint(ctx!,{x:src.x-d*.13,y:src.y-d*.13},d*.85,smooth(local/release));continue;}
          const u=clamp((local-release)/travel),q=manaTravelProgress(u);
          const bend=Math.min(62,Math.hypot(target.x-src.x,target.y-src.y)*.16)*(side?-1:1);
          const path=(v:number)=>curve(src,target,v,bend);
          const pos=path(q),next=path(Math.min(1,q+.003));
          ribbon(ctx!,path,q,Math.min(q,.19+.13*u),d*.15*(1-smooth((u-.88)/.12)));
          if(u<1)wake?.draw(ctx!,pos.x,pos.y,Math.atan2(next.y-pos.y,next.x-pos.x),d*1.5,local,.55*u,0);
          const scale=(1+.65*Math.sin(Math.PI*u))*(1-smooth((u-.81)/.19));
          drawFacet(ctx!,pos,d*1.83*scale,u*.48,1-u);
          const impact=local-release-travel;
          if(impact>=0)glint(ctx!,target,d*1.05,1-smooth(impact/130));
        }
        if(age>=duration)done();else frame=requestAnimationFrame(draw);
      }
      draw(start);
    });
  }finally{setReadout(tray,initial-count);canvas.remove();face.remove();}
}
