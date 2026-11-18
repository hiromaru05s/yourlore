import '../styles/attackTarget.css';
import {outlineFor,type Outline} from './handConditionOutline';

const NS='http://www.w3.org/2000/svg';
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new WeakMap<HTMLElement,(immediate?:boolean)=>void>();
let serial=0;
export function prepareAttackTarget(card:HTMLElement):Promise<Outline|null>{return outlineFor(card).catch(()=>null);}

/** A light just outside the actual print, plus a small additive lift. The native
 * resting/combat transform keeps ownership of the card's underlying pose. */
export function highlightAttackTarget(card:HTMLElement): (immediate?:boolean)=>void {
  active.get(card)?.(true);
  const shape=prepareAttackTarget(card);
  const layer=document.createElement('div');layer.className='attack-target-outline';layer.setAttribute('aria-hidden','true');card.append(layer);
  let disposed=false,pose:Animation|null=null,settling:Animation|null=null;
  if(!motion.matches){
    const style=getComputedStyle(card),[ox,oy]=style.transformOrigin.split(/\s+/).map(parseFloat);
    const w=parseFloat(style.width),h=parseFloat(style.height),scale=1.065;
    const x=(w/2-ox)*(1-scale),y=(h/2-oy)*(1-scale)-h*.055;
    pose=card.animate([{transform:'translate(0px,0px) scale(1)'},{transform:`translate(${x}px,${y}px) scale(${scale})`}],{duration:180,easing:'cubic-bezier(.16,.8,.28,1)',fill:'forwards',composite:'add'});
    pose.id='attack-target-lift';
  }
  void shape.then(outline=>{
    if(disposed||!outline||!layer.isConnected)return;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${outline.width} ${outline.height}`);svg.setAttribute('preserveAspectRatio','none');
    const id=`attack-target-outside-${++serial}`;
    // All light, including the bright edge, is masked OUT of the card face.
    // outline.d is a numeric path traced from the adopted raster, not a box.
    svg.innerHTML=`<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${outline.width+80}" height="${outline.height+80}"><rect x="-40" y="-40" width="${outline.width+80}" height="${outline.height+80}" fill="white"/><path d="${outline.d}" fill="black"/></mask></defs><g mask="url(#${id})">${['aura','rim','core','travel'].map(name=>`<path class="attack-target-${name}" d="${outline.d}" pathLength="100" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
    layer.append(svg);
  });
  const release=(immediate=false)=>{
    if(disposed){if(immediate){settling?.cancel();if(active.get(card)===release)active.delete(card);}return;}
    disposed=true;layer.remove();
    if(pose){
      // Derive the additive delta at interruption, so fast target switching
      // settles from its current height without jumping to the full lift.
      const current=new DOMMatrix(getComputedStyle(card).transform);
      pose.cancel();pose=null;
      if(!immediate&&card.isConnected&&!motion.matches){
        const base=new DOMMatrix(getComputedStyle(card).transform),delta=base.inverse().multiply(current);
        settling=card.animate([{transform:delta.toString()},{transform:'matrix(1,0,0,1,0,0)'}],{duration:150,easing:'cubic-bezier(.2,.7,.3,1)',composite:'add'});
        settling.id='attack-target-settle';
        void settling.finished.then(()=>{if(active.get(card)===release)active.delete(card);}).catch(()=>{});
        return;
      }
    }
    if(active.get(card)===release)active.delete(card);
  };
  active.set(card,release);return release;
}
