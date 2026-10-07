/** Combat uses live field faces, never hand, pile, picker or rendering copies
 * carrying the same public UID. Opacity/visibility may be owned by a renderer,
 * so validate geometry without rejecting an animated card's hidden DOM anchor. */
export function combatRect(node:HTMLElement|null|undefined):DOMRect|null {
  if(!node?.isConnected)return null;
  const r=node.getBoundingClientRect();
  return r.width>0&&r.height>0&&[r.x,r.y,r.width,r.height].every(Number.isFinite)?r:null;
}
export function combatCard(uid:string):HTMLElement|null {
  const key=CSS.escape(uid);
  for(const selector of [`.zone-mon .card[data-uid="${key}"]`,`.fx-field-ghost[data-uid="${key}"]`]){
    for(const node of document.querySelectorAll<HTMLElement>(selector))if(combatRect(node))return node;
  }
  return null;
}
export function combatPortrait(side:'me'|'opp'):HTMLElement|null {
  const root=document.getElementById(side==='me'?'portraitMe':'portraitOpp');
  for(const selector of ['.avatar','.pt-ring']){
    const node=root?.querySelector<HTMLElement>(selector);
    if(combatRect(node))return node!;
  }
  return null;
}
