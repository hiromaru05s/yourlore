import type { App, Screen } from '../router';
import { getLang, onLangChange } from '../i18n';
import { api } from '../net/api';
import { SINGLE_DIFFICULTIES } from '../shared/botNpcs';
import { ARIES_COMPLETED_KEY } from '../shared/ariesStory';
import { STORY_SCENES, emptySingleProgress, chapterOpen, chapterObjective, type StoryScene } from '../shared/singleStory';
import { SINGLE_CHAPTERS, STORY_NAMES } from '../shared/singleStoryText';
import { tutorialPartKey } from '../shared/tutorialPartMeta';
import { loungeText as L } from '../ui/loungeText';
import { mountSeekerBook } from '../ui/seekerBook';
import { openStoryScene, savedStoryCursor, storyCursorKey } from '../ui/storyScene';
import { mountSingleBattle } from './singleBattle';
import '../styles/singleStory.css';
import '../styles/storyGallery.css';
import pageArrow from '../assets/single/page-arrow.svg';
import { bindStoryGallery } from '../ui/storyGallery';
import { mountStoryArt } from '../ui/storyArt';
export interface SingleLocation { page?:number; tab?:'story'|'battle'|'training'; chapter?:number; book?:boolean; }
export function mountSingle(app:App,initial:SingleLocation={}):Screen {
 if(initial.tab==='battle')return mountSingleBattle(app,initial);
 const root=document.createElement('section');root.className='screen single-story-page';app.root.append(root);
 const account=app.user?.id??'guest',guest=!app.user||account==='local-guest-user';
 const guestKey='lore:single:read:v1:guest';
 let state=emptySingleProgress(),dead=false,selected=initial.chapter??1,loaded=false,closeScene:(()=>void)|undefined,book:ReturnType<typeof mountSeekerBook>|undefined;
 const tab=initial.tab??'story';let bookOpen=!!initial.book;
 let galleryCleanup:(()=>void)|undefined,artCleanup:(()=>void)|undefined;
 let masterSheet:HTMLDialogElement|undefined,restartSheet:HTMLDialogElement|undefined;
 const read=(scene:StoryScene)=>state.read.includes(scene);
 const header=()=>`<nav class="ss-tabs" aria-label="${L('シングル','Single','싱글')}">${(['story','battle','training'] as const).map((id,i)=>`<button data-tab="${id}" aria-pressed="${tab===id}">${[L('ストーリー','Story','스토리'),L('対戦','Battle','대전'),L('修練','Training','수련')][i]}</button>`).join('')}</nav>`;
 const bindNav=()=>root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>app.single({tab:b.dataset.tab as SingleLocation['tab']}));
 function showScene(scene:StoryScene,afterComplete?:()=>void){
  let completed=false;
  if(closeScene)return;
  closeScene=openStoryScene(scene,account,async()=>{
   if(guest){const next=[...new Set([...state.read,scene])];localStorage.setItem(guestKey,JSON.stringify(next));state={...state,read:next};}
   else {const next=await api.readSingleScene(scene);if(dead||app.user?.id!==account)return;state=next;}
   completed=true;
  },()=>{closeScene=undefined;if(!dead){render();if(completed&&afterComplete)afterComplete();else root.querySelector<HTMLButtonElement>(`[data-continue="${selected}"]:enabled, [data-restart="${selected}"]`)?.focus({preventScroll:true});}});
 }
 function renderTraining(){
  book?.destroy();book=undefined;
  root.innerHTML=header()+`<main class="ss-training"><header><span class="ss-eyebrow">BIBLION / PRACTICE</span><h1>${L('修練','Training','수련')}</h1><p>${L('必要なときに読み、何度でも試す。','Read when you need to. Practice as often as you like.','필요할 때 읽고, 몇 번이고 연습하세요.')}</p></header>
   <section class="ss-book-card"><div><small>01 / COMPANION</small><h2>${L('シーカー修練書','Seeker’s Companion','시커 수련서')}</h2><p>${L('基本からカード・種族・効果のルールまで。','From the basics to cards, tribes and effects.','기본부터 카드·종족·효과의 규칙까지.')}</p></div><button class="lore-button lore-button-primary" data-book>${bookOpen?L('本を閉じる','Close book','책 닫기'):L('修練書を開く','Open book','수련서 열기')}</button></section><div class="ss-book-host" ${bookOpen?'':'hidden'}></div>
   <section class="ss-practices"><div><h2>${L('基礎チュートリアル','Basic tutorial','기초 튜토리얼')}</h2><p>${L('召喚・攻撃・購入を実際の盤面で練習。','Practice summoning, attacking and buying on the board.','실제 보드에서 소환·공격·구매를 연습해요.')}</p><button class="lore-button" data-tutorial>${L('実習する','Practice','실습하기')} →</button></div><div><h2>${L('デッキ作りの実習','Deck-building practice','덱 만들기 실습')}</h2><p>${L('ガチャ・スターター購入・デッキ編集を体験。','Try drawing cards, buying starters and editing a deck.','뽑기·스타터 구매·덱 편집을 체험해요.')}</p><button class="lore-button" data-deck-tutorial>${L('案内を受ける','Get guidance','안내받기')} →</button></div></section></main>`;
  bindNav();if(bookOpen)book=mountSeekerBook(root.querySelector('.ss-book-host')!,app);
  root.querySelector<HTMLButtonElement>('[data-book]')!.onclick=()=>{bookOpen=!bookOpen;renderTraining();};
  root.querySelector<HTMLButtonElement>('[data-tutorial]')!.onclick=()=>app.tutorialPart(0);
  root.querySelector<HTMLButtonElement>('[data-deck-tutorial]')!.onclick=()=>app.onboarding();
 }
 function openMasters(){
  masterSheet?.close();
  const dialog=document.createElement('dialog');masterSheet=dialog;dialog.className='ss-master-sheet';
  dialog.setAttribute('aria-label',L('七つの扉','Seven doors','일곱 개의 문'));
  dialog.innerHTML=`<button class="lore-button" data-close aria-label="${L('閉じる','Close','닫기')}">×</button>`;
  const lang=getLang();
    const masters=document.createElement('div');masters.className='ss-masters';
    masters.innerHTML=`<h3>${L('挑戦するマスターを選ぶ','Choose a Master','도전할 마스터 선택')}</h3><p>${L('順番は自由です。公開された相手から選べます。','Choose any available Master, in any order.','공개된 상대를 자유로운 순서로 선택할 수 있어요.')} · ${state.ariesCleared?1:0} / 7</p><div class="ss-master-grid"><button data-aries><img src="/art/npcs/v2/aries.webp" alt=""><span><b>${STORY_NAMES.aries[lang]}</b><small>${state.ariesCleared?L('認証取得済み','Authorized','인증 획득'):L('挑戦する','Challenge','도전하기')}</small></span></button><button disabled><span><b>${L('レグルス','Regulus','레굴루스')}</b><small>${L('後日公開','Coming later','추후 공개')}</small></span></button>${Array.from({length:5},(_,i)=>`<button disabled><span><b>${L('未公開のマスター','Unrevealed Master','미공개 마스터')} ${i+3}</b><small>${L('後日公開','Coming later','추후 공개')}</small></span></button>`).join('')}</div>${state.ariesCleared?`<button class="lore-button" data-personal>${L('アリエス人物編「合格者名簿」','Aries: The register','아리에스 인물편 「합격자 명부」')} ${read('aries:after')?'✓':'NEW'}</button>`:''}`;
    const deck=document.createElement('button');deck.className='lore-button';deck.textContent=L('使用デッキを確認','Review your deck','사용 덱 확인');deck.onclick=()=>{dialog.close();app.deck({singleReturn:()=>app.single({chapter:5})});};masters.append(deck);
    if(read('aries:before')){const replay=document.createElement('button');replay.className='lore-button';replay.dataset.ariesReread='';replay.textContent=L('アリエスとの会話を読み返す','Reread Aries’s introduction','아리에스 도입 다시 읽기');replay.onclick=()=>{dialog.close();showScene('aries:before');};masters.append(replay);}
    dialog.append(masters);
    masters.querySelector<HTMLButtonElement>('[data-aries]')!.onclick=()=>{dialog.close();if(read('aries:before'))app.storyGame(2);else showScene('aries:before',()=>app.storyGame(2));};
    masters.querySelector<HTMLButtonElement>('[data-personal]')?.addEventListener('click',()=>{dialog.close();showScene('aries:after');});
  document.body.append(dialog);dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>dialog.close();
  dialog.onclose=()=>{dialog.remove();if(masterSheet===dialog)masterSheet=undefined;};
 }
 function activity(id:number){
  if(id===1)app.tutorialPart(0);
  else if(id===2)app.single({tab:'battle',page:0});
  else if(id===3){if(guest)app.login();else{app.singleNormalReturn=true;app.onlineLobby();}}
  else if(id===4)app.single({tab:'battle'});
  else openMasters();
 }
 function canContinue(id:number){
  if(!chapterOpen(state,id))return false;
  const before=`${id}:before` as StoryScene,after=`${id}:after` as StoryScene;
  return savedStoryCursor(account,before)!==null||
   (chapterObjective(state,id)&&savedStoryCursor(account,after)!==null)||
   (read(before)&&(!read(after)||id===5));
 }
 function confirmRestart(id:number){
  if(dead||closeScene||restartSheet||!chapterOpen(state,id))return;
  selectChapter(id);
  const dialog=document.createElement('dialog');restartSheet=dialog;dialog.className='ss-restart-sheet';
  dialog.setAttribute('aria-labelledby','ss-restart-title');
  dialog.setAttribute('aria-describedby','ss-restart-description');
  dialog.innerHTML=`<h2 id="ss-restart-title">${L('この章を最初から始めますか？','Start this chapter from the beginning?','이 장을 처음부터 시작할까요?')}</h2><p id="ss-restart-description">${L('中断位置を戻し、章の冒頭から読み直します。クリア済みの実習・対戦や章の解放状況は保持されます。','Restart this chapter’s conversations. Completed practice, battles and unlocked chapters are kept.','이 장의 대화를 처음부터 다시 읽습니다. 완료한 실습·대전과 해금한 장은 유지됩니다.')}</p><div class="ss-restart-actions"><button class="lore-button" data-no autofocus>NO</button><button class="lore-button lore-button-primary" data-yes>YES</button></div>`;
  const dismiss=()=>{dialog.close();dialog.remove();if(restartSheet===dialog)restartSheet=undefined;root.querySelector<HTMLButtonElement>(`[data-restart="${id}"]`)?.focus({preventScroll:true});};
  dialog.querySelector<HTMLButtonElement>('[data-no]')!.onclick=dismiss;
  dialog.oncancel=e=>{e.preventDefault();dismiss();};
  dialog.querySelector<HTMLButtonElement>('[data-yes]')!.onclick=()=>{dismiss();if(!dead)startChapter(id,true);};
  document.body.append(dialog);dialog.showModal();
 }
 function startChapter(id:number,restart=false){
  if(closeScene||!chapterOpen(state,id))return;
  selected=id;
  const before=`${id}:before` as StoryScene,after=`${id}:after` as StoryScene;
  const closeChapter=()=>{if(id===5)openMasters();else{selected=Math.min(5,id+1);render();}};
  const proceed=()=>chapterObjective(state,id)?showScene(after,closeChapter):activity(id);
  if(restart){
   for(const scene of [before,after]){try{localStorage.removeItem(storyCursorKey(account,scene));}catch{}}
   showScene(before,proceed);
  }
  else if(savedStoryCursor(account,before)!==null)showScene(before,proceed);
  else if(chapterObjective(state,id)&&savedStoryCursor(account,after)!==null)showScene(after,closeChapter);
  else if(!read(before))showScene(before,proceed);
  else if(!chapterObjective(state,id))activity(id);
  else if(!read(after))showScene(after,closeChapter);
  else if(id===5)openMasters();
  else showScene(before,()=>showScene(after));
 }
 function selectChapter(id:number){
  selected=id;
  root.querySelectorAll<HTMLElement>('[data-chapter]').forEach(card=>{
   const current=Number(card.dataset.chapter)===id;
   card.toggleAttribute('data-selected',current);
   if(current)card.setAttribute('aria-current','page');else card.removeAttribute('aria-current');
  });
 }
 function render(){
  if(dead)return;if(tab==='training'){renderTraining();return;}
  const lang=getLang(),completed=SINGLE_CHAPTERS.filter(c=>read(`${c.id}:after` as StoryScene)).length;
  galleryCleanup?.();artCleanup?.();
  const lock=`<svg viewBox="0 0 48 58" aria-hidden="true"><path d="M12 24V15a12 12 0 0 1 24 0v9M6 24h36v28H6z"/><circle cx="24" cy="36" r="3"/><path d="M24 39v6"/></svg>`;
  root.innerHTML=header()+`<main class="ss-layout ss-gallery-layout"><header class="ss-journey-heading"><div><span class="ss-eyebrow">THE SEEKER'S JOURNEY</span><h1>${L('父の記録を求めて','In search of Father','아버지의 기록을 찾아')}</h1></div><p class="ss-volume">${L('導入読了','INTRO READ','도입 읽음')} <b>${completed}</b> / 5</p></header>
  <section class="ss-gallery" aria-label="${L('チャプター','Chapters','장')}"><div class="ss-gallery-track" tabindex="0" aria-label="${L('左右に送って章を選択','Scroll sideways to choose a chapter','좌우로 넘겨 장 선택')}">${SINGLE_CHAPTERS.map(c=>{
   const open=chapterOpen(state,c.id),done=read(`${c.id}:after` as StoryScene);
   return `<article class="ss-chapter-card" data-chapter="${c.id}" ${open?'':'aria-disabled="true"'} ${selected===c.id?'aria-current="page" data-selected':''} aria-label="${c.title[lang]} · ${open?L('章の開始方法を選択','Choose how to start','시작 방법 선택'):L('未解放','Locked','잠김')}"><img class="ss-card-landscape" data-chapter-art="${c.id}" src="/art/single-story/chapters-v2/chapter-${c.id}.webp" alt="" draggable="false">${c.actor==='zeno'?'':`<span class="ss-card-actor" data-idle="${c.actor}"><img src="/art/single-standing/refined-v2/${c.actor}.webp" alt="" draggable="false"></span>`}<span class="ss-card-number">${String(c.id).padStart(2,'0')}</span>${open?(done?`<span class="ss-card-status">${L('✓ 読了','✓ READ','✓ 읽음')}</span>`:''):`<span class="ss-card-seal">${lock}<b>${L('未解放','LOCKED','잠김')}</b><small>${L(`第${c.id-1}章を完了して解放`,`Complete Chapter ${c.id-1}`,`${c.id-1}장 완료 시 개방`)}</small></span>`}<span class="ss-card-copy"><small>CHAPTER ${String(c.id).padStart(2,'0')}</small><b>${c.title[lang]}</b><span class="ss-card-place">${c.place[lang]}</span><span class="ss-card-summary">${c.summary[lang]}</span><span class="ss-card-actions"><button class="lore-button" data-restart="${c.id}" ${open?'':'disabled'}>${L('最初から','Start over','처음부터')}</button><button class="lore-button lore-button-primary" data-continue="${c.id}" ${canContinue(c.id)?'':'disabled'}>${L('続きから','Continue','이어하기')}</button></span></span></article>`;
  }).join('')}</div><button class="ss-gallery-arrow ss-gallery-prev" data-gallery-prev aria-label="${L('前の章を表示','Show previous chapters','이전 장 보기')}"><img src="${pageArrow}" alt="" draggable="false"></button><button class="ss-gallery-arrow ss-gallery-next" data-gallery-next aria-label="${L('次の章を表示','Show next chapters','다음 장 보기')}"><img src="${pageArrow}" alt="" draggable="false"></button></section><div class="ss-gallery-caption"><span>${L('ボタンをクリックして開始','Click a button to start','버튼을 눌러 시작')}</span><span class="ss-gallery-position" aria-live="polite"></span></div></main>`;
  bindNav();galleryCleanup=bindStoryGallery(root,selected);artCleanup=mountStoryArt(root);
  root.querySelectorAll<HTMLElement>('[data-chapter]').forEach(card=>{
   const id=Number(card.dataset.chapter);
   card.onclick=()=>{if(chapterOpen(state,id))selectChapter(id);};
   card.querySelector<HTMLButtonElement>('[data-restart]')!.onclick=e=>{e.stopPropagation();confirmRestart(id);};
   card.querySelector<HTMLButtonElement>('[data-continue]')!.onclick=e=>{e.stopPropagation();if(canContinue(id))startChapter(id);};
  });
 }
 async function load(){
  if(tab==='training'){render();return;}
  root.innerHTML=header()+`<p class="ss-loading" role="status">${L('記録を照合しています…','Checking your records…','기록 확인 중…')}</p>`;bindNav();
  try{
   if(guest){
    let scenes:unknown;try{scenes=JSON.parse(localStorage.getItem(guestKey)??'[]');}catch{}
    state={...emptySingleProgress(),tutorial:localStorage.getItem(tutorialPartKey(0,app.user?.id))==='1',botClears:SINGLE_DIFFICULTIES.filter(d=>localStorage.getItem('lore.guest.dojo.'+d)),ariesCleared:!!localStorage.getItem(ARIES_COMPLETED_KEY+'.guest'),read:Array.isArray(scenes)?scenes.filter((s):s is StoryScene=>STORY_SCENES.includes(s)):[]};
   }else state=await api.singleProgress();
   if(dead||app.user?.id!==account&&!guest)return;
   if(!loaded){selected=initial.chapter&&chapterOpen(state,initial.chapter)?initial.chapter:SINGLE_CHAPTERS.find(c=>chapterOpen(state,c.id)&&!read(`${c.id}:after` as StoryScene))?.id??5;loaded=true;}
   render();
  }catch{if(dead)return;root.innerHTML=header()+`<div class="ss-loading"><p role="alert">${L('進行記録を読み込めませんでした。','Could not load your progress.','진행 기록을 불러오지 못했어요.')}</p><button class="lore-button" data-retry>${L('再試行','Retry','다시 시도')}</button></div>`;bindNav();root.querySelector<HTMLButtonElement>('[data-retry]')!.onclick=()=>void load();}
 }
 void load();const off=onLangChange(()=>app.single({tab,chapter:selected,book:bookOpen}));
 return{destroy(){dead=true;galleryCleanup?.();artCleanup?.();masterSheet?.close();restartSheet?.close();restartSheet?.remove();off();closeScene?.();book?.destroy();root.remove();}};
}
