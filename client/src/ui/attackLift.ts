const motion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new WeakMap<HTMLElement,(immediate?:boolean)=>void>();
/** Add a selection pose to the native Actor's transform, without taking it over. */
export function liftAttackCard(card:HTMLElement,role:'source'|'target'):(immediate?:boolean)=>void {
  active.get(card)?.(true);
  let disposed=false,pose:Animation|null=null,settling:Animation|null=null;
  if(!motion.matches){
    const style=getComputedStyle(card),[ox,oy]=style.transformOrigin.split(/\s+/).map(parseFloat);
    const w=parseFloat(style.width),h=parseFloat(style.height),scale=role==='source'?1.045:1.065;
    const x=(w/2-ox)*(1-scale),y=(h/2-oy)*(1-scale)-h*(role==='source'?.09:.055);
    pose=card.animate([{transform:'translate(0px,0px) scale(1)'},{transform:`translate(${x}px,${y}px) scale(${scale})`}],{duration:190,easing:'cubic-bezier(.16,.8,.28,1)',fill:'forwards',composite:'add'});
    pose.id=`attack-${role}-lift`;
  }
  const release=(immediate=false)=>{
    if(disposed){if(immediate){settling?.cancel();if(active.get(card)===release)active.delete(card);}return;}
    disposed=true;
    if(pose){
      const current=new DOMMatrix(getComputedStyle(card).transform);pose.cancel();pose=null;
      if(!immediate&&card.isConnected&&!motion.matches){
        const base=new DOMMatrix(getComputedStyle(card).transform),delta=base.inverse().multiply(current);
        settling=card.animate([{transform:delta.toString()},{transform:'matrix(1,0,0,1,0,0)'}],{duration:160,easing:'cubic-bezier(.2,.7,.3,1)',composite:'add'});
        settling.id=`attack-${role}-settle`;
        void settling.finished.then(()=>{if(active.get(card)===release)active.delete(card);}).catch(()=>{});
        return;
      }
    }
    if(active.get(card)===release)active.delete(card);
  };
  active.set(card,release);return release;
}
