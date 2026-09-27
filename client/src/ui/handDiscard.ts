import {loungeText} from './loungeText';
import {sfx} from './sound';
/** Keep the real hand on the board. Pointer capture supports mouse and touch;
 * keyboard users can focus a card and press Delete/Enter for the same flight. */
export function installHandDiscard(root:HTMLElement,count:number,pick:(uid:string)=>void):()=>void{
 const hand=root.querySelector<HTMLElement>('#hand'),target=root.querySelector<HTMLElement>('#pile-myDisc');
 if(!hand||!target)return ()=>{};
 const hint=document.createElement('div');hint.className='hand-discard-hint';hint.setAttribute('role','status');hint.textContent=loungeText(`あと${count}枚、墓地へドラッグ（手札は7枚まで）`,`Drag ${count} card(s) to the graveyard (keep 7)`,`${count}장을 묘지로 드래그 (최대 7장)`);root.append(hint);
 root.classList.add('choosing-discard');target.classList.add('discard-drop-target');
 let dead=false,busy=false,ghost:HTMLElement|undefined,source:HTMLElement|undefined,offsetX=0,offsetY=0,pointer=-1;
 const cards=[...hand.querySelectorAll<HTMLElement>('.card[data-uid]')];const tabs=cards.map(c=>c.getAttribute('tabindex'));cards.forEach(c=>{c.tabIndex=0;c.classList.add('discard-draggable');});
 const reset=()=>{ghost?.remove();ghost=undefined;source?.classList.remove('discard-dragging');source=undefined;target.classList.remove('is-drop-over');};
 const over=(x:number,y:number)=>{const r=target.getBoundingClientRect();return x>=r.left-24&&x<=r.right+24&&y>=r.top-24&&y<=r.bottom+24;};
 const lift=(card:HTMLElement,x?:number,y?:number)=>{source=card;const r=card.getBoundingClientRect();offsetX=x==null?r.width/2:x-r.left;offsetY=y==null?r.height/2:y-r.top;ghost=card.cloneNode(true) as HTMLElement;ghost.removeAttribute('id');ghost.classList.add('discard-flight');Object.assign(ghost.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,transform:'none',margin:'0',pointerEvents:'none',zIndex:'15000'});document.body.append(ghost);card.classList.add('discard-dragging');};
 const drop=async()=>{if(!source||!ghost||busy)return;busy=true;const uid=source.dataset.uid!,r=ghost.getBoundingClientRect(),to=target.getBoundingClientRect();const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:360;sfx('pop');
  await ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left+to.width/2-r.left-r.width/2}px,${to.top+to.height/2-r.top-r.height/2}px) scale(.25) rotate(-12deg)`,opacity:0}],{duration,easing:'cubic-bezier(.3,.05,.5,1)',fill:'forwards'}).finished.catch(()=>{});
  reset();if(!dead)pick(uid);
 };
 const down=(e:PointerEvent)=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.card[data-uid]');if(!c||!hand.contains(c)||busy||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();pointer=e.pointerId;hand.setPointerCapture(pointer);lift(c,e.clientX,e.clientY);};
 const move=(e:PointerEvent)=>{if(e.pointerId!==pointer||!ghost||busy)return;e.preventDefault();e.stopImmediatePropagation();ghost.style.left=`${e.clientX-offsetX}px`;ghost.style.top=`${e.clientY-offsetY}px`;target.classList.toggle('is-drop-over',over(e.clientX,e.clientY));};
 const up=(e:PointerEvent)=>{if(e.pointerId!==pointer||!ghost||busy)return;e.preventDefault();e.stopImmediatePropagation();pointer=-1;if(over(e.clientX,e.clientY))void drop();else reset();};
 const cancel=()=>{pointer=-1;if(!busy)reset();};
 const click=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
 const key=(e:KeyboardEvent)=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.card[data-uid]');if(c&&hand.contains(c)&&!busy&&['Enter','Delete'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();lift(c);void drop();}};
 hand.addEventListener('pointerdown',down,true);hand.addEventListener('pointermove',move,true);hand.addEventListener('pointerup',up,true);hand.addEventListener('pointercancel',cancel,true);hand.addEventListener('click',click,true);hand.addEventListener('keydown',key,true);
 return ()=>{dead=true;reset();hint.remove();root.classList.remove('choosing-discard');target.classList.remove('discard-drop-target');cards.forEach((c,i)=>{c.classList.remove('discard-draggable');if(tabs[i]==null)c.removeAttribute('tabindex');else c.setAttribute('tabindex',tabs[i]!);});hand.removeEventListener('pointerdown',down,true);hand.removeEventListener('pointermove',move,true);hand.removeEventListener('pointerup',up,true);hand.removeEventListener('pointercancel',cancel,true);hand.removeEventListener('click',click,true);hand.removeEventListener('keydown',key,true);};
}
