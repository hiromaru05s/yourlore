/** Retain decoded illustration/frame nodes across controller snapshots. Event handlers
 * stay on the freshly bound interaction owner; stateful labels come from the new state. */
export function retainCardPrint(previous:HTMLElement,next:HTMLElement):void {
 for(const selector of ['.card-art','.card-frame','.card-name','.card-cost','.ad-atk','.ad-def']){
  const old=previous.querySelector<HTMLElement>(`:scope > ${selector}`),fresh=next.querySelector<HTMLElement>(`:scope > ${selector}`);
  if(!old||!fresh)continue;
  // Finish renderers own their canvas lifecycle; keep the new owner's live
  // material instead of moving a canvas that the previous owner will dispose.
  if(selector==='.card-art'&&(previous.dataset.cardEffect||next.dataset.cardEffect))continue;
  if(selector==='.card-frame'&&(previous.dataset.cardFrame||next.dataset.cardFrame))continue;
  const equal=selector==='.card-art'?
   old.querySelector<HTMLImageElement>('img')?.src===fresh.querySelector<HTMLImageElement>('img')?.src&&old.querySelectorAll('canvas').length===fresh.querySelectorAll('canvas').length:
   old.outerHTML===fresh.outerHTML;
  if(equal)fresh.replaceWith(old);
 }
}

/** Borrow the actual decoded print for a flight; leave its interaction/layout
 * owner in place. Return it atomically even when playback is interrupted. */
export function borrowCardPrint(source:HTMLElement,flight:HTMLElement):()=>void {
 delete flight.dataset.cardEffect;delete flight.dataset.cardFrame;
 flight.dataset.borrowedCardPrint='true';
 const all=[...source.children] as HTMLElement[],prepared=[...flight.children] as HTMLElement[];
 const nodes=all.filter(node=>prepared.some(copy=>copy.className===node.className));
 const styles=nodes.map(node=>node.getAttribute('style'));
 nodes.forEach(node=>{const copy=prepared.find(copy=>copy.className===node.className);if(copy)node.style.cssText=copy.style.cssText;});
 flight.replaceChildren(...nodes);let returned=false;
 return()=>{if(returned)return;returned=true;nodes.forEach((node,i)=>{const style=styles[i];if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);});source.replaceChildren(...all);};
}
