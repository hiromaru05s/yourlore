import type {CardDef} from '../shared/types';
import {CARD_RULE_GLOSSARY,glossaryParagraphs,ruleTermParts} from '../shared/cardRuleGlossary';
import {getLang} from '../i18n';

/** Inline, focusable definitions. Card-name links remain independent and never nest. */
export function bindCardRuleTerms(overlay:HTMLElement,source?:CardDef):(restoreFocus?:boolean)=>boolean {
  const lang=getLang();
  let popup:HTMLElement|null=null,anchor:HTMLElement|null=null,timer:ReturnType<typeof setTimeout>|undefined,restoring=false;
  const close=(restoreFocus=false):boolean=>{
    clearTimeout(timer);if(!popup)return false;
    const from=anchor;popup.remove();popup=null;anchor?.setAttribute('aria-expanded','false');anchor=null;
    window.removeEventListener('resize',resize);
    if(restoreFocus&&from?.isConnected){restoring=true;from.focus({preventScroll:true});restoring=false;}return true;
  };
  const resize=()=>{close();};
  const deferClose=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!popup?.matches(':hover')&&!popup?.contains(document.activeElement)&&document.activeElement!==anchor)close();},180);};
  const position=()=>{
    if(!popup||!anchor)return;
    popup.style.maxHeight='';
    const r=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
    // Prefer a side; on narrow screens use the larger free vertical area.
    // Constrain the scrollable body instead of covering the term under the pointer.
    let left:number,top:number;
    if(r.right+12+p.width<=vw-12||r.left-p.width-12>=12){
      left=r.right+12+p.width<=vw-12?r.right+12:r.left-p.width-12;
      top=Math.max(12,Math.min(r.top,vh-p.height-12));
    }else{
      left=Math.max(12,Math.min(r.left,vw-p.width-12));
      const below=vh-r.bottom-20,above=r.top-20,useBelow=below>=above;
      popup.style.maxHeight=`${Math.max(100,Math.min(vh-24,useBelow?below:above))}px`;
      const height=popup.getBoundingClientRect().height;
      top=useBelow?r.bottom+8:r.top-height-8;
      top=Math.max(12,Math.min(top,vh-height-12));
    }
    popup.style.left=`${left}px`;popup.style.top=`${top}px`;
  };
  const show=(button:HTMLElement,id:string)=>{
    clearTimeout(timer);if(restoring||anchor===button&&popup)return;
    const entry=CARD_RULE_GLOSSARY.find(e=>e.id===id);if(!entry)return;
    close();overlay.dispatchEvent(new CustomEvent('card-rule-preview-open'));anchor=button;
    popup=document.createElement('section');popup.className='card-rule-tooltip lore-surface';popup.id='card-rule-tooltip';
    popup.setAttribute('role','dialog');popup.setAttribute('aria-label',entry.names[lang]);popup.dataset.ruleTerm=id;
    const header=document.createElement('header'),title=document.createElement('strong'),dismiss=document.createElement('button');
    title.textContent=entry.names[lang];dismiss.type='button';dismiss.className='rule-tooltip-close';dismiss.textContent='×';
    dismiss.setAttribute('aria-label',{ja:'説明を閉じる',ko:'설명 닫기',en:'Close explanation'}[lang]);
    dismiss.onclick=e=>{e.stopPropagation();close(true);};header.append(title,dismiss);popup.append(header);
    const content=document.createElement('div');content.className='rule-tooltip-content';
    for(const row of glossaryParagraphs(id,lang,button.dataset.abilityGroup==='owned'?source:undefined)){
      const p=document.createElement('p');if(row.label){const label=document.createElement('strong');label.textContent=row.label;label.className='rule-tooltip-label';p.append(label);}
      p.append(document.createTextNode(row.text));content.append(p);
    }
    popup.append(content);overlay.append(popup);button.setAttribute('aria-expanded','true');
    position();
    popup.onpointerenter=()=>clearTimeout(timer);popup.onpointerleave=deferClose;popup.addEventListener('focusout',deferClose);
    popup.onclick=e=>e.stopPropagation();popup.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();};
    window.addEventListener('resize',resize);
  };
  const bind=(button:HTMLElement,id:string)=>{
    button.dataset.ruleTerm=id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');if(!button.hasAttribute('aria-controls'))button.setAttribute('aria-controls','card-rule-tooltip');
    button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show(button,id);});button.addEventListener('pointerleave',deferClose);
    button.addEventListener('focus',()=>show(button,id));button.addEventListener('blur',deferClose);
    button.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();show(button,id);popup?.querySelector<HTMLButtonElement>('button')?.focus();}});
  };
  for(const body of overlay.querySelectorAll<HTMLElement>('.card-effect-body,.dr-fx,.psv-rule-text,.zoom-tribe > .note,.zoom-tribe > .b,.inspect-type')){
    const walker=document.createTreeWalker(body,4);const texts:Text[]=[];
    while(walker.nextNode())if(!walker.currentNode.parentElement?.closest('button,a,[data-rule-term]'))texts.push(walker.currentNode as Text);
    for(const node of texts){
      const parts=ruleTermParts(node.textContent??'',lang);if(!parts.some(p=>p.term))continue;
      const fragment=document.createDocumentFragment();
      for(const part of parts){if(!part.term){fragment.append(document.createTextNode(part.text));continue;}
        const button=document.createElement('button');button.type='button';button.className='card-rule-term';button.textContent=part.text;bind(button,part.term);
        button.onclick=e=>{e.stopPropagation();show(button,part.term!);};fragment.append(button);
      }node.replaceWith(fragment);
    }
  }
  for(const chip of overlay.querySelectorAll<HTMLElement>('.card-key-label[data-psv]'))bind(chip,'passive:'+chip.dataset.psv);
  overlay.addEventListener('card-reference-preview-open',()=>close());
  overlay.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target as Node)&&!(e.target as Element).closest('[data-rule-term]'))close();});
  overlay.addEventListener('scroll',e=>{
    if(!popup||popup.contains(e.target as Node))return;
    const r=anchor?.getBoundingClientRect();
    if(document.activeElement===anchor&&r&&r.bottom>0&&r.top<window.innerHeight)position();else close();
  },true);
  return close;
}
