import {tutorialBrief} from '../shared/tutorialBrief';
import { tutorialCue, isTutorialActionAllowed } from '../shared/tutorialGuide';
import { openTutorialBasics } from '../ui/tutorialBasics';
import { openRuleNotebook } from '../screens/tutorial';
import { actingSide, monsterCanAttack } from '../shared/engine';
import type { Action, GameState } from '../shared/types';
import { BaseController, type ControllerExits } from './controller';
import { createLesson, advanceLesson, currentScene, tutorialOpponentAction, TUTORIAL_ACTION_LIMIT, type TutorialAction, type LessonRun } from '../shared/tutorialLesson';
import { TUT_STEPS, TUTORIAL_CHAPTERS, type Copy } from '../shared/tutorialSteps';
import { api } from '../net/api';
import { getLang, onLangChange } from '../i18n';
import { loungeText as text } from '../ui/loungeText';
import { mountManaSpirit } from '../ui/manaSpirit';
import '../styles/tutorialAcademy.css';
export {TUT_STEPS} from '../shared/tutorialSteps';
export interface TutorialHooks {onCredits?(credits:number):void;onNext?(lesson:number):void;lesson?:number;guest?:boolean;accountId?:string;}
export class TutorialController extends BaseController {
 private run:LessonRun;private lesson:number;private hooks:TutorialHooks;
 private coach:HTMLDialogElement;private speech:HTMLElement;private goal:HTMLElement;
 private dismissedCheckpoint='';private spirit:ReturnType<typeof mountManaSpirit>;
 private progressKey='';
 private fast=false;private playerName:string;private dice:number[][]=[];private changes:Copy[]=[];
 private record:{title:Copy;intro:Copy;result:Copy;explanation?:Copy}[]=[];
 private disposed=false;private introActive=false;private presenting=false;private redirected=false;
 private saving=false;private settled=false;private earned=0;
 private botTimer=0;private glowTimer=0;private handWasOpen=false;private unsub:()=>void;private closeNote:(()=>void)|undefined;
 protected get useTurnClock():boolean{return false;}
 constructor(root:HTMLElement,exits:ControllerExits,playerName='SEEKER',hooks:TutorialHooks={}){
  super(root,0,exits);this.hooks=hooks;this.playerName=playerName;
  try{this.fast=localStorage.getItem('lore:tutorial:pace')==='fast';}catch{}this.introShown=true;this.lesson=Math.max(0,Math.min(TUT_STEPS.length-1,hooks.lesson??0));
  this.run=createLesson(TUT_STEPS[this.lesson].id);
  this.progressKey=`lore:tutorial:v3:run:${hooks.accountId??'guest'}:${this.run.id}`;
  try{const actions=JSON.parse(localStorage.getItem(this.progressKey)??'[]');if(Array.isArray(actions)&&actions.length<=TUTORIAL_ACTION_LIMIT){for(const action of actions){if(!isTutorialActionAllowed(this.run,action))throw Error('stale practice');this.restoreAction(action);}}}catch{this.run=createLesson(TUT_STEPS[this.lesson].id);this.changes=[];this.dice=[];}
  this.run.state.players[0].name=playerName;this.run.state.players[1].name='Zeno';
  this.coach=document.createElement('dialog');this.coach.className='tutorial-dialog';this.coach.setAttribute('aria-labelledby','tutorial-heading');this.coach.setAttribute('aria-describedby','tutorial-message');this.coach.innerHTML='<div class="coach-spirit"></div><div class="coach-speech" aria-live="polite"></div>';root.append(this.coach);this.speech=this.coach.querySelector('.coach-speech')!;this.spirit=mountManaSpirit(this.coach.querySelector('.coach-spirit')!);
  this.goal=document.createElement('aside');this.goal.className='tutorial-goal';root.append(this.goal);
  this.coach.addEventListener('cancel',e=>{e.preventDefault();if(this.run.phase==='play'&&!this.run.done)this.resumePlay();});
  this.coach.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
  root.classList.add('tutorial-board');this.applyResult({state:this.run.state,events:[]},false);this.renderCoach();this.unsub=onLangChange(()=>this.renderCoach());
  this.glowTimer=window.setInterval(()=>{if(this.handWasOpen!==this.handIsOpen){this.handWasOpen=this.handIsOpen;this.renderCoach();}this.applyGlow();},350);
  if(this.run.done)void this.saveReward();
 }
 /** Keep the board, decoded assets and Zeno alive between all 36 lessons. */
 private loadLesson(lesson:number,restart=false):void {
  if(this.presenting||this.saving||this.disposed)return;
  this.closeNote?.();this.coach.close();this.dismissedCheckpoint='';clearTimeout(this.botTimer);this.lesson=lesson;this.changes=[];this.dice=[];this.run=createLesson(TUT_STEPS[lesson].id);
  this.progressKey=`lore:tutorial:v3:run:${this.hooks.accountId??'guest'}:${this.run.id}`;
  try{if(restart)localStorage.removeItem(this.progressKey);const actions=JSON.parse(localStorage.getItem(this.progressKey)??'[]');if(!Array.isArray(actions)||actions.length>TUTORIAL_ACTION_LIMIT)throw Error('stale');for(const action of actions){if(!isTutorialActionAllowed(this.run,action))throw Error('stale');this.restoreAction(action);}}catch{this.run=createLesson(TUT_STEPS[lesson].id);this.changes=[];this.dice=[];}
  this.run.state.players[0].name=this.playerName;this.run.state.players[1].name='Zeno';
  this.settled=false;this.earned=0;this.redirected=false;this.introActive=false;
  this.presenting=true;this.renderCoach();this.applyResult({state:this.run.state,events:[]},false);
  this.afterPresentation(()=>{if(this.disposed)return;this.presenting=false;this.renderCoach();if(this.run.done)void this.saveReward();else this.maybeBot();});
 }
 private restoreAction(action:TutorialAction):void {
  const previous=this.run.state,result=advanceLesson(this.run,action);
  if(action.type==='continueLesson'){this.changes=[];this.dice=[];}
  else if(result.state!==previous){this.compare(previous,result.state);for(const e of result.events)if(e.type==='dice')this.dice.push(e.rolls);}
 }
 private rememberScene():void {
  const scene=currentScene(this.run);this.record.push({title:TUT_STEPS[this.lesson].title,intro:scene.intro,result:scene.result,explanation:scene.question?.explanation});
 }
 private compare(before:GameState,after:GameState):void {
  this.changes=[];
  const labels:Record<string,Copy>={hp:{ja:'体力',en:'Spirit',ko:'체력'},mana:{ja:'マナ',en:'Mana',ko:'마나'},maxMana:{ja:'最大マナ',en:'Max mana',ko:'최대 마나'},dew:{ja:'雫',en:'Dew',ko:'이슬'},shield:{ja:'シールド',en:'Shield',ko:'실드'},hand:{ja:'手札',en:'Hand',ko:'손패'},deck:{ja:'デッキ',en:'Deck',ko:'덱'},discard:{ja:'墓地',en:'Graveyard',ko:'묘지'},removed:{ja:'リフト',en:'Rift',ko:'리프트'},field:{ja:'場',en:'Field',ko:'필드'}};
  for(const side of [0,1] as const)for(const [key,label]of Object.entries(labels)){
   const read=(g:GameState)=>{const value=g.players[side][key as keyof GameState['players'][0]];return Array.isArray(value)?value.length:typeof value==='number'?(key==='hp'?Math.max(0,value):value):0;};
   const a=read(before),b=read(after);if(a===b)continue;
   this.changes.push({ja:`${side?'相手':'自分'}の${label.ja} ${a} → ${b}`,en:`${side?'Their':'Your'} ${label.en} ${a} → ${b}`,ko:`${side?'상대':'내'} ${label.ko} ${a} → ${b}`});
  }
 }

