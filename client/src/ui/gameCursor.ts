/** One unclipped reason bubble; no invisible overlay intercepts card input. */
export function installGameCursor(root:HTMLElement):()=>void {
  let tip:HTMLElement|null=null,owner:HTMLElement|null=null;
  const hide=()=>{owner?.removeAttribute('aria-describedby');tip?.remove();tip=null;owner=null;};
  const show=(event:Event)=>{
    const el=(event.target as Element)?.closest<HTMLElement>('[data-block-reason]');
    if(!el||!root.contains(el)){hide();return;}
    if(owner===el&&tip?.isConnected)return;hide();owner=el;
    tip=document.createElement('div');tip.className='card-block-tip';tip.id='card-block-tip';tip.setAttribute('role','tooltip');
    tip.textContent=el.dataset.blockReason!.replace(/<[^>]*>/g,'');document.body.append(tip);el.setAttribute('aria-describedby',tip.id);
    const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
    tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
    tip.style.top=Math.max(8,r.top-h-12)+'px';
  };
  root.addEventListener('pointerover',show);root.addEventListener('focusin',show);
  root.addEventListener('pointerleave',hide);root.addEventListener('focusout',hide);root.addEventListener('pointerdown',hide);
  const observer=new (root.ownerDocument.defaultView!.MutationObserver)(()=>{if(owner&&!owner.isConnected)hide();});observer.observe(root,{childList:true,subtree:true});
  return()=>{hide();observer.disconnect();root.removeEventListener('pointerover',show);root.removeEventListener('focusin',show);root.removeEventListener('pointerleave',hide);root.removeEventListener('focusout',hide);root.removeEventListener('pointerdown',hide);};
}
