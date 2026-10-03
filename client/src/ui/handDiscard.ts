import {loungeText} from './loungeText';
import {sfx} from './sound';
import {handCardMatrix} from './handGeometry';

/** Keep the real hand on the board. Pointer capture supports mouse and touch;
 * keyboard users can focus a card and press Delete/Enter for the same flight. */
export function installHandDiscard(root:HTMLElement,count:number,pick:(uid:string)=>void,reflow:()=>void):()=>void {
 const hand=root.querySelector<HTMLElement>('#hand'),target=root.querySelector<HTMLElement>('#pile-myDisc');
 if(!hand||!target)return ()=>{};
 const hint=document.createElement('div');hint.className='hand-discard-hint';hint.setAttribute('role','status');hint.textContent=loungeText(`あと${count}枚、墓地へドラッグ（手札は7枚まで）`,`Drag ${count} card(s) to the graveyard (keep 7)`,`${count}장을 묘지로 드래그 (최대 7장)`);root.append(hint);
 root.classList.add('choosing-discard');target.classList.add('discard-drop-target');
 const dropLabel=document.createElement('span');dropLabel.className='discard-drop-label';dropLabel.textContent=loungeText('ここにドロップ','Drop here','여기에 놓기');target.append(dropLabel);
 let dead=false,busy=false,submitted=false,ghost:HTMLElement|undefined,source:HTMLElement|undefined,next:ChildNode|null=null,pointer=-1;
 let pose=new DOMMatrix(),startX=0,startY=0,width=0,height=0,flight:Animation|undefined;
 const cards=[...hand.querySelectorAll<HTMLElement>('.card[data-uid]')];const tabs=cards.map(c=>c.getAttribute('tabindex'));cards.forEach(c=>{c.tabIndex=0;c.classList.add('discard-draggable');});
 const release=()=>{const id=pointer;pointer=-1;if(id>=0&&hand.hasPointerCapture(id))hand.releasePointerCapture(id);};
 const reset=()=>{
  flight?.cancel();flight=undefined;ghost?.remove();ghost=undefined;
  // A server timeout/reconnect may interrupt the drop. Restore the source so
  // authoritative playback still has an origin; never submit a stale choice.
  if(source&&!source.isConnected&&!submitted){hand.insertBefore(source,next?.parentNode===hand?next:null);reflow();}
  source?.classList.remove('discard-dragging');source=undefined;target.classList.remove('is-drop-over');
 };
 const over=(x:number,y:number)=>{const r=target.getBoundingClientRect();return x>=r.left-24&&x<=r.right+24&&y>=r.top-24&&y<=r.bottom+24;};
 const lift=(card:HTMLElement,x=0,y=0)=>{
  source=card;next=card.nextSibling;startX=x;startY=y;pose=handCardMatrix(card);
  const cs=getComputedStyle(card);width=parseFloat(cs.width)||card.offsetWidth;height=parseFloat(cs.height)||card.offsetHeight;
  ghost=card.cloneNode(true) as HTMLElement;ghost.removeAttribute('id');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');ghost.classList.remove('discard-draggable');ghost.classList.add('discard-flight');
  Object.assign(ghost.style,{position:'fixed',left:'0',top:'0',bottom:'auto',width:`${width}px`,height:`${height}px`,transform:pose.toString(),transformOrigin:'0 0',transition:'none',animation:'none',margin:'0',pointerEvents:'none',zIndex:'2000'});
  document.body.append(ghost);card.classList.add('discard-dragging');
 };
 const drop=async()=>{
  if(!source||!ghost||busy)return;busy=true;
  const uid=source.dataset.uid!,node=ghost,to=target.getBoundingClientRect();
  const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:360;
  const landing=new DOMMatrix().translate(to.left+to.width/2,to.top+to.height/2).rotate(-12).scale(Math.min(to.width/width,.35)).translate(-width/2,-height/2);
  // Remove the slot now, while the held card is still flying to the shelf.
  source.remove();reflow();sfx('discard');
  flight=node.animate([{transform:node.style.transform,opacity:1},{transform:landing.toString(),opacity:0}],{duration,easing:'cubic-bezier(.22,.65,.3,1)',fill:'forwards'});
  await flight.finished.catch(()=>{});
  if(dead)return;
  submitted=true;reset();
  // The next turn (and its draw) cannot start until this single flight lands.
  pick(uid);
 };
 const down=(e:PointerEvent)=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.card[data-uid]');if(!c||!hand.contains(c)||busy||pointer>=0||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();pointer=e.pointerId;hand.setPointerCapture(pointer);lift(c,e.clientX,e.clientY);};
 const move=(e:PointerEvent)=>{if(e.pointerId!==pointer||!ghost||busy)return;e.preventDefault();e.stopImmediatePropagation();const moved=new DOMMatrix(pose.toString());moved.m41+=e.clientX-startX;moved.m42+=e.clientY-startY;ghost.style.transform=moved.toString();target.classList.toggle('is-drop-over',over(e.clientX,e.clientY));};
 const up=(e:PointerEvent)=>{if(e.pointerId!==pointer||!ghost||busy)return;e.preventDefault();e.stopImmediatePropagation();release();if(over(e.clientX,e.clientY))void drop();else reset();};
 const cancel=()=>{if(pointer<0)return;release();if(!busy)reset();};
 const click=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
 const key=(e:KeyboardEvent)=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.card[data-uid]');if(c&&hand.contains(c)&&!busy&&!ghost&&['Enter','Delete'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();lift(c);void drop();}};
 hand.addEventListener('pointerdown',down,true);hand.addEventListener('pointermove',move,true);hand.addEventListener('pointerup',up,true);hand.addEventListener('pointercancel',cancel,true);hand.addEventListener('lostpointercapture',cancel,true);hand.addEventListener('click',click,true);hand.addEventListener('keydown',key,true);
 return ()=>{
  dead=true;release();reset();hint.remove();dropLabel.remove();root.classList.remove('choosing-discard');target.classList.remove('discard-drop-target');
  cards.forEach((c,i)=>{c.classList.remove('discard-draggable');if(tabs[i]==null)c.removeAttribute('tabindex');else c.setAttribute('tabindex',tabs[i]!);});
  hand.removeEventListener('pointerdown',down,true);hand.removeEventListener('pointermove',move,true);hand.removeEventListener('pointerup',up,true);hand.removeEventListener('pointercancel',cancel,true);hand.removeEventListener('lostpointercapture',cancel,true);hand.removeEventListener('click',click,true);hand.removeEventListener('keydown',key,true);
 };
}
