import {loungeText} from './loungeText';
type DragOptions={signal:AbortSignal;pool:HTMLElement;editor:HTMLElement;hand:HTMLElement;removeArea:HTMLElement;canRemove:(id:string,index:number)=>boolean;remove:(id:string,index:number)=>void;canAdd:(id:string)=>boolean;full:()=>boolean;drop:(id:string,index:number|null)=>void;notice:(message:string)=>void};
/** Pointer drag keeps the original card in place and never changes state until drop. */
export function installDeckDrag(o:DragOptions){
 let drag:{id:string;index:number|null;pointer:number;face:HTMLElement;x:number;y:number;ghost:HTMLElement|null}|null=null;
 let suppressUntil=0,scrollFrame=0,pointX=0,pointY=0;
 const scrollHand=()=>{if(!drag?.ghost||drag.index!==null)return;const r=o.hand.getBoundingClientRect();if(pointY>=r.top&&pointY<=r.bottom&&pointX>=r.left&&pointX<=r.right){const step=pointX<r.left+36?-8:pointX>r.right-36?8:0;o.hand.scrollLeft+=step}scrollFrame=requestAnimationFrame(scrollHand)};
 const guide=document.createElement('div');guide.className='deck-drag-guide';guide.setAttribute('role','status');o.editor.append(guide);
 const targetAt=(x:number,y:number)=>{
  const r=o.hand.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return undefined;
  const target=document.elementFromPoint(x,y)?.closest<HTMLElement>('.deck-cur>.deck-entry:not(.deck-slot)');
  return target?Array.from(o.hand.children).indexOf(target):null;
 };
 const overPool=(x:number,y:number)=>{const target=document.elementFromPoint(x,y);return !!target&&o.removeArea.contains(target)};
 const clear=()=>{cancelAnimationFrame(scrollFrame);if(!drag)return;if(drag.ghost)suppressUntil=performance.now()+500;drag.ghost?.remove();drag.face.classList.remove('deck-drag-source');if(drag.face.hasPointerCapture?.(drag.pointer))drag.face.releasePointerCapture(drag.pointer);drag=null;o.editor.classList.remove('deck-drag-over','dragging-card');o.hand.querySelector('.deck-drop-target')?.classList.remove('deck-drop-target');o.removeArea.classList.remove('deck-remove-over');guide.textContent=''};
 for(const source of [o.pool,o.hand]){
 source.addEventListener('dragstart',e=>e.preventDefault(),{signal:o.signal});
 source.addEventListener('pointerdown',e=>{
  // Preserve native scrolling on touchscreens; the +/− controls remain available.
  if(e.button!==0||e.pointerType==='touch'||drag)return;
  const face=(e.target as Element).closest<HTMLElement>('.card');if(!face)return;
  const row=face.closest<HTMLElement>(source===o.pool?'.deck-pool-tile':'.deck-entry');if(!row)return;
  const id=(source===o.pool?row.dataset.deckCard:row.dataset.card)!;
  const index=source===o.pool?null:Number(row.dataset.index)-1;
  if(index===null?!o.canAdd(id):!o.canRemove(id,index))return;
  drag={id,index,pointer:e.pointerId,face,x:e.clientX,y:e.clientY,ghost:null};face.setPointerCapture(e.pointerId);
 },{signal:o.signal});
 }
 document.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;pointX=e.clientX;pointY=e.clientY;
  if(!drag.ghost){
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
   const ghost=document.createElement('div');ghost.className='deck-drag-ghost';ghost.style.width=`${drag.face.getBoundingClientRect().width}px`;
   ghost.append(drag.face.cloneNode(true));ghost.querySelectorAll('[tabindex]').forEach(e=>e.removeAttribute('tabindex'));ghost.setAttribute('aria-hidden','true');document.body.append(ghost);drag.ghost=ghost;
   drag.face.classList.add('deck-drag-source');o.editor.classList.add('dragging-card');scrollFrame=requestAnimationFrame(scrollHand);
  }
  e.preventDefault();drag.ghost.style.left=`${e.clientX-drag.ghost.offsetWidth/2}px`;drag.ghost.style.top=`${e.clientY-45}px`;
  if(drag.index!==null){
   o.removeArea.classList.toggle('deck-remove-over',overPool(e.clientX,e.clientY));
   guide.textContent=loungeText('カードリストにドロップして外す','Drop into the card list to remove','카드 목록에 놓아 제거');return;
  }
  const target=targetAt(e.clientX,e.clientY);o.editor.classList.toggle('deck-drag-over',target!==undefined&&target!==0);
  o.hand.querySelector('.deck-drop-target')?.classList.remove('deck-drop-target');
  if(o.full()&&typeof target==='number'&&target>0)o.hand.children[target].classList.add('deck-drop-target');
  guide.textContent=target===0?loungeText('アチューンは固定です','Attune is fixed','어튠은 고정입니다'):o.full()?(typeof target==='number'?loungeText('このカードと入れ替え','Replace this card','이 카드와 교체'):loungeText('入れ替えるカードに重ねてドロップ','Drop on the card to replace','교체할 카드 위에 놓기')):loungeText('編成エリアにドロップして追加','Drop into the deck to add','편성 영역에 놓아 추가');
 },{signal:o.signal});
 document.addEventListener('pointerup',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  const {id,index}=drag,started=!!drag.ghost,target=targetAt(e.clientX,e.clientY),removeTarget=overPool(e.clientX,e.clientY);clear();
  if(!started)return;suppressUntil=performance.now()+500;
  if(index!==null){if(removeTarget&&o.canRemove(id,index))o.remove(id,index);return;}
  if(target===undefined)return;if(target===0){o.notice(loungeText('アチューンは固定です','Attune is fixed','어튠은 고정입니다'));return}
  if(!o.canAdd(id)){o.notice(loungeText('所持枚数の上限です','Owned copy limit reached','보유 수량 한도입니다'));return}
  o.drop(id,typeof target==='number'?target-1:null);
 },{signal:o.signal});
 document.addEventListener('click',e=>{if(performance.now()<suppressUntil&&(e.target as Element).closest('#deckPool .card,#deckCur .card')){suppressUntil=0;e.preventDefault();e.stopPropagation()}},{capture:true,signal:o.signal});
 document.addEventListener('pointercancel',clear,{signal:o.signal});window.addEventListener('blur',clear,{signal:o.signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){suppressUntil=performance.now()+500;clear();e.preventDefault()}},{signal:o.signal});
 o.signal.addEventListener('abort',()=>{clear();guide.remove()},{once:true});
 return clear;
}
