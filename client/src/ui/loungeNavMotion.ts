/** Focus follows confirmed route changes; never bypass a screen's beforeLeave guard. */
export function mountLoungeNavMotion(nav:HTMLElement, previous:string|undefined):()=>void {
  const selected=nav.querySelector<HTMLElement>('[aria-current="page"]');
  const cursor=document.createElement('i');cursor.className='horizon-cursor';cursor.ariaHidden='true';cursor.hidden=!selected;nav.prepend(cursor);
  const animations:Animation[]=[];
  let frame=0,started=false,lastWidth=0;
  const place=()=>{
    if(!selected)return;
    const box=selected.getBoundingClientRect(),parent=nav.getBoundingClientRect();
    cursor.style.left=box.left-parent.left+'px';cursor.style.width=box.width+'px';
  };
  const observer=new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(started&&width!==lastWidth){if(lastWidth)animations.forEach(a=>a.cancel());place()}lastWidth=width});
  observer.observe(nav);
  frame=requestAnimationFrame(()=>{
    started=true;place();
    const from=Array.from(nav.querySelectorAll<HTMLElement>('[data-nav]')).find(b=>b.dataset.nav===previous);
    if(!selected||!from||from===selected||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const before=from.getBoundingClientRect(),after=selected.getBoundingClientRect();
    animations.push(cursor.animate([{transform:`translateX(${before.left-after.left}px) scaleX(${before.width/after.width})`},{transform:'translateX(0) scaleX(1)'}],{duration:360,easing:'cubic-bezier(.18,.8,.2,1)'}));
    const label=selected.querySelector('span:last-child');
    if(label)animations.push(label.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'cubic-bezier(.16,.8,.2,1)'}));
  });
  const keydown=(event:KeyboardEvent)=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-nav]'));
    const index=buttons.indexOf(event.target as HTMLButtonElement);if(index<0)return;
    event.preventDefault();
    // Arrow keys move focus only; Enter/Space uses the existing guarded router handler.
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length;
    buttons[next].focus();
  };
  nav.addEventListener('keydown',keydown);
  return ()=>{cancelAnimationFrame(frame);observer.disconnect();animations.forEach(a=>a.cancel());nav.removeEventListener('keydown',keydown)};
}
