export const ZENO_TURN_LIMIT = { yaw: Math.PI / 6, pitch: Math.PI / 18 };
const clamp = (n:number, max:number) => Math.max(-max, Math.min(max,n));

/** Bounded offset, easing back after release. No unrestricted orbit or accumulated spin. */
export function createZenoTurn() {
  let yaw=0,pitch=0,targetYaw=0,targetPitch=0,held=false;
  return {
    drag(dx:number,dy:number,width:number,height:number) {
      held=true;
      targetYaw=clamp(dx/Math.max(100,width)*Math.PI,ZENO_TURN_LIMIT.yaw);
      targetPitch=clamp(dy/Math.max(100,height)*Math.PI/2,ZENO_TURN_LIMIT.pitch);
    },
    release(){held=false;},
    tick(dt:number,still=false) {
      if(still){yaw=targetYaw;pitch=targetPitch;}
      else {
        const blend=1-Math.exp(-dt*14);
        yaw+=(targetYaw-yaw)*blend;pitch+=(targetPitch-pitch)*blend;
        if(!held){const decay=Math.exp(-dt*2.6);targetYaw*=decay;targetPitch*=decay;}
      }
      return {yaw,pitch};
    },
  };
}

export function bindZenoInteraction(target:HTMLElement,turn:ReturnType<typeof createZenoTurn>,greet:()=>void,wake:()=>void) {
  let active:number|undefined,x=0,y=0,moved=false,suppressClick=false;
  const oldTouch=target.style.touchAction;
  target.style.touchAction='none';
  const down=(e:PointerEvent)=>{
    if(active!==undefined||!e.isPrimary||e.button!==0)return;
    active=e.pointerId;x=e.clientX;y=e.clientY;moved=false;suppressClick=false;
    target.setPointerCapture(e.pointerId);
  };
  const move=(e:PointerEvent)=>{
    if(e.pointerId!==active)return;
    const dx=e.clientX-x,dy=e.clientY-y;
    if(Math.hypot(dx,dy)>7)moved=true;
    if(moved){const r=target.getBoundingClientRect();turn.drag(dx,dy,r.width,r.height);wake();}
  };
  const end=(e:PointerEvent)=>{
    if(e.pointerId!==active)return;
    suppressClick=moved||e.type!=='pointerup';active=undefined;turn.release();
    if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);
    wake();
  };
  const click=(e:MouseEvent)=>{
    if(suppressClick&&e.detail!==0){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();return;}
    suppressClick=false;greet();
  };
  const key=(e:KeyboardEvent)=>{if(target.tagName!=='BUTTON'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();greet();}};
  target.addEventListener('pointerdown',down);target.addEventListener('pointermove',move);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(event,end as EventListener);
  target.addEventListener('click',click);target.addEventListener('keydown',key);
  return ()=>{
    if(active!==undefined&&target.hasPointerCapture(active))target.releasePointerCapture(active);
    target.removeEventListener('pointerdown',down);target.removeEventListener('pointermove',move);
    for(const event of ['pointerup','pointercancel','lostpointercapture'])target.removeEventListener(event,end as EventListener);
    target.removeEventListener('click',click);target.removeEventListener('keydown',key);target.style.touchAction=oldTouch;
  };
}
