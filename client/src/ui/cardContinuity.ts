/** Retain decoded illustration/frame nodes across controller snapshots. Event handlers
 * stay on the freshly bound interaction owner; stateful labels come from the new state. */
export function retainCardPrint(previous:HTMLElement,next:HTMLElement):void {
 for(const selector of ['.card-art','.card-frame','.card-name','.card-cost','.ad-atk','.ad-def']){
  const old=previous.querySelector<HTMLElement>(`:scope > ${selector}`),fresh=next.querySelector<HTMLElement>(`:scope > ${selector}`);
  if(!old||!fresh)continue;
  // Finish renderers own their canvas lifecycle; keep the new owner's live
  // material instead of moving a canvas that the previous owner will dispose.
  if(selector==='.card-art'&&(previous.dataset.cardEffect||next.dataset.cardEffect))continue;
  if(['.card-frame','.card-cost','.ad-atk','.ad-def'].includes(selector)&&(previous.dataset.cardFrame||next.dataset.cardFrame))continue;
  const equal=selector==='.card-art'?
   old.querySelector<HTMLImageElement>('img')?.src===fresh.querySelector<HTMLImageElement>('img')?.src&&old.querySelectorAll('canvas').length===fresh.querySelectorAll('canvas').length:
   old.outerHTML===fresh.outerHTML;
  if(equal)fresh.replaceWith(old);
 }
}

/** Keep the condition rim's entrance and orbit clocks alive when its print changes parent. */
function movePrintLayer(parent:HTMLElement,layer:HTMLElement,before:Element|null){
 if(!layer.classList.contains('hand-condition-effect')||!parent.isConnected||!layer.isConnected){
  parent.insertBefore(layer,before);return;
 }
 // Reparenting can recreate CSS animations, including on a state-preserving DOM move.
 const clocks=layer.getAnimations({subtree:true}).flatMap(animation=>{
  const target=(animation.effect as KeyframeEffect|null)?.target;
  return animation instanceof CSSAnimation && target && animation.startTime!=null
   ? [{target,name:animation.animationName,start:animation.startTime}] : [];
 });
 parent.insertBefore(layer,before);
 for(const {target,name,start} of clocks){
  const resumed=target.getAnimations().find(a=>a instanceof CSSAnimation && a.animationName===name);
  if(resumed && resumed.startTime!==start)resumed.startTime=start;
 }
}

/** Borrow the actual decoded print for a flight; leave its interaction/layout
 * owner in place. Return it atomically even when playback is interrupted. */
export function borrowCardPrint(source:HTMLElement,flight:HTMLElement):()=>void {
 delete flight.dataset.cardEffect;delete flight.dataset.cardFrame;
 flight.dataset.borrowedCardPrint='true';flight.dataset.cardFrameBorrowed='true';
 const all=[...source.children] as HTMLElement[],prepared=[...flight.children] as HTMLElement[];
 const nodes=all.filter(node=>prepared.some(copy=>copy.className===node.className));
 const styles=nodes.map(node=>node.getAttribute('style'));
 nodes.forEach(node=>{const copy=prepared.find(copy=>copy.className===node.className);if(copy)node.style.cssText=copy.style.cssText;});
 flight.replaceChildren();
 for(const node of nodes)movePrintLayer(flight,node,null);
 let returned=false;
 return()=>{
  if(returned)return;
  returned=true;
  nodes.forEach((node,i)=>{
   const style=styles[i];
   if(style===null)node.removeAttribute('style');
   else node.setAttribute('style',style);
  });
  all.forEach((node,i)=>{
   const at=source.children[i]??null;
   if(at!==node)movePrintLayer(source,node,at);
  });
 };
}
