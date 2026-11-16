import {motion, ease} from './persistentFlightMotion';

interface Anchor { x:number; y:number; w:number }

function point(ms:number, source:Anchor, destination:Anchor){
  const m=motion(ms);
  return {
    x:source.x+(destination.x-source.x)*m.p,
    y:source.y+(destination.y-source.y)*m.p+m.lift*source.w,
  };
}

/** A short taper follows the card centre along the same flight curve. */
export function paintPersistentTrail(ctx:CanvasRenderingContext2D,ms:number,source:Anchor,destination:Anchor){
  if(ms<270 || ms>1190)return;
  const tail=Math.max(240,ms-170*(1-ease(890,1190,ms)));
  const a=point(tail,source,destination), b=point(ms,source,destination);
  if(Math.hypot(a.x-b.x,a.y-b.y)<1)return;
  ctx.save();
  const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
  gradient.addColorStop(0,'#91caff00');
  gradient.addColorStop(1,'#bfeaffb0');
  ctx.strokeStyle=gradient;
  ctx.lineWidth=source.w*.065*(1-ease(980,1190,ms));
  ctx.shadowColor='#70c9ff';ctx.shadowBlur=9;ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(a.x,a.y);
  for(let i=1;i<=12;i++){
    const p=point(tail+(ms-tail)*i/12,source,destination);
    ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='#effcff99';ctx.shadowBlur=0;
  ctx.stroke();
  ctx.restore();
}

/** The sweep uses the real transparent frame print as its silhouette. */
export function frameGlint(frame:HTMLElement|null){
  if(!frame)return;
  const light=document.createElement('span');
  light.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0;mask-size:100% 100%;background:linear-gradient(120deg,transparent 38%,#a5dcff 47%,#f3fcff 50%,transparent 59%) 100% 0 / 300% 100% no-repeat';
  light.style.maskImage=getComputedStyle(frame).backgroundImage;
  frame.append(light);
  return light;
}
