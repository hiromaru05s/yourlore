import '../styles/attackTarget.css';
import {outlineFor,type Outline} from './handConditionOutline';
import {liftAttackCard} from './attackLift';

const NS='http://www.w3.org/2000/svg';
let serial=0;
export function prepareAttackTarget(card:HTMLElement):Promise<Outline|null>{return outlineFor(card).catch(()=>null);}

/** A light just outside the actual print, plus a small additive lift. The native
 * resting/combat transform keeps ownership of the card's underlying pose. */
export function highlightAttackTarget(card:HTMLElement): (immediate?:boolean)=>void {
  const shape=prepareAttackTarget(card);
  const layer=document.createElement('div');layer.className='attack-target-outline';layer.setAttribute('aria-hidden','true');card.append(layer);
  let disposed=false;const releaseLift=liftAttackCard(card,'target');
  void shape.then(outline=>{
    if(disposed||!outline||!layer.isConnected)return;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${outline.width} ${outline.height}`);svg.setAttribute('preserveAspectRatio','none');
    const id=`attack-target-outside-${++serial}`;
    // All light, including the bright edge, is masked OUT of the card face.
    // outline.d is a numeric path traced from the adopted raster, not a box.
    svg.innerHTML=`<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${outline.width+80}" height="${outline.height+80}"><rect x="-40" y="-40" width="${outline.width+80}" height="${outline.height+80}" fill="white"/><path d="${outline.d}" fill="black"/></mask></defs><g mask="url(#${id})">${['aura','rim','core','travel'].map(name=>`<path class="attack-target-${name}" d="${outline.d}" pathLength="100" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
    layer.append(svg);
  });
  return(immediate=false)=>{disposed=true;layer.remove();releaseLift(immediate);};
}
