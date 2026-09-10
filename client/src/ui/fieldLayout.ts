export function fieldPositions(root:ParentNode){
 return new Map([...root.querySelectorAll<HTMLElement>('.zone-mon > .card[data-uid]')].map(el=>[el.dataset.uid!,el.offsetLeft]));
}
export function settleField(root:ParentNode,previous:Map<string,number>){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 for(const el of root.querySelectorAll<HTMLElement>('.zone-mon > .card[data-uid]')){
  const x=previous.get(el.dataset.uid!);if(x==null)continue;
  const dx=x-el.offsetLeft;if(Math.abs(dx)<.5)continue;
  el.animate([{translate:`${dx}px 0`},{translate:'0 0'}],{duration:280,easing:'cubic-bezier(.2,.75,.25,1)'});
 }
}
export function reserveMonster(zone:HTMLElement,uid:string){
 const old=fieldPositions(zone.parentElement!),target=zone.querySelector<HTMLElement>('.slot:not([data-reserved-uid])');
 if(!target)return null;
 target.dataset.reservedUid=uid;settleField(zone.parentElement!,old);return target;
}
export function releaseMonster(uid:string){
 const node=[...document.querySelectorAll<HTMLElement>('.zone-mon > .card,.zone-mon > .slot')].find(e=>e.dataset.uid===uid||e.dataset.reservedUid===uid);
 if(!node)return;const zone=node.parentElement!,old=fieldPositions(zone.parentElement!);
 const slot=document.createElement('div');slot.className='slot';node.remove();zone.append(slot);settleField(zone.parentElement!,old);
}
