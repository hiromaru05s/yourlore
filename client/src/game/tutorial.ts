import { tutorialCue, isTutorialActionAllowed } from '../shared/tutorialGuide';
import { openTutorialBasics } from '../ui/tutorialBasics';
import { openRuleNotebook } from '../screens/tutorial';
import { actingSide, monsterCanAttack } from '../shared/engine';
import type { Action } from '../shared/types';
import { BaseController, type ControllerExits } from './controller';
import { createLesson, advanceLesson, currentScene, tutorialOpponentAction, TUTORIAL_ACTION_LIMIT, type TutorialAction, type LessonRun } from '../shared/tutorialLesson';
import { TUT_STEPS, TUTORIAL_CHAPTERS } from '../shared/tutorialSteps';
import { api } from '../net/api';
import { getLang, onLangChange } from '../i18n';
import { loungeText as text } from '../ui/loungeText';
import { mountManaSpirit } from '../ui/manaSpirit';
import '../styles/tutorialAcademy.css';
export {TUT_STEPS} from '../shared/tutorialSteps';
export interface TutorialHooks {onCredits?(credits:number):void;onNext?(lesson:number):void;lesson?:number;guest?:boolean;accountId?:string;}
export class TutorialController extends BaseController {
 private run:LessonRun;private lesson:number;private hooks:TutorialHooks;
 private coach:HTMLElement;private speech:HTMLElement;private spirit:ReturnType<typeof mountManaSpirit>;
 private progressKey='';
 private disposed=false;private introActive=false;private presenting=false;private redirected=false;private hints=false;
 private saving=false;private settled=false;private earned=0;private reward:number;
 private botTimer=0;private glowTimer=0;private handWasOpen=false;private unsub:()=>void;private closeNote:(()=>void)|undefined;
 protected get useTurnClock():boolean{return false;}
 constructor(root:HTMLElement,exits:ControllerExits,playerName='SEEKER',hooks:TutorialHooks={}){
  super(root,0,exits);this.hooks=hooks;this.introShown=true;this.lesson=Math.max(0,Math.min(TUT_STEPS.length-1,hooks.lesson??0));
  this.run=createLesson(TUT_STEPS[this.lesson].id);
  this.progressKey=`lore:tutorial:v3:run:${hooks.accountId??'guest'}:${this.run.id}`;
  try{const actions=JSON.parse(localStorage.getItem(this.progressKey)??'[]');if(Array.isArray(actions)&&actions.length<=TUTORIAL_ACTION_LIMIT){for(const action of actions){if(!isTutorialActionAllowed(this.run,action))throw Error('stale practice');advanceLesson(this.run,action);}}}catch{this.run=createLesson(TUT_STEPS[this.lesson].id);}
  this.run.state.players[0].name=playerName;this.run.state.players[1].name='Zeno';this.reward=TUT_STEPS[this.lesson].reward;
  this.coach=document.createElement('aside');this.coach.className='tut-coach academy-coach';this.coach.innerHTML='<div class="coach-spirit"></div><div class="coach-speech" aria-live="polite"></div>';root.append(this.coach);this.speech=this.coach.querySelector('.coach-speech')!;this.spirit=mountManaSpirit(this.coach.querySelector('.coach-spirit')!);
  root.classList.add('tutorial-board');this.applyResult({state:this.run.state,events:[]},false);this.renderCoach();this.unsub=onLangChange(()=>this.renderCoach());
  this.glowTimer=window.setInterval(()=>{if(this.handWasOpen!==this.handIsOpen){this.handWasOpen=this.handIsOpen;this.renderCoach();}this.applyGlow();},350);
  if(!hooks.guest)void api.tutorialStatus().then(s=>{if(!this.disposed){this.reward=s.amounts?.[this.run.id]??this.reward;this.renderCoach();}}).catch(()=>{});
  if(this.run.done)void this.saveReward();else if(this.lesson===0&&!this.run.actions.length)this.showBasics();
 }
 protected submit(action:Action):void {
  if(this.disposed||this.introActive||this.presenting||this.run.done||actingSide(this.run.state)!==0)return;
  if(action.type==='surrender'){this.exits.onHome();return;}
  if(!isTutorialActionAllowed(this.run,action)){this.redirected=true;this.coach.classList.remove('minimized');this.renderCoach();
   // A cancelled picker closes before submit. Restore it when this demonstration requires a choice.
   if(this.run.state.pending&&action.type==='pick'&&action.uid===null)this.applyResult({state:this.run.state,events:[]},false);
   return;}
  this.redirected=false;this.apply(action);
 }
 override onEndTurn():void {
  if(this.introActive||this.presenting||this.run.done||!isTutorialActionAllowed(this.run,{type:'endTurn'})){this.redirected=true;this.renderCoach();return;}
  super.onEndTurn();
 }
 private apply(action:TutorialAction):void {
  if(this.presenting||this.disposed)return;
  const previous=this.run.state,res=advanceLesson(this.run,action);
  try{localStorage.setItem(this.progressKey,JSON.stringify(this.run.actions));}catch{/* Practice works when storage is unavailable. */}
  if(action.type==='answer'){this.renderCoach();return;}
  if(this.run.done){this.spirit.celebrate();void this.saveReward();this.renderCoach();return;}
  if(res.state!==previous){
   this.presenting=true;this.renderCoach();this.applyResult(res,action.type!=='continueLesson');
   const state=res.state;this.afterPresentation(()=>{if(this.disposed||this.run.state!==state)return;this.presenting=false;this.hints=false;this.renderCoach();this.maybeBot();});
  }else this.renderCoach();
 }
 protected maybeBot():void {
  if(this.disposed||this.introActive||this.presenting||this.run?.done||this.run?.phase!=='play')return;
  const action=tutorialOpponentAction(this.run);if(!action)return;
  clearTimeout(this.botTimer);this.botTimer=window.setTimeout(()=>{if(!this.disposed&&!this.introActive&&!this.presenting){const a=tutorialOpponentAction(this.run);if(a)this.apply(a);}},550);
 }
 protected showWin():void { /* Prepared loss/draw scenes are observations, not failed lessons. */ }
 private async saveReward():Promise<void>{
  if(this.saving||this.settled)return;this.saving=true;this.renderCoach();
  try{if(!this.hooks.guest){const r=await api.completeTutorial(this.run.id,this.run.actions);this.hooks.onCredits?.(r.credits);if(this.disposed)return;this.earned=r.amount;}
   else {try{const raw=JSON.parse(localStorage.getItem('lore:tutorial:v3:guest')??'[]');const keys=Array.isArray(raw)?raw:[];localStorage.setItem('lore:tutorial:v3:guest',JSON.stringify([...new Set([...keys,TUT_STEPS[this.lesson].key])]));}catch{}}
   this.settled=true;try{localStorage.removeItem(this.progressKey);}catch{}}
  catch{/* Preserve the finished transcript so a retry is idempotent. */}
  finally{this.saving=false;if(!this.disposed)this.renderCoach();}
 }
 private get handIsOpen():boolean{return !!this.coach.parentElement?.querySelector('.game.hand-open');}
 private showBasics():void {this.closeNote?.();this.introActive=true;clearTimeout(this.botTimer);const resume=()=>{this.introActive=false;this.renderCoach();this.maybeBot();};this.closeNote=openTutorialBasics(resume,resume,true);}
 private renderCoach():void {
  const s=TUT_STEPS[this.lesson],lang=getLang(),scene=currentScene(this.run),cue=tutorialCue(this.run,this.handIsOpen),done=this.run.done;
  const review=this.run.phase==='review',question=this.run.phase==='question',lost=this.run.state.over&&this.run.phase==='play';
  const status=this.hooks.guest?text('練習モード：報酬の受取にはログインが必要です。','Practice mode: sign in to receive rewards.','연습 모드: 보상은 로그인이 필요해요.'):this.saving?text('クリアを保存中…','Saving your clear…','완료 저장 중…'):this.settled?(this.earned?text(`${this.earned}シャードを受け取ったよ。`,`${this.earned} Shards received.`,`${this.earned}샤드를 받았어요.`):text('この実習の初回報酬は受取済みだよ。','This first-clear reward was already received.','이 실습의 첫 완료 보상은 이미 받았어요.')):text('保存できませんでした。「受取を再試行」で続けられます。','Could not save. Use Retry reward.','저장하지 못했어요. 보상 재시도를 눌러요.');
  this.speech.innerHTML=`<div class="tut-coach-head"><span class="tut-coach-step">${s.chapter+1}.${TUT_STEPS.filter(x=>x.chapter===s.chapter).findIndex(x=>x.id===s.id)+1}</span><b>${s.title[lang]}</b><button class="coach-minimize" data-collapse aria-label="${text('案内を小さくする','Minimize guide','안내 접기')}" title="${text('小さくする','Minimize','접기')}">−</button><button class="coach-exit" aria-label="${text('実習一覧へ','Lesson list','실습 목록')}">×</button></div>
   <p class="coach-name">Zeno · ${TUTORIAL_CHAPTERS[s.chapter][lang]}</p><p class="coach-cue-step">${text('場面','Scene','장면')} ${this.run.scene+1}/${this.run.scenes.length} · ${this.presenting?text('盤面の変化を見よう','Watch the board','필드 변화를 봐요'):done?text('実習クリア','Lesson complete','실습 완료'):review?text('確かめたこと','What happened','확인한 것'):question?text('最後に確認','Check your understanding','이해 확인'):`${text('操作','Action','행동')} ${cue.step}/${cue.total}`}</p>
   <p class="tut-coach-body">${this.presenting?text('カードの移動と、変わった数字を見てね。','Watch the moving cards and changing numbers.','카드 이동과 바뀌는 숫자를 봐요.'):lost?text('今回は届かなかったね。やり直して、別の順番を試そう。','That attempt did not work. Restart and try another sequence.','이번에는 잘 안 됐네요. 다시 시작해 다른 순서를 시도해요.'):cue.instruction[lang]}</p>
   ${!this.presenting&&!done&&!lost?`<p class="coach-reason">${cue.action==='free'&&!this.hints?scene.intro[lang]:cue.reason[lang]}</p>`:''}
   ${this.redirected?`<p class="coach-redirect" role="status">${text('今は、Zenoが案内しているカードと操作を試そう。対象を選び直しても大丈夫だよ。','Try the card and action Zeno is explaining. You can choose the target again.','지금은 Zeno가 안내하는 카드와 행동을 해 봐요. 대상을 다시 골라도 괜찮아요.')}</p>`:''}
   ${!this.presenting&&question?`<div class="coach-answers">${scene.question!.options.map((o,i)=>`<button class="btn" data-answer="${i}">${o[lang]}</button>`).join('')}</div>${this.run.wrongAnswer?`<p class="coach-redirect">${text('もう一度、理由を読んで選んでみよう。','Read the explanation and try again.','설명을 읽고 다시 골라 봐요.')}</p>`:''}`:''}
   ${done?`<p class="coach-payment" role="status">${status}</p>`:`<p class="coach-practice">${text('用意した練習盤面 · 時間制限なし','Prepared practice board · No timer','준비된 연습 필드 · 시간제한 없음')} · ${this.hooks.guest?text('何度でも練習できるよ','Replay any time','언제든 다시 연습'):`+${this.reward} ${text('シャード','Shards','샤드')}`}</p>`}
   <div class="coach-actions">
    ${!done&&review&&!this.presenting?`<button class="btn btn-primary" data-continue>${this.run.scene===this.run.scenes.length-1?text('理解できた・実習をクリア','Finish lesson','이해했어요 · 실습 완료'):text('次の場面へ','Next scene','다음 장면')}</button>`:''}
    ${done&&!this.settled&&!this.saving&&!this.hooks.guest?`<button class="btn btn-primary" data-retry>${text('受取を再試行','Retry reward','보상 재시도')}</button>`:''}
    ${done&&this.settled?`<button class="btn btn-primary" data-next>${this.lesson===TUT_STEPS.length-1?text('実習一覧へ','Lesson list','실습 목록'):text('次の実習へ','Next lesson','다음 실습')}</button>`:''}
    ${cue.action==='free'?`<button class="btn btn-ghost" data-hint>${text('Zenoのヒント','Zeno’s hint','Zeno의 힌트')}</button>`:''}
    <button class="btn btn-ghost" data-notebook>${text('ルールノート','Rule notebook','규칙 노트')}</button>
    <button class="btn btn-ghost" data-reset ${this.saving?'disabled':''}>${text('やり直す','Restart','다시 시작')}</button>
   </div>${this.run.actions.length>=TUTORIAL_ACTION_LIMIT&&!done?`<p>${text('操作回数が多くなったので、やり直してみよう。','Restart to try a shorter route.','다시 시작해 짧은 경로를 시도해요.')}</p>`:''}`;
  this.speech.querySelector('.coach-exit')!.addEventListener('click',()=>this.exits.onHome());
  this.speech.querySelector('[data-reset]')!.addEventListener('click',()=>{try{localStorage.removeItem(this.progressKey);}catch{}this.hooks.onNext?.(this.lesson);});
  this.speech.querySelector('[data-notebook]')!.addEventListener('click',()=>{this.closeNote?.();this.introActive=true;clearTimeout(this.botTimer);this.closeNote=openRuleNotebook(s.chapter,()=>{this.introActive=false;this.renderCoach();this.maybeBot();});});
  this.speech.querySelector('[data-retry]')?.addEventListener('click',()=>void this.saveReward());
  this.speech.querySelector('[data-next]')?.addEventListener('click',()=>this.lesson===TUT_STEPS.length-1?this.exits.onHome():this.hooks.onNext?.(this.lesson+1));
  this.speech.querySelector('[data-continue]')?.addEventListener('click',()=>this.apply({type:'continueLesson'}));
  this.speech.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b=>b.onclick=()=>this.apply({type:'answer',choice:Number(b.dataset.answer)}));
  this.speech.querySelector('[data-hint]')?.addEventListener('click',()=>{this.hints=!this.hints;this.renderCoach();});
  this.speech.querySelector('[data-collapse]')!.addEventListener('click',()=>this.coach.classList.toggle('minimized'));
  if(!this.coach.querySelector('.coach-expand')){const b=document.createElement('button');b.className='coach-expand';b.onclick=()=>this.coach.classList.remove('minimized');this.coach.append(b);}
  this.coach.querySelector('.coach-expand')!.textContent=text('Zenoの案内','Zeno’s guide','Zeno의 안내');
  if(done||(!this.presenting&&(review||question||lost)))this.coach.classList.remove('minimized');
 }
 private applyGlow():void {
  const root=this.coach.parentElement;if(!root)return;root.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));
  if(this.introActive||this.presenting||this.run.done||this.run.phase!=='play'||actingSide(this.state)!==0)return;
  const cue=tutorialCue(this.run,this.handIsOpen);
  if(cue.action==='attack'){root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card').forEach(el=>{const m=this.state.players[0].field.find(m=>m.uid===el.dataset.uid);if(m&&(!cue.cardId||m.id===cue.cardId)&&monsterCanAttack(this.state,this.state.players[0],m))el.classList.add('tut-glow');});return;}
  const selectors=cue.action==='refresh'?['#refreshBtn']:cue.action==='buyMarket'?[`#fixedMarket .card[data-card-id="${cue.cardId}"]`]:cue.action==='buySupply'?[`#supplyMarket .card[data-card-id="${cue.cardId}"]`]:cue.action==='endTurn'?['#endBtn']:cue.action==='play'?[this.handIsOpen?`#hand .card[data-card-id="${cue.cardId}"]`:'#hand']:[];
  for(const selector of selectors)root.querySelectorAll(selector).forEach(el=>el.classList.add('tut-glow'));
 }
 destroy():void{this.disposed=true;this.closeNote?.();clearTimeout(this.botTimer);clearInterval(this.glowTimer);this.unsub();this.spirit.destroy();this.coach.parentElement?.classList.remove('tutorial-board');this.coach.parentElement?.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));this.coach.remove();super.destroy();}
}
