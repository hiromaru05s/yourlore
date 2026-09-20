import {drawVoidSurface} from './voidSurface';
/** The aperture animates locally; it never invalidates the expensive furniture scene. */
export function mountRiftApertures(root:HTMLElement){
 const views=new Map<string,{host:HTMLElement;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D}>();let last=-Infinity;
 return {tick(now:number){if(document.hidden||now-last<100)return;last=now;
  for(const side of ['me','opp']){
   let v=views.get(side);if(!v?.host.isConnected){v?.canvas.remove();const host=root.querySelector<HTMLElement>(`#rift-${side} .rift-sprite`);if(!host)continue;
    const canvas=document.createElement('canvas');canvas.className='rift-aperture';canvas.width=160;canvas.height=370;canvas.setAttribute('aria-hidden','true');host.append(canvas);v={host,canvas,ctx:canvas.getContext('2d')!};views.set(side,v);
   }
   const {ctx:c}=v,w=160,h=370;c.clearRect(0,0,w,h);c.save();if(side==='opp'){c.translate(0,h);c.scale(1,-1);}
   c.beginPath();c.moveTo(w*.08,h*.97);c.bezierCurveTo(w*.08,h*.60,w*.52,h*.22,w*.9,h*.03);c.bezierCurveTo(w*.97,h*.5,w*.52,h*.84,w*.08,h*.97);c.closePath();c.clip();
   const t=matchMedia('(prefers-reduced-motion: reduce)').matches?0:now/1000;drawVoidSurface(c,w,h,t);
   // A central seam stays almost black while the surrounding planes slide past it.
   c.beginPath();c.moveTo(w*.18,h*.83);c.bezierCurveTo(w*.39,h*.65,w*.54,h*.32,w*.84,h*.15);c.bezierCurveTo(w*.56,h*.53,w*.53,h*.78,w*.18,h*.83);c.fillStyle='#06091b';c.fill();
   c.strokeStyle='#afa5e4';c.lineWidth=1.1;c.beginPath();c.moveTo(w*.16,h*.81);c.bezierCurveTo(w*.31,h*.54,w*.59,h*.35,w*.84,h*.15);c.stroke();c.restore();
  }
 },dispose(){views.forEach(v=>v.canvas.remove());views.clear();}};
}
