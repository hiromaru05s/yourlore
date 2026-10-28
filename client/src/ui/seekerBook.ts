import {BOOK_CHAPTERS,BOOK_PAGES,bookReference,bookStorageKey,type ReferenceKind} from '../shared/seekerBook';
import {DB,STARTERS} from '../shared/cards';
import {getLang,cardName} from '../i18n';
import {loungeText as text} from './loungeText';
import {artUrl} from './cardArt';
import {zoomCard,closeZoom} from './cardInspection';
import type {App} from '../router';
import '../styles/seekerBook.css';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const norm=(s:string)=>s.normalize('NFKC').toLocaleLowerCase();
export function mountSeekerBook(host:HTMLElement,app:App):{openReference():void;destroy():void}{
 const lang=getLang(),storageKey=bookStorageKey(app.user?.id),entries=bookReference(lang);
 let page=0,query='',kind:ReferenceKind|'all'='all',resultPage=0;
 try{const saved=localStorage.getItem(storageKey);const found=BOOK_PAGES.findIndex(p=>p.id===saved);if(found>=0)page=found;}catch{}
 const reference=BOOK_PAGES.length-1;
 host.classList.add('seeker-book');
 const save=()=>{try{localStorage.setItem(storageKey,BOOK_PAGES[page].id);}catch{}};
 const label=(kind:ReferenceKind|'all')=>({all:text('すべて','All','전체'),rules:text('共通ルール','General rules','공통 규칙'),passives:text('パッシブ','Passives','패시브'),tribes:text('種族','Tribes','종족'),cards:text('全カード','All cards','모든 카드')})[kind];
 const go=(index:number,focus=true)=>{page=Math.max(0,Math.min(reference,index));save();render();if(focus)host.querySelector<HTMLElement>('.seeker-page-title')?.focus({preventScroll:true});host.querySelector('.seeker-volume')?.scrollIntoView({block:'start',behavior:'instant'});};
 function renderReference():void{
  const matches=entries.filter(e=>(kind==='all'||e.kind===kind)&&(!query||norm([e.title,...e.body].join(' ')).includes(norm(query))));
  const count=Math.max(1,Math.ceil(matches.length/8));resultPage=Math.min(resultPage,count-1);
  const list=host.querySelector<HTMLElement>('.seeker-reference-results')!;
  list.innerHTML=matches.slice(resultPage*8,resultPage*8+8).map(e=>`<details class="seeker-reference-entry" data-reference="${esc(e.id)}"><summary><span>${esc(label(e.kind))}</span><b>${esc(e.title)}</b><i aria-hidden="true">＋</i></summary><div class="seeker-reference-body">${e.cardId?`<button class="lore-button seeker-inspect" data-inspect="${esc(e.cardId)}">${text('カードを拡大','Inspect card','카드 확대')} ↗</button>`:''}${e.body.map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}</div></details>`).join('')||`<p class="seeker-empty">${text('該当する項目がありません。言葉を短くするか、分類を変えてみよう。','No matches. Try a shorter phrase or another category.','일치하는 항목이 없어. 짧은 단어나 다른 분류를 시도해 봐.')}</p>`;
  host.querySelector('.seeker-result-count')!.textContent=text(`${matches.length}項目 · ${resultPage+1} / ${count}ページ`,`${matches.length} entries · Page ${resultPage+1} of ${count}`,`${matches.length}항목 · ${resultPage+1} / ${count}페이지`);
  (host.querySelector('[data-results-prev]') as HTMLButtonElement).disabled=resultPage===0;
  (host.querySelector('[data-results-next]') as HTMLButtonElement).disabled=resultPage===count-1;
  list.querySelectorAll<HTMLButtonElement>('[data-inspect]').forEach(b=>b.onclick=()=>{const card=DB[b.dataset.inspect!]??STARTERS[b.dataset.inspect!];if(card)zoomCard({...card,uid:'book-'+card.id});});
 }
 function render():void{
  const current=BOOK_PAGES[page],chapter=BOOK_CHAPTERS.find(c=>c.id===current.chapter)!,chapterIndex=BOOK_CHAPTERS.indexOf(chapter),isReference=page===reference;
  const card=DB[current.art]??STARTERS[current.art];
  host.innerHTML=`<div class="seeker-desk"><nav class="seeker-contents" aria-label="${text('修練書の目次','Book contents','수련서 목차')}"><div class="seeker-contents-label">${text('目次','CONTENTS','목차')}</div>${BOOK_CHAPTERS.map((ch,i)=>`<button type="button" class="seeker-chapter lore-button lore-button-quiet" data-chapter="${ch.id}" ${ch.id===current.chapter?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span><b>${esc(ch.title[lang])}</b></button>`).join('')}</nav>
  <div class="seeker-volume lore-surface ${isReference?'is-reference':''}"><div class="seeker-folio-top"><label class="seeker-mobile-contents"><span>${text('章','Chapter','장')}</span><select aria-label="${text('章を選ぶ','Choose a chapter','장 선택')}">${BOOK_CHAPTERS.map(ch=>`<option value="${ch.id}" ${ch.id===current.chapter?'selected':''}>${esc(ch.title[lang])}</option>`).join('')}</select></label><span class="seeker-running-title">${String(chapterIndex+1).padStart(2,'0')} / ${esc(chapter.title[lang])}</span><span class="seeker-folio-number">${String(page+1).padStart(2,'0')} <small>/ ${BOOK_PAGES.length}</small></span></div>
  <div class="seeker-spread">${!isReference?`<figure class="seeker-plate">${card?`<img src="${artUrl.full(card.id)}" alt="${esc(cardName({...card,uid:'book-art'}))}"><figcaption><span>LORE / ${String(chapterIndex+1).padStart(2,'0')}</span><b>${esc(cardName({...card,uid:'book-art'}))}</b><button class="lore-button lore-button-quiet" data-art-inspect>${text('カードを読む','Read this card','카드 읽기')} ↗</button></figcaption>`:''}</figure>`:''}
  <article class="seeker-leaf"><span class="seeker-chapter-caption">${esc(chapter.title[lang])}</span><h2 class="seeker-page-title" tabindex="-1">${esc(current.title[lang])}</h2>${current.figure?`<div class="seeker-example">${esc(current.figure[lang])}</div>`:''}<div class="seeker-prose">${current.body[lang].split('\n').map(p=>`<p>${esc(p)}</p>`).join('')}</div>${current.route?`<button class="lore-button seeker-route" data-route="${current.route}">${current.route==='deck'?text('デッキを開く','Open Deck','덱 열기'):text('ショップを開く','Open Shop','상점 열기')} ↗</button>`:''}${!isReference?`<button class="lore-button lore-button-quiet seeker-reference-link" data-reference-open>${text('ルール総覧で調べる','Open full reference','규칙 총람 열기')} →</button>`:''}</article></div>
  ${isReference?`<section class="seeker-reference" aria-label="${text('ルール総覧の検索','Search the full reference','규칙 총람 검색')}"><div class="seeker-reference-controls"><label><span>${text('用語・カード名・効果を探す','Find a rule, card or effect','용어·카드명·효과 찾기')}</span><input type="search" value="${esc(query)}" placeholder="${text('例：孵化、最大マナ、カル','Try: hatch, maximum mana, Cull','예: 부화, 최대 마나, 컬')}"></label><label><span>${text('分類','Category','분류')}</span><select data-kind>${(['all','rules','passives','tribes','cards'] as const).map(k=>`<option value="${k}" ${kind===k?'selected':''}>${label(k)}</option>`).join('')}</select></label></div><div class="seeker-reference-results"></div><div class="seeker-results-nav"><button class="lore-button lore-button-quiet" data-results-prev>${text('前の項目','Previous entries','이전 항목')}</button><span class="seeker-result-count" role="status"></span><button class="lore-button lore-button-quiet" data-results-next>${text('次の項目','Next entries','다음 항목')}</button></div></section>`:''}
  <footer class="seeker-page-nav"><button class="lore-button lore-button-quiet" data-prev ${page===0?'disabled':''}>← ${text('前のページ','Previous page','이전 페이지')}</button><span class="seeker-page-status" role="status">${page+1} / ${BOOK_PAGES.length}</span><button class="lore-button ${isReference?'lore-button-quiet':'lore-button-primary'}" ${isReference?'data-home':'data-next'}>${isReference?text('ホームへ','Home','홈으로'):text('次のページ','Next page','다음 페이지')} →</button></footer></div></div>`;
  host.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.onclick=()=>go(BOOK_PAGES.findIndex(p=>p.chapter===b.dataset.chapter)));
  host.querySelector<HTMLSelectElement>('.seeker-mobile-contents select')!.onchange=e=>go(BOOK_PAGES.findIndex(p=>p.chapter===(e.target as HTMLSelectElement).value));
  host.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>go(page-1);
  host.querySelector<HTMLButtonElement>('[data-next]')?.addEventListener('click',()=>go(page+1));
  host.querySelector<HTMLButtonElement>('[data-home]')?.addEventListener('click',()=>app.home());
  host.querySelector<HTMLButtonElement>('[data-reference-open]')?.addEventListener('click',()=>go(reference));
  host.querySelector<HTMLButtonElement>('[data-route]')?.addEventListener('click',()=>current.route==='deck'?app.deck():app.shop());
  host.querySelector<HTMLButtonElement>('[data-art-inspect]')?.addEventListener('click',()=>{if(card)zoomCard({...card,uid:'book-art'});});
  if(isReference){
   host.querySelector<HTMLInputElement>('.seeker-reference input')!.oninput=e=>{query=(e.target as HTMLInputElement).value;resultPage=0;renderReference();};
   host.querySelector<HTMLSelectElement>('[data-kind]')!.onchange=e=>{kind=(e.target as HTMLSelectElement).value as typeof kind;resultPage=0;renderReference();};
   host.querySelector<HTMLButtonElement>('[data-results-prev]')!.onclick=()=>{resultPage--;renderReference();};
   host.querySelector<HTMLButtonElement>('[data-results-next]')!.onclick=()=>{resultPage++;renderReference();};
   renderReference();
  }
 }
 const onKey=(e:KeyboardEvent)=>{if(e.altKey||e.ctrlKey||e.metaKey||document.querySelector('#zoomOverlay')||!host.contains(document.activeElement))return;if((e.target as HTMLElement).closest('input,select,textarea,button,summary'))return;if(e.key==='ArrowRight'&&page<reference){e.preventDefault();go(page+1);}if(e.key==='ArrowLeft'&&page>0){e.preventDefault();go(page-1);}};
 host.addEventListener('keydown',onKey);render();
 return{openReference(){go(reference);},destroy(){host.removeEventListener('keydown',onKey);closeZoom();host.replaceChildren();}};
}
