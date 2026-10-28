import type {App,Screen} from '../router';
import {api} from '../net/api';
import {getLang,onLangChange} from '../i18n';
import {langSelectEl} from '../ui/langSelect';
import {loungeText as text} from '../ui/loungeText';
import {homeIcon} from '../ui/homeIcons';
import {mountManaSpirit} from '../ui/manaSpirit';
import {artUrl} from '../ui/cardArt';
import {TUT_STEPS,TUTORIAL_CHAPTERS,TUTORIAL_TOTAL} from '../shared/tutorialSteps';
import {tutorialRuleSections} from '../shared/tutorialNotes';
import {tutorialPartKey} from '../shared/tutorialParts';
import '../styles/tutorialAcademy.css';
import '../styles/homeTutorial.css';
import '../styles/tutorialParts.css';
import '../styles/zenoSpeech.css';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function openRuleNotebook(chapter=0,onClose?:()=>void,onLesson?:(i:number)=>void):()=>void {
 const lang=getLang(),secs=tutorialRuleSections(lang),dialog=document.createElement('dialog');dialog.className='rule-notebook';
 dialog.innerHTML=`<header><div><span class="menu-eyebrow">BIBLION / FIELD NOTES</span><h2>${text('シーカーのルールノート','Seeker’s rule notebook','시커의 규칙 노트')}</h2></div><button class="btn btn-ghost" data-close aria-label="${text('閉じる','Close','닫기')}">×</button></header>
 <label class="notebook-search">${text('用語を探す','Find a rule','규칙 찾기')}<input type="search" placeholder="${text('雫、リフト、反撃…','Dew, Rift, Counter…','이슬, 리프트, 반격…')}" aria-label="${text('ルールを検索','Search rules','규칙 검색')}"></label>
 <div class="notebook-pages"><nav aria-label="${text('目次','Contents','목차')}">${secs.map(s=>`<a href="#note-${s.chapter}">${s.chapter+1}. ${esc(s.title)}</a>`).join('')}</nav><div class="notebook-body"><p class="notebook-empty" hidden>${text('見つかりませんでした。別の用語で探してみよう。','No match. Try another term.','찾지 못했어요. 다른 용어를 입력해요.')}</p>${secs.map(s=>`<section id="note-${s.chapter}" class="tut-sec"><span class="note-number">${String(s.chapter+1).padStart(2,'0')}</span><h3>${esc(s.title)}</h3>${s.body.map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}${onLesson?`<button class="btn btn-ghost" data-practice="${TUT_STEPS.findIndex(l=>l.chapter===s.chapter)}">${text('この章を実習する','Practice this chapter','이 장 실습하기')} →</button>`:''}</section>`).join('')}</div></div>`;
 document.body.append(dialog);dialog.showModal();let closed=false;
 const close=()=>{if(closed)return;closed=true;dialog.close();dialog.remove();onClose?.();};
 dialog.querySelector('[data-close]')!.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelectorAll<HTMLAnchorElement>('nav a').forEach(a=>a.onclick=e=>{e.preventDefault();dialog.querySelector(a.getAttribute('href')!)?.scrollIntoView({block:'start'});});
 dialog.querySelectorAll<HTMLButtonElement>('[data-practice]').forEach(b=>b.onclick=()=>{close();onLesson?.(Number(b.dataset.practice));});
 dialog.querySelector('input')!.addEventListener('input',e=>{const query=(e.target as HTMLInputElement).value.trim().toLocaleLowerCase();let shown=0;dialog.querySelectorAll<HTMLElement>('.tut-sec').forEach(section=>{section.hidden=!!query&&!section.textContent?.toLocaleLowerCase().includes(query);if(!section.hidden)shown++;const a=dialog.querySelector<HTMLAnchorElement>(`nav a[href="#${section.id}"]`);if(a)a.hidden=section.hidden;});dialog.querySelector<HTMLElement>('.notebook-empty')!.hidden=shown>0;});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 if(chapter>0)dialog.querySelector(`#note-${chapter}`)?.scrollIntoView({block:'start'});
 return close;
}
export function mountLegacyTutorial(app:App):Screen {
 const wrap=document.createElement('div');wrap.className='screen tut-screen academy';const lang=getLang();let disposed=false,closeNote:(()=>void)|undefined,selected=0;
 const guest=!app.user||app.user.id==='local-guest-user';
 wrap.innerHTML=`<div class="topright-lang"></div><main class="academy-content">
 <button class="academy-notebook" id="ruleNotebook">${homeIcon('book')}<span>${text('ゲームルールを確認する','Read the game rules','게임 규칙 노트 읽기')}</span><span aria-hidden="true">↗</span></button>
 <header class="academy-hero"><div class="academy-spirit"></div><div><span class="menu-eyebrow">BIBLION / FIRST ATTUNEMENT</span><h1>${text('チュートリアル','Tutorial','튜토리얼')}</h1><p>${text('まずはカードを1枚、場に出してみよう。短い案内を読んだら、自分でプレイ。できたことを確かめながら、次の一手へ進めるよ。','Start by playing one card. Read a short guide, try the move yourself, then see what changed before your next move.','먼저 카드 한 장을 내 봐요. 짧은 안내를 읽고 직접 플레이한 뒤, 결과를 확인하며 다음 행동으로 나아가요.')}</p></div></header>
 <section class="academy-progress"><div><span>${text('全36実習の初回クリア報酬','First-clear rewards across 36 lessons','36개 실습 첫 완료 보상')}</span><strong>${homeIcon('shard')} ${TUTORIAL_TOTAL.toLocaleString('en-US')} <small>${text('シャード','Shards','샤드')}</small></strong></div><div class="academy-earned" role="status">${text('進捗を読み込み中…','Loading progress…','진행 상황 불러오는 중…')}</div><progress max="${TUT_STEPS.length}" value="0" aria-label="${text('クリアした実習数','Completed lessons','완료한 실습 수')}"></progress></section>
 <div class="academy-controls"><button id="startInter" class="btn btn-primary" disabled>${text('最初から始める','Start learning','처음부터 시작')}</button><button id="back" class="btn btn-ghost">${text('HOMEへ','Home','홈으로')}</button><p class="academy-migration"></p></div>
 <nav class="academy-chapters" aria-label="${text('実習の章','Lesson chapters','실습 장')}">${TUTORIAL_CHAPTERS.map((c,i)=>`<button data-chapter="${i}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c[lang])}</b><small data-chapter-progress="${i}">—</small></button>`).join('')}</nav>
 <div class="academy-map-heading"><h2 class="academy-chapter-title">${TUTORIAL_CHAPTERS[0][lang]}</h2><span class="academy-clear-count" aria-live="polite">— / ${TUT_STEPS.length}</span></div>
 <ol class="tut-steps academy-lessons">${TUT_STEPS.map((s,i)=>`<li data-key="${s.key}" data-chapter-index="${s.chapter}" class="lesson-tile" ${s.chapter?'hidden':''}>
 <div class="lesson-art" aria-hidden="true"><img src="${artUrl.sm(s.art)}" alt="" loading="lazy"><span class="tut-step-n">${String(i+1).padStart(2,'0')}</span><span class="lesson-clear-seal">${homeIcon('check')}</span></div>
 <div class="lesson-copy"><span class="lesson-state">${text('確認中','Loading','확인 중')}</span><span class="lesson-chapter">${s.chapter+1} · ${esc(TUTORIAL_CHAPTERS[s.chapter][lang])}</span><h2 class="tut-step-t">${esc(s.title[lang])}</h2><p>${esc(s.body[lang])}</p></div>
 <button class="academy-lesson-start" data-lesson="${i}" disabled aria-label="${esc(s.title[lang])}"><span class="tut-step-r">+${s.reward} ${homeIcon('shard')}</span><span class="lesson-action">${text('実習へ','Play','실습')} →</span></button></li>`).join('')}</ol>
 <footer class="academy-footer"><p>${text('時間制限なし。途中で戻っても、同じアカウント・ブラウザなら実習の続きから再開できます。基本を覚えたらシングルも試してみよう。','No timer. On the same account and browser, return to resume an unfinished lesson. Try a single duel when you know the basics.','시간제한 없어요. 같은 계정·브라우저에서는 중간 실습을 이어갈 수 있어요. 기본을 익히면 싱글도 해 봐요.')}</p><button id="play" class="btn btn-ghost">${text('シングルへ','Play Single','싱글')}</button></footer></main>`;
 app.root.append(wrap);wrap.querySelector('.topright-lang')!.append(langSelectEl());const spirit=mountManaSpirit(wrap.querySelector('.academy-spirit')!);
 const choose=(chapter:number)=>{selected=chapter;wrap.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.chapter)===chapter)));wrap.querySelectorAll<HTMLElement>('[data-chapter-index]').forEach(el=>el.hidden=Number(el.dataset.chapterIndex)!==chapter);wrap.querySelector('.academy-chapter-title')!.textContent=`${chapter+1}. ${TUTORIAL_CHAPTERS[chapter][lang]}`;};
 wrap.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.chapter)));
 wrap.querySelector('#ruleNotebook')!.addEventListener('click',()=>{closeNote?.();closeNote=openRuleNotebook(selected,undefined,i=>app.tutorialGame(i));});
 wrap.querySelector('#back')!.addEventListener('click',()=>app.home());wrap.querySelector('#play')!.addEventListener('click',()=>app.botGame());
 const paint=(keys:string[],awarded=0,legacyPaid=0,amounts:Record<string,number>={})=>{
  if(disposed)return;const done=TUT_STEPS.filter(s=>keys.includes(s.key)).length,first=TUT_STEPS.findIndex(s=>!keys.includes(s.key));
  wrap.querySelector('progress')!.value=done;wrap.querySelector('.academy-clear-count')!.textContent=`${done} / ${TUT_STEPS.length} ${text('クリア','CLEAR','완료')}`;wrap.classList.toggle('all-cleared',done===TUT_STEPS.length);
  wrap.querySelector('.academy-earned')!.textContent=guest?text('練習モード · 報酬の受取にはログインが必要です。','Practice mode · Sign in for rewards.','연습 모드 · 보상은 로그인 필요'):`${done}/${TUT_STEPS.length} · ${awarded.toLocaleString('en-US')} / ${TUTORIAL_TOTAL.toLocaleString('en-US')} ${text('シャード受取済み','Shards received','샤드 수령')}`;
  wrap.querySelector('.academy-migration')!.textContent=legacyPaid?text(`以前の受取分${legacyPaid.toLocaleString()}シャードを引継ぎ。残り${(TUTORIAL_TOTAL-legacyPaid).toLocaleString()}を新実習へ分配しています。`,`Your previous ${legacyPaid} Shards carry over. The remaining ${TUTORIAL_TOTAL-legacyPaid} are distributed across the new lessons.`,`이전 ${legacyPaid}샤드를 이어받고 나머지 ${TUTORIAL_TOTAL-legacyPaid}를 새 실습에 배분했어요.`):text('各実習100〜150シャード。クリア済みも無料で復習できます。','100–150 Shards per lesson. Cleared lessons are free to replay.','실습마다 100~150샤드. 완료 후에도 무료로 복습해요.');
  choose(first<0?0:TUT_STEPS[first].chapter);
  const start=wrap.querySelector<HTMLButtonElement>('#startInter')!;start.disabled=false;start.textContent=first<0?text('もう一度練習する','Practice again','다시 연습'):first>0?text('続きの実習へ','Continue learning','실습 이어서'):text('最初から始める','Start learning','처음부터 시작');start.onclick=()=>app.tutorialGame(first<0?0:first);
  TUTORIAL_CHAPTERS.forEach((_,i)=>{const lessons=TUT_STEPS.filter(s=>s.chapter===i);wrap.querySelector(`[data-chapter-progress="${i}"]`)!.textContent=`${lessons.filter(s=>keys.includes(s.key)).length}/${lessons.length}`;});
  TUT_STEPS.forEach((s,i)=>{const li=wrap.querySelector<HTMLElement>(`[data-key="${s.key}"]`)!,cleared=keys.includes(s.key);li.classList.toggle('claimed',cleared);li.classList.toggle('is-next',i===first);li.querySelector('.lesson-state')!.textContent=cleared?text('クリア済み','CLEARED','완료'):i===first?text('次の実習','UP NEXT','다음 실습'):text('未クリア','NOT CLEARED','미완료');const b=li.querySelector<HTMLButtonElement>('[data-lesson]')!;b.disabled=false;b.onclick=()=>app.tutorialGame(i);li.querySelector('.tut-step-r')!.innerHTML=cleared?`${homeIcon('check')} ${text('クリア済み','Cleared','완료')}`:`+${amounts[s.id]??s.reward} ${homeIcon('shard')}`;li.querySelector('.lesson-action')!.textContent=cleared?text('復習する →','Replay →','복습 →'):text('実習へ →','Play →','실습 →');});
 };
 const load=async()=>{try{if(guest){let keys:string[]=[];try{keys=JSON.parse(localStorage.getItem('lore:tutorial:v3:guest')??'[]');if(!Array.isArray(keys))keys=[];}catch{}paint(keys);}else{const s=await api.tutorialStatus();if(disposed)return;if(app.user){app.user.credits=s.credits;document.dispatchEvent(new Event('lore:user'));}paint(s.keys,s.awarded,s.legacyPaid,s.amounts);}}catch{if(disposed)return;const el=wrap.querySelector('.academy-earned')!;el.textContent=text('進捗を読み込めませんでした。','Could not load progress.','진행 상황을 불러오지 못했어요.');const b=document.createElement('button');b.className='btn btn-ghost';b.textContent=text('再試行','Retry','재시도');b.onclick=()=>{b.remove();void load();};el.append(b);}};
 void load();const unsub=onLangChange(()=>app.tutorial());return{destroy(){disposed=true;unsub();spirit.destroy();closeNote?.();}};
}

/** One short, continuous first duel. Advanced rules remain available on demand. */
export function mountTutorial(app:App):Screen {
 const wrap=document.createElement('div');wrap.className='screen tut-screen tutorial-parts-screen';
 let closeNote:(()=>void)|undefined,completed=false;
 try{completed=localStorage.getItem(tutorialPartKey(0,app.user?.id))==='1';}catch{}
 wrap.innerHTML=`<main class="tutorial-parts-shell tutorial-basics-shell">
  <header class="tutorial-parts-hero"><div class="tutorial-parts-spirit"></div><div class="tutorial-parts-heading"><h1>${text('チュートリアル','Tutorial','튜토리얼')}</h1></div><div class="zeno-speech tutorial-welcome-speech"><div class="zeno-speech-content"><span class="zeno-speaker">${text('ゼノ','Zeno','제노')}</span><p>${completed?text('基本は覚えたね。次はシングルで、自分の好きな順番にカードを使ってみよう。','You know the basics. Try using cards in your own order in Single mode.','기본을 익혔네. 이제 싱글에서 원하는 순서대로 카드를 써 보자.'):text('やあ、ゼノだよ。一緒にカードを使いながら、デュエルの基本を覚えよう。','Hi, I’m Zeno. Let’s learn the basics by playing cards together.','안녕, 난 제노야. 같이 카드를 쓰면서 듀얼의 기본을 익혀 보자.')}</p></div></div></header>
  <section class="tutorial-basics-card lore-surface" aria-label="${text('基本チュートリアル','Basic tutorial','기본 튜토리얼')}">
   <div class="tutorial-basics-heading"><div><span class="menu-eyebrow">${text('目安 3〜5分','ABOUT 3–5 MINUTES','약 3~5분')}</span><h2>${text('デュエルの基本','Duel basics','듀얼의 기본')}</h2></div>${completed?`<span class="tutorial-basics-clear">${homeIcon('check')} ${text('完了','Complete','완료')}</span>`:''}</div>
   <ol class="tutorial-basics-flow"><li><span>01</span><b>${text('カードを使って攻撃','Play and attack','카드 사용과 공격')}</b><small>${text('マナ・召喚・体力','Mana, summoning and health','마나·소환·체력')}</small></li><li><span>02</span><b>${text('買って、次のターンへ','Buy, then take your next turn','구매하고 다음 턴으로')}</b><small>${text('マーケット・ドロー・墓地','Markets, draws and graveyard','마켓·드로우·묘지')}</small></li><li><span>03</span><b>${text('魔法で強くして戦う','Cast a spell and battle','마법으로 강화하고 전투')}</b><small>${text('効果・モンスター攻撃・リフト','Effects, monster combat and Rift','효과·몬스터 전투·리프트')}</small></li></ol>
   <div class="tutorial-basics-actions"><button class="lore-button ${completed?'':'lore-button-primary'}" id="continuePart">${completed?text('もう一度練習する','Practice again','다시 연습'):text('チュートリアルを始める','Start tutorial','튜토리얼 시작')} →</button>${completed?`<button class="lore-button lore-button-primary" id="single">${text('シングルで遊ぶ','Play Single','싱글 플레이')} →</button>`:''}</div>
  </section>
  <footer class="tutorial-parts-footer"><button class="lore-button lore-button-quiet" id="rules">${homeIcon('book')} ${text('ルールノート','Rule notebook','규칙 노트')}</button><button class="lore-button lore-button-quiet" id="back">← ${text('ホーム','Home','홈')}</button></footer>
 </main>`;
 app.root.append(wrap);const spirit=mountManaSpirit(wrap.querySelector('.tutorial-parts-spirit')!);
 wrap.querySelector<HTMLButtonElement>('#continuePart')!.onclick=()=>app.tutorialPart(0);
 wrap.querySelector<HTMLButtonElement>('#single')?.addEventListener('click',()=>app.botGame('easy'));
 wrap.querySelector<HTMLButtonElement>('#rules')!.onclick=()=>{closeNote?.();closeNote=openRuleNotebook(0);};
 wrap.querySelector<HTMLButtonElement>('#back')!.onclick=()=>app.home();
 const unsub=onLangChange(()=>app.tutorial());
 return{destroy(){unsub();spirit.destroy();closeNote?.();wrap.remove();}};
}
