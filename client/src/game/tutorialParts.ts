import {BaseController,type ControllerExits} from './controller';
import {advanceLesson,currentScene,tutorialOpponentAction,type LessonRun} from '../shared/tutorialLesson';
import {tutorialCue,isTutorialActionAllowed} from '../shared/tutorialGuide';
import {PART_TOURS,TUTORIAL_PARTS,createPartStart,tutorialPartKey} from '../shared/tutorialParts';
import type {Action} from '../shared/types';
import {getLang,onLangChange} from '../i18n';
import {mountManaSpirit} from '../ui/manaSpirit';
import {TutorialSpotlight} from '../ui/tutorialSpotlight';
import '../styles/tutorialParts.css';
import '../styles/zenoSpeech.css';

export class TutorialPartController extends BaseController {
 private run:LessonRun;
 private host?:HTMLElement;
 private speech?:HTMLElement;
 private spirit?:ReturnType<typeof mountManaSpirit>;
 private tour?:TutorialSpotlight;
 private intro=true;
 private busy=false;
 private finished=false;
 private timer=0;
 private glowTimer=0;
 private redirected=false;
 private handOpen=false;
 private unsub:()=>void=()=>{};
 protected get useTurnClock():boolean{return false;}
 constructor(private root:HTMLElement,exits:ControllerExits,private part:number,private next:(part:number)=>void,private accountId?:string){
  super(root,0,exits);root.classList.add('tutorial-board');this.introShown=true;const start=createPartStart(part);this.run=start.run;this.run.state.players[1].name='Zeno';this.applyResult({state:this.run.state,events:[]},false);
  if(start.history.length)this.restoreLog(start.history,true);
  // Each guided part starts from a closed log so the learner opens it as instructed.
  if(this.root.querySelector('.game.log-open'))this.root.querySelector<HTMLElement>('#logClose')?.click();
  const guided=PART_TOURS[part];
  if(guided){
   this.intro=false;
   this.tour=new TutorialSpotlight(root,guided,{label:TUTORIAL_PARTS[part].title,state:()=>this.busy?null:this.run.state,onComplete:()=>{this.tour=undefined;this.markComplete();this.next(part+1);},onExit:()=>this.exits.onHome()});
   return;
  }
  this.mountCoach();
 }
 private mountCoach():void{
  this.host=document.createElement('aside');this.host.className='part-coach is-intro';this.host.innerHTML='<div class="part-zeno" aria-hidden="true"></div><div class="part-speech zeno-speech"></div>';this.root.append(this.host);this.speech=this.host.querySelector('.part-speech')!;this.spirit=mountManaSpirit(this.host.querySelector('.part-zeno')!);
  this.unsub=onLangChange(()=>this.render());this.render();this.glowTimer=window.setInterval(()=>{const open=!!this.root.querySelector('.game.hand-open');if(open!==this.handOpen){this.handOpen=open;this.render();}else this.glow();},350);
 }
 private canAct():boolean{return !document.querySelector('.game-loading')&&!this.intro&&!this.busy&&!this.finished&&this.run.phase==='play'&&(!this.tour||this.tour.allowsGame());}
 override onEndTurn():void{if(!this.canAct())return;if(!isTutorialActionAllowed(this.run,{type:'endTurn'})){this.redirected=true;this.render();return;}super.onEndTurn();}
 override async onPlay(uid:string):Promise<void>{if(this.canAct())await super.onPlay(uid);}
 override onBuyMarket(i:number):void{if(this.canAct())super.onBuyMarket(i);}
 override onBuySupply(i:number):void{if(this.canAct())super.onBuySupply(i);}
 override onRefresh():void{if(this.canAct())super.onRefresh();}
 override onAttack(uid:string,targetUid?:string|null):void{if(this.canAct())super.onAttack(uid,targetUid);}
 protected submit(action:Action):void{
  if(action.type==='surrender'){this.exits.onHome();return;}
  if(!this.canAct())return;
  if(!isTutorialActionAllowed(this.run,action)){this.redirected=true;this.render();return;}
  this.redirected=false;this.apply(action);
 }
 private apply(action:Action):void{
  this.busy=true;const res=advanceLesson(this.run,action);this.applyResult(res);this.render();
  this.afterPresentation(()=>{if(this.dead)return;this.busy=false;this.view.render(this.run.state);if(!this.tour&&this.run.phase==='review'&&this.run.scene===this.run.scenes.length-1){advanceLesson(this.run,{type:'continueLesson'});this.finish();}this.render();this.maybeBot();});
 }
 protected maybeBot():void{
  if(!this.run||this.intro||this.busy||this.finished)return;const action=tutorialOpponentAction(this.run);if(!action)return;
  clearTimeout(this.timer);this.timer=window.setTimeout(()=>{if(!this.dead&&!this.busy)this.apply(action);},420);
 }
 protected showWin():void{/* The part completion speech replaces the normal outcome modal. */}
 private proceed():void{
  if(this.busy)return;
  if(this.finished){this.next(this.part+1);return;}
  if(this.intro){this.intro=false;this.render();this.maybeBot();return;}
  if(this.run.phase!=='review')return;
  const res=advanceLesson(this.run,{type:'continueLesson'});if(this.run.done)this.finish();else{this.applyResult(res,false);this.maybeBot();}this.render();
 }
 private markComplete():void{try{localStorage.setItem(tutorialPartKey(this.part,this.accountId),'1');}catch{}}
 private finish():void{this.finished=true;this.markComplete();this.spirit?.celebrate();}
 private render():void{
  if(!this.host||!this.speech)return;const meta=TUTORIAL_PARTS[this.part],lang=getLang(),review=!this.intro&&this.run.phase==='review';
  const cue=!this.intro&&!this.finished&&!review?tutorialCue(this.run,!!this.root.querySelector('.game.hand-open')):null;
  if(cue?.action==='attack'&&this.run.state.players[1].field.length)cue.instruction={ja:'指が示す味方を、相手モンスターへドラッグしよう。',en:'Drag the indicated ally onto an enemy monster.',ko:'손가락이 가리키는 아군을 상대 몬스터로 드래그해.'};
  const title=this.finished?['いいね、できた！','You did it!','좋아, 해냈어!'][lang==='ja'?0:lang==='en'?1:2]:this.intro?['一緒にやってみよう！','Let’s try it together!','같이 해 보자!'][lang==='ja'?0:lang==='en'?1:2]:review?['ほら、変わったね。','See what changed?','봐, 달라졌지?'][lang==='ja'?0:lang==='en'?1:2]:cue!.instruction[lang];
  let body=this.intro?meta.intro[lang]:this.finished||review?currentScene(this.run).result[lang]:(cue?.reason??currentScene(this.run).intro)[lang];
  if(this.redirected)body=(lang==='ja'?'まずは光ってるところでやってみよう。ぼくがついてるよ。 ':lang==='en'?'Use the glowing target for the instructed action first. ':'지금은 빛나는 대상에 안내된 행동을 먼저 해 봐. ')+body;
  if(this.busy)body=lang==='ja'?'カードと数字の変化を見よう。':lang==='en'?'Watch the cards and values change.':'카드와 숫자가 바뀌는 과정을 봐.';
  else if(!this.intro&&!this.finished&&this.run.phase==='play'&&this.run.state.cur===1&&!this.run.state.pending)body=lang==='ja'?'今はぼくの番だよ。ちょっと見ててね。':lang==='en'?"It’s my turn now. Watch what happens.":'지금은 내 차례야. 잠깐 지켜봐 줘.';
  this.host.classList.toggle('is-intro',this.intro||this.finished||review);this.host.classList.toggle('is-playing',!this.intro&&!this.finished&&!review);
  const canNext=this.intro||review||this.finished;this.speech.replaceChildren();
  const eyebrow=document.createElement('span');eyebrow.className='part-eyebrow';eyebrow.textContent=`${this.part+1} / ${TUTORIAL_PARTS.length}`;eyebrow.setAttribute('aria-label',meta.title[lang]);
  const speaker=document.createElement('span');speaker.className='zeno-speaker';speaker.textContent=lang==='ja'?'ゼノ':lang==='en'?'Zeno':'제노';const header=document.createElement('header');header.append(speaker,eyebrow);
  const heading=document.createElement('h2');heading.textContent=title;const paragraph=document.createElement('p');paragraph.textContent=body;paragraph.setAttribute('aria-live','polite');const footer=document.createElement('footer');
  const exit=document.createElement('button');exit.className='lore-button lore-button-quiet';exit.textContent=lang==='ja'?'パート一覧':lang==='en'?'Part list':'파트 목록';exit.onclick=()=>this.exits.onHome();footer.append(exit);
  if(canNext){const button=document.createElement('button');button.className='lore-button lore-button-primary';button.textContent=this.finished?(this.part<TUTORIAL_PARTS.length-1?(lang==='ja'?'次のパート →':lang==='en'?'Next part →':'다음 파트 →'):(lang==='ja'?'一覧へ':lang==='en'?'Part list':'목록으로')):review?(this.run.scene===this.run.scenes.length-1?(lang==='ja'?'パートを終える':lang==='en'?'Finish part':'파트 마치기'):(lang==='ja'?'次の場面':lang==='en'?'Next scene':'다음 장면')):(lang==='ja'?'始める':lang==='en'?'Start':'시작');button.disabled=this.busy;button.onclick=()=>this.proceed();footer.append(button);}
  else{const hint=document.createElement('span');hint.textContent=this.busy?(lang==='ja'?'進行中…':lang==='en'?'Resolving…':'진행 중…'):(lang==='ja'?'やってみよう！':lang==='en'?'Give it a try!':'직접 해 봐!');footer.append(hint);}
  const content=document.createElement('div');content.className='zeno-speech-content';content.append(header,heading,paragraph,footer);this.speech.append(content);this.glow();
 }
 private glow():void{
  document.querySelectorAll('.part-highlight').forEach(e=>e.classList.remove('part-highlight','part-pointed'));if(this.intro||this.finished||this.busy||this.run.phase!=='play')return;
  const cue=tutorialCue(this.run,this.handOpen);let selector=cue.action==='buyMarket'?`#fixedMarket .card[data-card-id="${cue.cardId}"]`:cue.action==='buySupply'?`#supplyMarket .card[data-card-id="${cue.cardId}"]`:cue.action==='refresh'?'#refreshBtn':cue.action==='play'?(this.handOpen?`#hand .card[data-card-id="${cue.cardId}"]`:'#hand'):cue.action==='attack'?`#meRow .zone-mon .card${cue.cardId?`[data-card-id="${cue.cardId}"]`:''}`:cue.action==='target'?'#oppRow .zone-mon .card':cue.action==='endTurn'?'#endBtn':'';
  if(selector)document.querySelectorAll(selector).forEach(e=>{e.classList.add('part-highlight');if(cue.action==='attack'||cue.action==='play'&&this.handOpen)e.classList.add('part-pointed');});
 }
 destroy():void{clearTimeout(this.timer);clearInterval(this.glowTimer);this.unsub();this.tour?.destroy();document.querySelectorAll('.part-highlight').forEach(e=>e.classList.remove('part-highlight','part-pointed'));this.spirit?.destroy();this.host?.remove();super.destroy();}
}
