/** Native touch scrolling, mouse dragging, and the shared NPC page arrows. */
export function bindStoryGallery(root:HTMLElement,selected:number):()=>void {
 const track=root.querySelector<HTMLElement>('.ss-gallery-track')!;
 const prev=root.querySelector<HTMLButtonElement>('[data-gallery-prev]')!;
 const next=root.querySelector<HTMLButtonElement>('[data-gallery-next]')!;
 const position=root.querySelector<HTMLElement>('.ss-gallery-position')!;
 const cards=Array.from(track.querySelectorAll<HTMLElement>('[data-chapter]'));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const offset=(card:HTMLElement)=>card.offsetLeft;
 const step=()=>cards.length>1?offset(cards[1])-offset(cards[0]):track.clientWidth;
 const update=()=>{
  prev.disabled=track.scrollLeft<=5;
  next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;
  position.textContent=`${String(Math.min(cards.length,Math.round(track.scrollLeft/step())+1)).padStart(2,'0')} — ${String(cards.length).padStart(2,'0')}`;
 };
 const move=(direction:number)=>track.scrollBy({left:step()*direction,behavior:reduce?'instant':'smooth'});
 prev.onclick=()=>move(-1);next.onclick=()=>move(1);
 track.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};
 let pointer:number|undefined,start=0,left=0,dragged=false,suppressUntil=0;
 track.onpointerdown=e=>{
  if(e.pointerType!=='mouse'||e.button!==0)return;
  pointer=e.pointerId;start=e.clientX;left=track.scrollLeft;dragged=false;
 };
 track.onpointermove=e=>{
  if(pointer!==e.pointerId)return;
  if(Math.abs(e.clientX-start)>6&&!dragged){dragged=true;suppressUntil=performance.now()+600;track.classList.add('is-dragging');track.setPointerCapture(e.pointerId);}
  if(dragged){e.preventDefault();track.scrollLeft=left-(e.clientX-start);}
 };
 const finish=()=>{
  if(pointer!==undefined&&track.hasPointerCapture(pointer))track.releasePointerCapture(pointer);
  pointer=undefined;track.classList.remove('is-dragging');
 };
 track.onpointerup=finish;track.onpointercancel=finish;track.onlostpointercapture=finish;
 track.onpointerleave=()=>{if(!dragged)pointer=undefined;};
 track.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},true);
 track.addEventListener('dblclick',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 track.ondragstart=e=>e.preventDefault();
 track.addEventListener('scroll',update,{passive:true});
 const observer=new ResizeObserver(update);observer.observe(track);
 track.scrollLeft=Math.max(0,offset(cards[selected-1])- (track.clientWidth-cards[selected-1].clientWidth)/2);
 update();
 return()=>{observer.disconnect();finish();};
}
