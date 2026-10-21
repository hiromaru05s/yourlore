import type {CardInst} from '../shared/types';
import {effectReferenceParts,referenceTitle,referenceCardIds,REFERENCE_CARDS,type CardReference} from '../shared/cardReferences';
import {cardEl,cardRulesEl,prefetchZoomArt} from './cardView';
import {cardName,getLang} from '../i18n';

/** Scoped to one inspector. Hover never replaces the inspected card or its scroll position. */
export function bindCardReferences(overlay:HTMLElement, source:CardInst, openCard:(c:CardInst)=>void):(restoreFocus?:boolean)=>boolean {
  let popup:HTMLElement|null=null,anchor:HTMLButtonElement|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  let openTimer:ReturnType<typeof setTimeout>|undefined,restoringFocus=false;
  const lang=getLang();
  const close=(restoreFocus=false):boolean=>{
    clearTimeout(timer);clearTimeout(openTimer);if(!popup)return false;
    const from=anchor;popup.remove();popup=null;anchor?.setAttribute('aria-expanded','false');anchor=null;
    if(restoreFocus&&from){restoringFocus=true;from.focus({preventScroll:true});restoringFocus=false;}
    window.removeEventListener('resize',onResize);return true;
  };
  const onResize=()=>{close();};
  const deferClose=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!popup?.matches(':hover')&&!popup?.contains(document.activeElement)&&document.activeElement!==anchor)close();},180);};
  const show=(button:HTMLButtonElement,ref:CardReference)=>{
    clearTimeout(timer);if(anchor===button&&popup)return;close();anchor=button;
    popup=document.createElement('section');popup.className='card-reference-preview';popup.id='card-reference-preview';
    popup.setAttribute('role','dialog');popup.setAttribute('aria-label',referenceTitle(ref,lang));
    popup.dataset.referenceKind=ref.kind;popup.dataset.referenceId=ref.id;
    const header=document.createElement('header');const title=document.createElement('strong');title.textContent=referenceTitle(ref,lang);
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.className='reference-close';
    dismiss.setAttribute('aria-label',{ja:'プレビューを閉じる',ko:'미리보기 닫기',en:'Close preview'}[lang]);
    dismiss.onclick=e=>{e.stopPropagation();const from=anchor;close();from?.focus({preventScroll:true});close();};header.append(title,dismiss);popup.append(header);
    const list=document.createElement('div');list.className=ref.kind==='series'?'reference-member-grid':'reference-single';
    for(const id of referenceCardIds(ref)) {
      const c={...REFERENCE_CARDS[id],uid:'reference_'+id};
      const item=document.createElement('button');item.type='button';item.className='reference-member';item.dataset.cardId=id;
      item.setAttribute('aria-label',cardName(c));item.append(cardEl(c,{fullArt:true}));
      const caption=document.createElement('span');caption.textContent=cardName(c);item.append(caption);
      item.onclick=e=>{e.stopPropagation();close();openCard(c);};list.append(item);
      if(ref.kind==='card') {const rules=cardRulesEl(c);rules.classList.add('reference-rules');list.append(rules);}
    }
    if(ref.kind==='series') {const note=document.createElement('p');note.className='reference-series-note';note.textContent={ja:`該当カード ${referenceCardIds(ref).length}枚。効果の対象は本文の条件に従います。`,ko:`해당 카드 ${referenceCardIds(ref).length}장. 효과 대상은 본문의 조건을 따릅니다.`,en:`${referenceCardIds(ref).length} matching cards. Effect targets still follow the conditions in the text.`}[lang];popup.append(note);}
    popup.append(list);overlay.append(popup);button.setAttribute('aria-expanded','true');
    const r=button.getBoundingClientRect(),p=popup.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
    const right=r.right+12,hasRight=right+p.width<=vw-12,hasLeft=r.left-p.width-12>=12;
    let left:number,top:number;
    if(hasRight||hasLeft){left=hasRight?right:r.left-p.width-12;top=Math.max(12,Math.min(r.top,vh-p.height-12));}
    else {
      left=Math.max(12,Math.min(r.left,vw-p.width-12));
      const below=vh-r.bottom-24,above=r.top-24,useBelow=below>=above;
      popup.style.maxHeight=`${Math.max(80,Math.min(650,useBelow?below:above))}px`;
      top=useBelow?r.bottom+12:Math.max(12,r.top-popup.getBoundingClientRect().height-12);
    }
    popup.style.left=`${left}px`;popup.style.top=`${top}px`;
    popup.onpointerenter=()=>clearTimeout(timer);popup.onpointerleave=deferClose;
    popup.addEventListener('focusout',deferClose);popup.onclick=e=>e.stopPropagation();popup.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();};
    window.addEventListener('resize',onResize);
  };
  for(const body of overlay.querySelectorAll<HTMLElement>('.card-effect-body,.dr-fx,.psv-desc,.zoom-tribe > .note,.zoom-tribe > .b')) {
    const text=body.textContent??'';body.replaceChildren();
    for(const part of effectReferenceParts(text,lang,source.id)) {
      if(!part.reference){body.append(document.createTextNode(part.text));continue;}
      const ref=part.reference,button=document.createElement('button');button.type='button';button.className='card-reference-link';button.textContent=part.text;
      button.dataset.referenceKind=ref.kind;button.dataset.referenceId=ref.id;
      button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','card-reference-preview');
      const schedule=()=>{clearTimeout(openTimer);openTimer=setTimeout(()=>{if(button.isConnected)show(button,ref);},80);};
      button.onpointerenter=()=>{if(ref.kind==='card')prefetchZoomArt(ref.id,true);schedule();};
      button.onpointerleave=()=>{clearTimeout(openTimer);deferClose();};
      button.onfocus=()=>{if(!restoringFocus)schedule();};button.onblur=()=>{clearTimeout(openTimer);deferClose();};
      button.onclick=e=>{e.stopPropagation();if(ref.kind==='card'){close();openCard({...REFERENCE_CARDS[ref.id],uid:'reference_'+ref.id});}else show(button,ref);};
      button.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();show(button,ref);popup?.querySelector<HTMLElement>('.reference-member')?.focus();}};
      body.append(button);
    }
  }
  overlay.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target as Node)&&!(e.target as Element).closest('.card-reference-link'))close();});
  overlay.addEventListener('scroll',e=>{if(popup&&!popup.contains(e.target as Node))close();},true);
  return close;
}
