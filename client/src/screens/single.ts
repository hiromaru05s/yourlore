import type { App, Screen } from '../router';
import { getLang, onLangChange } from '../i18n';
import { api } from '../net/api';
import { SINGLE_DIFFICULTIES, botNpc } from '../shared/botNpcs';
import { ARIES_COMPLETED_KEY } from '../shared/ariesStory';
import { NORMAL_EXAM_MATCHES, STORY_SCENES, emptySingleProgress, chapterOpen, chapterObjective, masterQualified, type StoryScene } from '../shared/singleStory';
import { SINGLE_CHAPTERS, STORY_NAMES } from '../shared/singleStoryText';
import { tutorialPartKey } from '../shared/tutorialPartMeta';
import { loungeText as L } from '../ui/loungeText';
import { mountSeekerBook } from '../ui/seekerBook';
import { openStoryScene } from '../ui/storyScene';
import { mountSingleBattle } from './singleBattle';
import '../styles/singleStory.css';
export interface SingleLocation { page?:number; tab?:'story'|'battle'|'training'; chapter?:number; book?:boolean; }
export function mountSingle(app:App,initial:SingleLocation={}):Screen {
 if(initial.tab==='battle')return mountSingleBattle(app,initial);
 const root=document.createElement('section');root.className='screen single-story-page';app.root.append(root);
 const account=app.user?.id??'guest',guest=!app.user||account==='local-guest-user';
 const guestKey='lore:single:read:v1:guest';
 let state=emptySingleProgress(),dead=false,selected=initial.chapter??1,loaded=false,closeScene:(()=>void)|undefined,book:ReturnType<typeof mountSeekerBook>|undefined;
 const tab=initial.tab??'story';let bookOpen=!!initial.book;
 const read=(scene:StoryScene)=>state.read.includes(scene);
 const header=()=>`<nav class="ss-tabs" aria-label="${L('シングル','Single','싱글')}">${(['story','battle','training'] as const).map((id,i)=>`<button data-tab="${id}" aria-pressed="${tab===id}">${[L('ストーリー','Story','스토리'),L('対戦','Battle','대전'),L('修練','Training','수련')][i]}</button>`).join('')}</nav>`;
 const bindNav=()=>root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>app.single({tab:b.dataset.tab as SingleLocation['tab']}));
 function showScene(scene:StoryScene){
  if(closeScene)return;
  closeScene=openStoryScene(scene,account,async()=>{
   if(guest){const next=[...new Set([...state.read,scene])];localStorage.setItem(guestKey,JSON.stringify(next));state={...state,read:next};}
   else {const next=await api.readSingleScene(scene);if(dead||app.user?.id!==account)return;state=next;}
  },()=>{closeScene=undefined;if(!dead){render();root.querySelector<HTMLButtonElement>('[data-scene]')?.focus();}});
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
 function render(){
  if(dead)return;if(tab==='training'){renderTraining();return;}
  const chapter=SINGLE_CHAPTERS[selected-1],lang=getLang(),before=`${selected}:before` as StoryScene,after=`${selected}:after` as StoryScene;
  const completed=SINGLE_CHAPTERS.filter(c=>read(`${c.id}:after` as StoryScene)).length;
  const objectives=[
   {done:state.tutorial,text:L('基礎チュートリアルを修了','Complete the basic tutorial','기초 튜토리얼 수료')},
   {done:state.normalMatches>=NORMAL_EXAM_MATCHES,text:L(`ノーマル対戦 ${Math.min(2,state.normalMatches)} / 2（勝敗不問）`,`Normal duels ${Math.min(2,state.normalMatches)} / 2 (any result)`,`노멀 대전 ${Math.min(2,state.normalMatches)} / 2 (승패 무관)`)},
   ...SINGLE_DIFFICULTIES.map(d=>({done:state.botClears.includes(d),text:L(`${botNpc(d).name.ja}に勝利`,`Defeat ${botNpc(d).name.en}`,`${botNpc(d).name.ko}에게 승리`)})),
  ];
  const relevant=selected===5?[{done:masterQualified(state),text:L('マスターシーカーへの挑戦資格','Master Seeker qualification','마스터 시커 도전 자격')}]:selected===1?[objectives[0]]:selected===2?[objectives[2]]:selected===3?[objectives[1]]:objectives;
  const scene=read(before)&&chapterObjective(state,selected)&&!read(after)?after:before;
  root.innerHTML=header()+`<main class="ss-layout"><aside class="ss-index"><span class="ss-eyebrow">THE SEEKER'S JOURNEY</span><h1>${L('父の記録を求めて','In search of Father','아버지의 기록을 찾아')}</h1><p class="ss-volume">${L('導入読了','INTRO READ','도입 읽음')} · ${completed} / 5</p><nav aria-label="${L('チャプター','Chapters','장')}">${SINGLE_CHAPTERS.map(c=>`<button data-chapter="${c.id}" ${chapterOpen(state,c.id)?'':'disabled'} ${selected===c.id?'aria-current="page"':''}><span>${String(c.id).padStart(2,'0')}</span><b>${c.title[lang]}</b><small>${read(`${c.id}:after` as StoryScene)?'✓':chapterOpen(state,c.id)?'›':L('未解放','Locked','잠김')}</small></button>`).join('')}</nav><p class="ss-index-note">${L('会話はSKIP可能。実習と対戦の記録は別に残ります。','Conversations can be skipped. Practice and duel records are tracked separately.','대화는 SKIP 가능. 실습과 대전 기록은 별도로 남아요.')}</p></aside>
  <section class="ss-chapter" aria-labelledby="ss-title"><div class="ss-chapter-art" data-actor="${chapter.actor}" aria-hidden="true">${chapter.actor==='zeno'?'':`<img src="/art/single-standing/refined-v2/${chapter.actor}.webp" alt="">`}</div><div class="ss-chapter-copy"><span class="ss-eyebrow">CHAPTER ${String(selected).padStart(2,'0')}</span><h2 id="ss-title">${chapter.title[lang]}</h2><p class="ss-synopsis">${chapter.summary[lang]}</p><small>${chapter.place[lang]}</small><div class="ss-objectives">${relevant.map(o=>`<p data-complete="${o.done}"><span>${o.done?'✓':'◇'}</span>${o.text}</p>`).join('')}</div><div class="ss-actions"><button class="lore-button lore-button-primary" data-scene="${scene}">${!read(before)?L('物語を読む','Read story','이야기 읽기'):scene===after?L('実習後の物語へ','Continue the story','실습 후 이야기로'):L('導入を読み返す','Reread introduction','도입 다시 읽기')} →</button>${read(after)?`<button class="lore-button lore-button-quiet" data-scene="${after}">${L('結末を読み返す','Reread closing scene','마무리 다시 읽기')}</button>`:''}</div><div class="ss-task-actions"></div>${guest?`<p class="ss-guest">${L('ゲストの読了・実習はこのブラウザに保存。ノーマル対戦と挑戦資格にはログインが必要です。','Guest reading and practice stay in this browser. Sign in for normal duels and Master qualification.','게스트의 읽기·실습은 이 브라우저에 저장돼요. 노멀 대전과 도전 자격에는 로그인이 필요해요.')}</p>`:''}</div></section></main>`;
  bindNav();
  root.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.chapter);render();});
  root.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(b=>b.onclick=()=>showScene(b.dataset.scene as StoryScene));
  const actions=root.querySelector<HTMLElement>('.ss-task-actions')!;
  const action=(label:string,fn:()=>void,id:string)=>{const b=document.createElement('button');b.className='lore-button';b.textContent=label;b.dataset.action=id;b.onclick=fn;actions.append(b);};
  if(read(before)){
   if(selected===1)action(L('基礎実習へ','Start basic practice','기초 실습으로'),()=>app.tutorialPart(0),'tutorial');
   if(selected===2){action(L('ルミと対戦','Challenge Lumi','루미와 대전'),()=>app.single({tab:'battle',page:0}),'lumi');action(L('デッキ作りの案内','Deck-building guidance','덱 만들기 안내'),()=>app.onboarding(),'deck-guidance');}
   if(selected===3)action(guest?L('ログインしてノーマルへ','Sign in for normal duels','로그인하고 노멀로'):L('ノーマル対戦へ','Play a normal duel','노멀 대전으로'),()=>{if(guest)app.login();else{app.singleNormalReturn=true;app.onlineLobby();}},'normal');
   if(selected===4)action(L('認定実技へ','Qualification duels','인증 실기로'),()=>app.single({tab:'battle'}),'qualification');
   if(selected===5){
    action(L('使用デッキを確認','Review your deck','사용 덱 확인'),()=>app.deck({singleReturn:()=>app.single({chapter:5})}),'master-deck');
    const masters=document.createElement('div');masters.className='ss-masters';
    masters.innerHTML=`<h3>${L('挑戦するマスターを選ぶ','Choose a Master','도전할 마스터 선택')}</h3><p>${L('順番は自由です。公開された相手から選べます。','Choose any available Master, in any order.','공개된 상대를 자유로운 순서로 선택할 수 있어요.')} · ${state.ariesCleared?1:0} / 7</p><div class="ss-master-grid"><button data-aries><img src="/art/npcs/v2/aries.webp" alt=""><span><b>${STORY_NAMES.aries[lang]}</b><small>${state.ariesCleared?L('認証取得済み','Authorized','인증 획득'):L('挑戦する','Challenge','도전하기')}</small></span></button><button disabled><span><b>${L('レグルス','Regulus','레굴루스')}</b><small>${L('後日公開','Coming later','추후 공개')}</small></span></button>${Array.from({length:5},(_,i)=>`<button disabled><span><b>${L('未公開のマスター','Unrevealed Master','미공개 마스터')} ${i+3}</b><small>${L('後日公開','Coming later','추후 공개')}</small></span></button>`).join('')}</div>${state.ariesCleared?`<button class="lore-button" data-personal>${L('アリエス人物編「合格者名簿」','Aries: The register','아리에스 인물편 「합격자 명부」')} ${read('aries:after')?'✓':'NEW'}</button>`:''}`;
    actions.append(masters);
    masters.querySelector<HTMLButtonElement>('[data-aries]')!.onclick=()=>read('aries:before')?app.storyGame(2):showScene('aries:before');
    masters.querySelector<HTMLButtonElement>('[data-personal]')?.addEventListener('click',()=>showScene('aries:after'));
    if(read('aries:before'))action(L('アリエスとの会話を読み返す','Reread Aries’s introduction','아리에스 도입 다시 읽기'),()=>showScene('aries:before'),'aries-reread');
   }
  }
  if(read(after)&&selected<5)action(L('次の章へ →','Next chapter →','다음 장으로 →'),()=>{selected++;render();},'next-chapter');
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
 return{destroy(){dead=true;off();closeScene?.();book?.destroy();root.remove();}};
}
