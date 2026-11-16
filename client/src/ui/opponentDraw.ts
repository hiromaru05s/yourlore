import {DRAW_DURATION,DRAW_STAGGER,drawMotion} from './drawMotion';
import {handCardMatrix,type HandLayout} from './handGeometry';
import {sfx} from './sound';

/** Convert viewport poses into transforms on the actual sleeve in its hand slot. */
function sleeveSpace(node:HTMLElement){
  const style=getComputedStyle(node),w=parseFloat(style.width),h=parseFloat(style.height);
  const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat);
  const rest=handCardMatrix(node);
  const around=new DOMMatrix().translate(ox,oy);
  const local=style.transform==='none'?new DOMMatrix():new DOMMatrix(style.transform);
  const toLocal=local.multiply(around.inverse()).multiply(rest.inverse());
  const transform=(pose:DOMMatrix)=>toLocal.multiply(pose).multiply(around).toString();
  return {w,h,rest,transform};
}

/** A face-down draw never leaves the opponent hand's clipping, material or stacking context. */
export async function drawOpponentSleeves(cards:HTMLElement[],origin:DOMRect,signal:AbortSignal,
  onLand:(node:HTMLElement)=>void,speed:number,previousHand?:HandLayout){
  if(signal.aborted || !cards.length)return;
  const motions:Animation[]=[],sounds:ReturnType<typeof setTimeout>[]=[];
  const stop=()=>{motions.forEach(a=>a.cancel());sounds.forEach(clearTimeout);};
  signal.addEventListener('abort',stop,{once:true});
  try{
    const hand=cards[0].parentElement!;
    // Measure every resting pose before the first animation changes any bounding box.
    const slots=[...hand.querySelectorAll<HTMLElement>(':scope > .card--back')].map((node,i)=>({
      node,space:sleeveSpace(node),old:previousHand?.get(node.dataset.uid||'#'+i),
    }));
    const finishes:Promise<unknown>[]=[];
    for(const {node,space:{w,h,rest,transform},old} of slots){
      const i=cards.indexOf(node);
      if(i<0){
        if(old)motions.push(node.animate([{transform:transform(old.matrix.scale(old.width/w,old.height/h))},{transform:transform(rest)}],
          {duration:DRAW_DURATION*.64*speed,easing:'ease-out'}));
        continue;
      }
      const end=rest.transformPoint(new DOMPoint(w/2,h/2));
      const sx=origin.left+origin.width/2,sy=origin.top+origin.height/2;
      const angle=Math.atan2(rest.b,rest.a)*180/Math.PI;
      const keys:Keyframe[]=[];
      for(let frame=0;frame<=32;frame++){
        const t=frame/32,p=drawMotion(t,false),k=p.travel;
        const x=sx+(end.x-sx)*k+origin.width*.11*p.peel;
        const y=sy+(end.y-sy)*k-Math.min(origin.height*.30,55)*p.lift;
        const scaleX=origin.width/w*(1-k)+Math.hypot(rest.a,rest.b)*k;
        const scaleY=origin.height/h*(1-k)+Math.hypot(rest.c,rest.d)*k;
        const pose=new DOMMatrix().translate(x,y).rotate(angle*k+10*p.bank)
          .scale(scaleX,scaleY).translate(-w/2,-h/2);
        keys.push({offset:t,transform:transform(t===1?rest:pose),visibility:'visible'});
      }
      const delay=i*DRAW_STAGGER*speed;
      const motion=node.animate(keys,{duration:DRAW_DURATION*speed,delay,fill:'forwards'});
      motion.id='opponent-sleeve-draw';motions.push(motion);
      sounds.push(setTimeout(()=>sfx('draw'),delay));
      finishes.push(motion.finished.then(()=>{if(!signal.aborted){onLand(node);motion.cancel();}},()=>{}));
    }
    await Promise.all(finishes);
  }finally{stop();signal.removeEventListener('abort',stop);}
}