 protected submit(action:Action):void {
  if(this.disposed||this.introActive||this.presenting||this.coach.open||this.run.done||actingSide(this.run.state)!==0)return;
  if(action.type==='surrender'){this.exits.onHome();return;}
  if(!isTutorialActionAllowed(this.run,action)){this.redirected=true;this.dismissedCheckpoint='';this.renderCoach();
   // A cancelled picker closes before submit. Restore it when this demonstration requires a choice.
   if(this.run.state.pending&&action.type==='pick')this.applyResult({state:this.run.state,events:[]},false);
   return;}
  this.redirected=false;this.apply(action);
 }
 override onEndTurn():void {
  if(this.introActive||this.presenting||this.coach.open||this.run.done)return;
  if(!isTutorialActionAllowed(this.run,{type:'endTurn'})){this.redirected=true;this.dismissedCheckpoint='';this.renderCoach();return;}
  super.onEndTurn();
 }
 private apply(action:TutorialAction):void {
  if(this.presenting||this.disposed)return;
  if(!isTutorialActionAllowed(this.run,action))return;
  if(action.type==='continueLesson')this.rememberScene();
  const previous=this.run.state,res=advanceLesson(this.run,action);
  try{localStorage.setItem(this.progressKey,JSON.stringify(this.run.actions));}catch{/* Practice works when storage is unavailable. */}
  if(action.type==='answer'){if(!this.run.wrongAnswer)this.apply({type:'continueLesson'});else this.renderCoach();return;}
  if(this.run.done){this.spirit.celebrate();void this.saveReward();this.renderCoach();return;}
  if(res.state!==previous){
   this.changes=[];if(action.type==='continueLesson')this.dice=[];else {this.compare(previous,res.state);for(const e of res.events)if(e.type==='dice')this.dice.push(e.rolls);}
   this.presenting=true;this.renderCoach();this.applyResult(res,!this.fast&&action.type!=='continueLesson');
   const state=res.state;this.afterPresentation(()=>{if(this.disposed||this.run.state!==state)return;this.presenting=false;this.renderCoach();this.maybeBot();});
  }else this.renderCoach();
 }
 protected maybeBot():void {
  if(this.disposed||this.introActive||this.presenting||this.coach?.open||this.run?.done||this.run?.phase!=='play')return;
  const action=tutorialOpponentAction(this.run);if(!action)return;
  clearTimeout(this.botTimer);this.botTimer=window.setTimeout(()=>{if(!this.disposed&&!this.introActive&&!this.presenting&&!this.coach.open){const a=tutorialOpponentAction(this.run);if(a)this.apply(a);}},this.fast?80:550);
 }
 protected showWin():void { /* Prepared loss/draw scenes are observations, not failed lessons. */ }
 private async saveReward():Promise<void>{
  if(this.saving||this.settled)return;this.saving=true;this.renderCoach();
  try{if(!this.hooks.guest){const r=await api.completeTutorial(this.run.id,this.run.actions);this.hooks.onCredits?.(r.credits);if(this.disposed)return;this.earned=r.amount;}
   else {try{const raw=JSON.parse(localStorage.getItem('lore:tutorial:v3:guest')??'[]');const keys=Array.isArray(raw)?raw:[];localStorage.setItem('lore:tutorial:v3:guest',JSON.stringify([...new Set([...keys,TUT_STEPS[this.lesson].key])]));}catch{}}
   this.settled=true;try{localStorage.removeItem(this.progressKey);}catch{}}
  catch{/* Preserve the finished transcript so a retry is idempotent. */}
  finally{this.saving=false;if(!this.disposed){this.renderCoach();}}
 }
 private get handIsOpen():boolean{return !!this.coach.parentElement?.querySelector('.game.hand-open');}
 private showBasics():void {this.coach.close();this.closeNote?.();this.introActive=true;clearTimeout(this.botTimer);const resume=()=>{this.introActive=false;this.renderCoach();this.maybeBot();};this.closeNote=openTutorialBasics(resume,resume,true);}
 private checkpoint():string {return `${this.run.id}:${this.run.scene}:${this.run.step}:${this.run.phase}:${this.run.done}`;}
 private resumePlay():void {
  if(this.disposed)return;
  this.dismissedCheckpoint=this.checkpoint();this.redirected=false;this.coach.close();this.renderCoach();this.applyGlow();this.maybeBot();
 }
 private renderCoach():void {
  if(this.disposed)return;
  const s=TUT_STEPS[this.lesson],lang=getLang(),scene=currentScene(this.run),cue=tutorialCue(this.run,this.handIsOpen),done=this.run.done;
  const brief=lang==='ja'?tutorialBrief(this.run.id,this.run.scene):{intro:scene.intro[lang],result:scene.result[lang]};
  const question=this.run.phase==='question',review=this.run.phase==='review',lost=this.run.state.over&&this.run.phase==='play';
  const outcome=question||review||done;
  const waiting=this.presenting||cue.action==='wait';
  const pending=!!this.run.state.pending;
  const open=!this.introActive&&!waiting&&!pending&&(outcome||lost||this.dismissedCheckpoint!==this.checkpoint());
  const previousFocus=this.coach.contains(document.activeElement)?(document.activeElement as HTMLElement)?.getAttribute('data-focus'):null;
  const title=done?text('実習クリア！','Lesson complete!','실습 완료!'):lost?text('もう一度、作戦を立てよう','Try another plan','다른 작전을 세워 봐요'):outcome?text('できた！ 何が起きた？','You did it! What changed?','해냈어요! 무엇이 바뀌었나요?'):s.title[lang];
  const reason=this.run.step===0?brief.intro:currentScene(this.run).steps[this.run.step]?.hint?.[lang]??cue.reason[lang];
  const status=this.hooks.guest?text('練習のクリアを保存しました。','Practice completion saved.','연습 완료를 저장했어요.'):this.saving?text('クリアを保存中…','Saving your clear…','완료 저장 중…'):this.settled?(this.earned?text(`${this.earned}シャード獲得！`,`${this.earned} Shards earned!`,`${this.earned}샤드 획득!`):text('クリア済みの実習を復習しました。','You reviewed a completed lesson.','완료한 실습을 복습했어요.')):text('保存できませんでした。再試行して続けられます。','Could not save. Retry to continue.','저장하지 못했어요. 다시 시도해 계속해요.');
  this.speech.innerHTML=`<header class="tutorial-popup-header"><span class="tutorial-eyebrow">ZENO / ${this.lesson+1} · ${TUT_STEPS.length}</span><button class="tutorial-icon-button" data-exit data-focus="exit" aria-label="${text('実習一覧へ戻る','Back to lessons','실습 목록으로')}">×</button></header>
   <p class="tutorial-chapter">${TUTORIAL_CHAPTERS[s.chapter][lang]} · ${text('練習盤面','Practice scene','연습 장면')} ${this.run.scene+1}/${this.run.scenes.length}</p>
   <h2 id="tutorial-heading">${title}</h2>
   <p id="tutorial-message" class="tutorial-message">${lost?text('この場面をやり直せるよ。使うカードや順番を変えて試そう。','Restart this scene and try different cards or a different order.','이 장면을 다시 시작해 카드나 순서를 바꿔 봐요.'):outcome?brief.result:reason}</p>
   ${this.changes.length?`<ul class="tutorial-changes" aria-label="${text('今の操作で変わったこと','Changes from the last action','방금 행동으로 바뀐 것')}">${this.changes.slice(0,4).map(c=>`<li>${c[lang]}</li>`).join('')}</ul>`:''}
   ${this.dice.length&&outcome?`<p class="coach-dice">${text('出たダイス','Dice rolled','주사위 결과')}: ${this.dice.map(rolls=>rolls.join(' + ')).join(' / ')}</p>`:''}
   ${this.redirected?`<p class="coach-redirect" role="status">${text('今はこの操作を試そう。下の「やってみる」で盤面に戻れるよ。','Try this action first. Press Try it to return to the board.','지금은 이 행동을 해 봐요. 해 보기를 누르면 필드로 돌아가요.')}</p>`:''}
   ${!outcome&&!lost?`<div class="tutorial-next-action"><span>${text('次にやること','Your next move','다음 행동')}</span><strong>${cue.instruction[lang]}</strong></div><button class="tutorial-game-button tutorial-primary" data-start data-focus="start">${text('やってみる','Try it','해 보기')} <span aria-hidden="true">→</span></button>`:''}
   ${question?`<fieldset class="tutorial-check"><legend>${scene.question!.prompt[lang]}</legend><div class="coach-answers">${scene.question!.options.map((o,i)=>`<button class="tutorial-game-button" data-answer="${i}" data-focus="answer-${i}">${o[lang]}</button>`).join('')}</div>${this.run.wrongAnswer?`<p class="coach-redirect" role="status">${scene.question!.explanation[lang]}</p>`:''}</fieldset>`:''}
   ${review&&!done?`<button class="tutorial-game-button tutorial-primary" data-continue data-focus="continue">${this.run.scene===this.run.scenes.length-1?text('実習をクリア','Finish lesson','실습 완료'):text('次の場面をプレイ','Play the next scene','다음 장면 플레이')} →</button>`:''}
   ${done?`<p class="coach-payment" role="status">${status}</p>${!this.settled&&!this.saving&&!this.hooks.guest?`<button class="tutorial-game-button tutorial-primary" data-retry data-focus="retry">${text('保存を再試行','Retry saving','저장 재시도')}</button>`:''}${this.settled?`<button class="tutorial-game-button tutorial-primary" data-next data-focus="next">${this.lesson===TUT_STEPS.length-1?text('実習一覧へ','Lesson list','실습 목록'):text('次の実習をプレイ','Play the next lesson','다음 실습 플레이')} →</button>`:''}`:''}
   ${lost?`<button class="tutorial-game-button tutorial-primary" data-restart data-focus="restart">${text('もう一度やってみる','Try again','다시 해 보기')}</button>`:''}
   <details class="tutorial-tools"><summary>${text('ヒント・ルール・設定','Hints, rules & settings','힌트·규칙·설정')}</summary>
    <p>${scene.intro[lang]}</p>${outcome?`<p>${scene.result[lang]}</p>`:''}
    ${cue.action==='free'?`<p>${cue.reason[lang]}</p>`:''}
    <div class="tutorial-tool-buttons"><button data-basics>${text('操作の基本','Controls','기본 조작')}</button><button data-notebook>${text('ルールノート','Rule notebook','규칙 노트')}</button><button data-pace aria-pressed="${this.fast}">${this.fast?text('演出：短縮','Effects: quick','연출: 짧게'):text('演出：通常','Effects: normal','연출: 보통')}</button><button data-reset ${this.saving?'disabled':''}>${text('この実習をやり直す','Restart this lesson','이 실습 다시 시작')}</button></div>
    <p>${text('練習用の盤面です。場面が変わるとカードとマナを準備し直します。時間制限はありません。','This is a practice board. Cards and mana are prepared again for each new scene. There is no timer.','연습 필드예요. 새 장면마다 카드와 마나를 다시 준비해요. 시간제한은 없어요.')}</p>
    ${this.record.length?`<details class="coach-record"><summary>${text('ここまでの振り返り','What you learned','지금까지 배운 것')}</summary>${this.record.map(r=>`<p><b>${r.title[lang]}</b><br>${r.result[lang]}</p>`).join('')}</details>`:''}
   </details>`;
  this.speech.querySelector('[data-exit]')!.addEventListener('click',()=>this.exits.onHome());
  this.speech.querySelector('[data-start]')?.addEventListener('click',()=>this.resumePlay());
  this.speech.querySelector('[data-reset]')!.addEventListener('click',()=>this.loadLesson(this.lesson,true));
  this.speech.querySelector('[data-restart]')?.addEventListener('click',()=>this.loadLesson(this.lesson,true));
  this.speech.querySelector('[data-notebook]')!.addEventListener('click',()=>{this.coach.close();this.closeNote?.();this.introActive=true;clearTimeout(this.botTimer);this.closeNote=openRuleNotebook(s.chapter,()=>{this.introActive=false;this.renderCoach();this.maybeBot();});});
  this.speech.querySelector('[data-basics]')!.addEventListener('click',()=>this.showBasics());
  this.speech.querySelector('[data-pace]')!.addEventListener('click',()=>{this.fast=!this.fast;try{localStorage.setItem('lore:tutorial:pace',this.fast?'fast':'full');}catch{}this.renderCoach();});
  this.speech.querySelector('[data-retry]')?.addEventListener('click',()=>void this.saveReward());
  this.speech.querySelector('[data-next]')?.addEventListener('click',()=>this.lesson===TUT_STEPS.length-1?this.exits.onHome():this.loadLesson(this.lesson+1));
  this.speech.querySelector('[data-continue]')?.addEventListener('click',()=>this.apply({type:'continueLesson'}));
  this.speech.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b=>b.onclick=()=>this.apply({type:'answer',choice:Number(b.dataset.answer)}));
  if(open){if(!this.coach.open){this.coach.showModal();this.speech.querySelector<HTMLButtonElement>('[data-start],[data-answer],[data-continue],[data-next],[data-retry],[data-restart]')?.focus();}else if(previousFocus)this.speech.querySelector<HTMLElement>(`[data-focus="${previousFocus}"]`)?.focus();}
  else this.coach.close();
  this.goal.hidden=open||this.introActive||done;
  this.goal.innerHTML=`<div><span class="tutorial-eyebrow">${this.lesson+1}/${TUT_STEPS.length} · ${s.title[lang]}</span><strong role="status">${this.presenting?text('カードの動きを見よう','Watch your move resolve','카드의 움직임을 봐요'):cue.instruction[lang]}</strong>${this.redirected&&pending?`<span class="coach-redirect">${text('指定された対象を選んでね。','Choose the indicated target.','안내된 대상을 골라요.')}</span>`:''}</div><button data-guide ${waiting?'disabled':''}>${text('ヒント','Help','힌트')}</button><button data-leave aria-label="${text('実習一覧へ','Lesson list','실습 목록')}">×</button>`;
  this.goal.querySelector('[data-guide]')!.addEventListener('click',()=>{if(pending){this.showBasics();return;}this.dismissedCheckpoint='';this.renderCoach();});
  this.goal.querySelector('[data-leave]')!.addEventListener('click',()=>this.exits.onHome());
 }
 private applyGlow():void {
  const root=this.coach.parentElement;if(!root)return;root.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));
  if(this.introActive||this.presenting||this.coach.open||this.run.done||this.run.phase!=='play'||actingSide(this.state)!==0)return;
  const cue=tutorialCue(this.run,this.handIsOpen);
  if(cue.action==='attack'){root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card').forEach(el=>{const m=this.state.players[0].field.find(m=>m.uid===el.dataset.uid);if(m&&(!cue.cardId||m.id===cue.cardId)&&monsterCanAttack(this.state,this.state.players[0],m))el.classList.add('tut-glow');});return;}
  const selectors=cue.action==='refresh'?['#refreshBtn']:cue.action==='buyMarket'?[`#fixedMarket .card[data-card-id="${cue.cardId}"]`]:cue.action==='buySupply'?[`#supplyMarket .card[data-card-id="${cue.cardId}"]`]:cue.action==='endTurn'?['#endBtn']:cue.action==='play'?[this.handIsOpen?`#hand .card[data-card-id="${cue.cardId}"]`:'#hand']:[];
  for(const selector of selectors)root.querySelectorAll(selector).forEach(el=>el.classList.add('tut-glow'));
 }
 destroy():void{this.disposed=true;this.closeNote?.();clearTimeout(this.botTimer);clearInterval(this.glowTimer);this.unsub();this.spirit.destroy();this.coach.parentElement?.classList.remove('tutorial-board');this.coach.parentElement?.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));this.coach.close();this.coach.remove();this.goal.remove();super.destroy();}
}
