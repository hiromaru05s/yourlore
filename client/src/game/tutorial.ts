import type { Action } from '../shared/types';
import { BaseController, type ControllerExits } from './controller';
import { createLesson, advanceLesson, TUTORIAL_ACTION_LIMIT, type LessonRun } from '../shared/tutorialLesson';
import { TUT_STEPS } from '../shared/tutorialSteps';
import { api } from '../net/api';
import { getLang, onLangChange } from '../i18n';
import { loungeText as text } from '../ui/loungeText';
import { mountManaSpirit } from '../ui/manaSpirit';
import '../styles/tutorialAcademy.css';
export {TUT_STEPS} from '../shared/tutorialSteps';
export interface TutorialHooks { onCredits?(credits:number):void; onNext?(lesson:number):void; lesson?:number; guest?:boolean; }

export class TutorialController extends BaseController {
  private run:LessonRun;
  private lesson:number;
  private hooks:TutorialHooks;
  private coach:HTMLElement;
  private speech:HTMLElement;
  private spirit:ReturnType<typeof mountManaSpirit>;
  private botTimer=0;
  private glowTimer=0;
  private disposed=false;
  private saving=false;
  private settled=false;
  private completed=false;
  private earned=0;
  private unsub:()=>void;
  protected get useTurnClock():boolean {return false;}
  constructor(root:HTMLElement,exits:ControllerExits,playerName='SEEKER',hooks:TutorialHooks={}) {
    super(root,0,exits);this.hooks=hooks;this.introShown=true;
    this.lesson=Math.max(0,Math.min(TUT_STEPS.length-1,hooks.lesson??0));
    this.run=createLesson(TUT_STEPS[this.lesson].id);this.run.state.players[0].name=playerName;
    this.coach=document.createElement('aside');this.coach.className='tut-coach academy-coach';
    this.coach.innerHTML='<div class="coach-spirit"></div><div class="coach-speech" aria-live="polite"></div>';
    root.append(this.coach);this.speech=this.coach.querySelector('.coach-speech')!;
    this.spirit=mountManaSpirit(this.coach.querySelector('.coach-spirit')!);
    root.classList.add('tutorial-board');this.applyResult({state:this.run.state,events:[]},false);
    this.renderCoach();this.unsub=onLangChange(()=>this.renderCoach());
    this.glowTimer=window.setInterval(()=>this.applyGlow(),350);
  }
  protected submit(action:Action):void {
    if(this.disposed||this.run.done||this.run.state.cur!==0)return;
    if(action.type==='surrender'){this.exits.onHome();return;}
    this.apply(action);
  }
  private apply(action:Action):void {
    const res=advanceLesson(this.run,action);this.applyResult(res);
    this.renderCoach();
    if(this.run.done&&!this.completed){this.completed=true;this.spirit.celebrate();void this.saveReward();}
  }
  protected maybeBot():void {
    if(this.disposed||this.run?.done||this.state.over||this.state.cur!==1)return;
    clearTimeout(this.botTimer);this.botTimer=window.setTimeout(()=>{if(!this.disposed&&!this.run.done&&this.state.cur===1)this.apply({type:'endTurn'});},650);
  }
  protected showWin():void { /* Completion and payment use the lesson panel, including the final duel. */ }
  private async saveReward():Promise<void> {
    if(this.saving||this.settled)return;this.saving=true;this.renderCoach();
    try {
      if(!this.hooks.guest){const r=await api.completeTutorial(TUT_STEPS[this.lesson].id,this.run.actions);this.hooks.onCredits?.(r.credits);if(this.disposed)return;this.earned=r.amount;}
      this.settled=true;
    }catch{ /* Keep the exact completed transcript for a retry. No fabricated payment. */ }
    finally{this.saving=false;if(!this.disposed)this.renderCoach();}
  }
  private renderCoach():void {
    const s=TUT_STEPS[this.lesson],lang=getLang(),done=this.run.done;
    const status=this.hooks.guest?text('練習モード：シャードは支給されません。','Practice mode: no Shards are awarded.','연습 모드: 샤드가 지급되지 않아요.'):
      this.saving?text('クリアを記録しています…','Saving your clear…','완료 기록 중…'):
      this.settled?(this.earned?text('250シャードを受け取りました。','250 Shards received.','250샤드를 받았어요.'):text('初回報酬は受取済みです。','First-clear reward already received.','첫 완료 보상은 이미 받았어요.')):
      text('通信に失敗しました。受取を再試行してください。','Could not save. Retry to receive your reward.','저장하지 못했어요. 보상 받기를 다시 시도하세요.');
    this.speech.innerHTML=`<div class="tut-coach-head"><span class="tut-coach-step">${this.lesson+1}/${TUT_STEPS.length}</span><b>${s.title[lang]}</b><button class="coach-exit" aria-label="${text('実習一覧へ','Lesson list','실습 목록')}">×</button></div>
      <p class="coach-name">${text('マナの精霊','MANA SPIRIT','마나 정령')} · ${done?text('よくできたね','Well done','잘했어요'):text('一緒に試してみよう','Let’s try it together','함께 해 봐요')}</p>
      <p class="tut-coach-body">${done?s.learned[lang]:this.state.pending?this.pendingHint():s.body[lang]}</p>
      ${done?`<p class="coach-payment" role="status">${status}</p>`:`<p class="coach-practice">${text('練習用の盤面 · 時間制限なし · 初回 +250シャード','Practice board · No timer · First clear +250 Shards','연습용 필드 · 시간제한 없음 · 첫 완료 +250샤드')}</p>`}
      <div class="coach-actions">${done&&!this.settled&&!this.saving&&!this.hooks.guest?`<button class="btn btn-primary" data-retry>${text('受取を再試行','Retry reward','보상 재시도')}</button>`:''}
      ${done&&this.settled?`<button class="btn btn-primary" data-next>${this.lesson===TUT_STEPS.length-1?text('実習一覧へ','Lesson list','실습 목록'):text('次の実習へ','Next lesson','다음 실습')}</button>`:''}
      <button class="btn btn-ghost" data-reset ${this.saving?'disabled':''}>${text('この実習をやり直す','Restart lesson','실습 다시 시작')}</button><button class="btn btn-ghost" data-collapse>${text('小さくする','Minimize','접기')}</button></div>
      ${this.run.actions.length>=TUTORIAL_ACTION_LIMIT&&!done?`<p>${text('練習をやり直して、もう一度試そう。','Restart the lesson and try again.','실습을 다시 시작해 보세요.')}</p>`:''}`;
    this.speech.querySelector<HTMLButtonElement>('.coach-exit')!.onclick=()=>this.exits.onHome();
    this.speech.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=()=>this.hooks.onNext?.(this.lesson);
    this.speech.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click',()=>void this.saveReward());
    this.speech.querySelector<HTMLButtonElement>('[data-next]')?.addEventListener('click',()=>this.lesson===TUT_STEPS.length-1?this.exits.onHome():this.hooks.onNext?.(this.lesson+1));
    this.speech.querySelector<HTMLButtonElement>('[data-collapse]')!.onclick=()=>{this.coach.classList.toggle('minimized');};
    if(!this.coach.querySelector('.coach-expand')){const b=document.createElement('button');b.className='coach-expand';b.textContent=text('案内を開く','Open guide','안내 열기');b.onclick=()=>this.coach.classList.remove('minimized');this.coach.append(b);}
    this.coach.querySelector('.coach-expand')!.textContent=text('案内を開く','Open guide','안내 열기');
    if(done)this.coach.classList.remove('minimized');
  }
  private pendingHint():string {
    return this.state.pending?.reason==='handCap'?text('墓地へ送る手札を1枚選んでね。残すカードを選ぶ操作ではないよ。','Select one card to discard, not a card to keep.','남길 카드가 아니라 묘지로 보낼 카드 1장을 선택하세요.'):
      text('光っている候補から対象を選ぼう。対象の説明は盤面にも表示されているよ。','Choose a highlighted target. The board also shows what you can select.','빛나는 후보에서 대상을 선택하세요. 필드에도 선택 안내가 표시돼요.');
  }
  private applyGlow():void {
    const root=this.coach.parentElement;if(!root)return;
    root.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));
    if(this.run.done||this.state.cur!==0||this.state.pending)return;
    const id=this.run.id;
    const selectors=id==='market'?['#refreshBtn']:id==='cycle'&&!this.run.facts.has('buy')?['#market']:id==='cycle'||id==='hand'||(id==='enchant'&&this.run.facts.has('play:E3'))?['#endBtn']:id==='combat'||(id==='summon'&&this.run.facts.has('summon'))?['#meRow .card']:['#hand'];
    for(const s of selectors)root.querySelectorAll(s).forEach(el=>el.classList.add('tut-glow'));
  }
  destroy():void {this.disposed=true;clearTimeout(this.botTimer);clearInterval(this.glowTimer);this.unsub();this.spirit.destroy();this.coach.parentElement?.classList.remove('tutorial-board');this.coach.parentElement?.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));this.coach.remove();super.destroy();}
}
