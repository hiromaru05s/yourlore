import {TutorialActionGuide,placeTutorialCoach,guideElement} from '../ui/tutorialActionGuide';
import {monsterCanAttack} from '../shared/engine';
import {BaseController,type ControllerExits} from './controller';
import {advanceLesson,currentScene,tutorialOpponentAction,type LessonRun} from '../shared/tutorialLesson';
import {tutorialCue,isTutorialActionAllowed} from '../shared/tutorialGuide';
import {PART_TOURS,TUTORIAL_PARTS,createPartStart,tutorialPartKey} from '../shared/tutorialParts';
import type {Action,GameEvent} from '../shared/types';
import {TutorialCheckpoints,type TutorialCheckpoint,type TutorialPresentation} from '../shared/tutorialCheckpoints';
import {closeOverlay} from '../ui/modal';
import {zoomCard} from '../ui/cardInspection';
import {getLang,onLangChange} from '../i18n';
import {mountManaSpirit} from '../ui/manaSpirit';
import {TutorialSpotlight} from '../ui/tutorialSpotlight';
import '../styles/tutorialParts.css';
import '../styles/zenoSpeech.css';

/** Owns one live runtime. A rewind retires all old input/presentation callbacks. */
export class TutorialPartController {
 private runtime:TutorialPartRuntime;
 private checkpoints=new TutorialCheckpoints();
 private dead=false;
 constructor(root:HTMLElement,exits:ControllerExits,part:number,next:(part:number)=>void,accountId?:string){
  const mount=(index=0,checkpoint?:TutorialCheckpoint):TutorialPartRuntime=>new TutorialPartRuntime(root,exits,part,next,accountId,this.checkpoints,index,checkpoint,to=>{
   if(this.dead)return;
   const saved=this.checkpoints.rewind(to);
   this.runtime.destroy();closeOverlay();
   this.runtime=mount(to,saved);
  });
  this.runtime=mount();
 }
 get botDifficulty(){return this.runtime.botDifficulty;}
 guideContext(){return this.runtime.guideContext();}
 destroy():void{if(this.dead)return;this.dead=true;this.runtime.destroy();}
}

class TutorialPartRuntime extends BaseController {
 private run:LessonRun;
 private history:GameEvent[]=[];
 private rewinding=false;
 private host?:HTMLElement;
 private speech?:HTMLElement;
 private spirit?:ReturnType<typeof mountManaSpirit>;
 private tour?:TutorialSpotlight;
 private intro=true;
 private busy=false;
 private finished=false;
 private timer=0;
 private guide?:TutorialActionGuide;
 private guideFrame=0;
 private redirected=false;
 private handOpen=false;
 private unsub:()=>void=()=>{};
 protected get useTurnClock():boolean{return false;}
 constructor(private root:HTMLElement,exits:ControllerExits,private part:number,private next:(part:number)=>void,private accountId:string|undefined,private checkpoints:TutorialCheckpoints,startIndex:number,checkpoint:TutorialCheckpoint|undefined,restart:(index:number)=>void){
  super(root,0,exits);root.classList.add('tutorial-board');this.introShown=true;const start=createPartStart(part);this.run=checkpoint?{...checkpoint.run,scenes:start.run.scenes}:start.run;this.history=checkpoint?.history??start.history;this.run.state.players[1].name='Zeno';this.busy=true;this.applyResult({state:this.run.state,events:[]},false);
  if(this.history.length)this.restoreLog(this.history,true);
  // Each guided part starts from a closed log so the learner opens it as instructed.
  if(this.root.querySelector('.game.log-open'))this.root.querySelector<HTMLElement>('#logClose')?.click();
  const guided=PART_TOURS[part];
  if(guided){
   this.intro=false;
   this.afterPresentation(()=>{
    this.busy=false;
    if(checkpoint)this.restorePresentation(checkpoint.presentation);
    this.tour=new TutorialSpotlight(root,guided,{label:TUTORIAL_PARTS[part].title,startIndex,state:()=>this.busy?null:this.run.state,
     onStep:index=>this.checkpoints.save(index,this.run,this.history,this.presentation()),previousStep:index=>this.checkpoints.previous(index),
     rewind:index=>{this.rewinding=true;this.busy=true;clearTimeout(this.timer);this.fastForward();this.afterPresentation(()=>restart(index));},
     onComplete:()=>{this.tour=undefined;this.markComplete();this.next(part+1);},onExit:()=>this.exits.onHome()});
   });
   return;
  }
  this.afterPresentation(()=>{this.busy=false;this.render();});
  this.guide=new TutorialActionGuide();this.mountCoach();
  const track=()=>{if(this.dead)return;const open=!!this.root.querySelector('.game.hand-open');if(open!==this.handOpen){this.handOpen=open;this.render();}else this.glow();this.guideFrame=requestAnimationFrame(track);};this.guideFrame=requestAnimationFrame(track);
 }
 private mountCoach():void{
  this.host=document.createElement('aside');this.host.className='part-coach is-intro';this.host.innerHTML='<div class="part-zeno" aria-hidden="true"></div><div class="part-speech zeno-speech"></div>';this.root.append(this.host);this.speech=this.host.querySelector('.part-speech')!;this.spirit=mountManaSpirit(this.host.querySelector('.part-zeno')!);
  this.unsub=onLangChange(()=>this.render());this.render();
 }
 private presentation():TutorialPresentation {
  const card=document.querySelector<HTMLElement>('#zoomOverlay .zoom-card-stage > .card');
  return{handOpen:!!this.root.querySelector('.game.hand-open'),logOpen:!!this.root.querySelector('.game.log-open'),...(card?.dataset.uid?{inspection:{uid:card.dataset.uid,scroll:document.querySelector('.zoom-details')?.scrollTop??0}}:{})};
 }
 private restorePresentation(saved:TutorialPresentation):void {
  this.view.setHandOpen(saved.handOpen);
  if(saved.logOpen)this.root.querySelector<HTMLElement>('#logTab')?.click();
  if(saved.inspection){
   const cards=[...this.run.state.market,...this.run.state.players.flatMap(p=>[...p.hand,...p.deck,...p.discard,...p.field,...p.supply,...(p.removed??[])])];
   const card=cards.find(c=>c?.uid===saved.inspection!.uid);
   if(card){zoomCard(card);const details=document.querySelector('.zoom-details');if(details)details.scrollTop=saved.inspection.scroll;}
  }
 }
 private canAct():boolean{return !this.dead&&!this.rewinding&&!document.querySelector('.game-loading')&&!this.intro&&!this.busy&&!this.finished&&this.run.phase==='play'&&(!this.tour||this.tour.allowsGame());}
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
  if(this.dead||this.rewinding)return;
  this.busy=true;const res=advanceLesson(this.run,action);this.history.push(...res.events);this.applyResult(res);this.render();
  this.afterPresentation(()=>{if(this.dead||this.rewinding)return;this.busy=false;this.view.render(this.run.state);if(!this.tour&&this.run.phase==='review'&&this.run.scene===this.run.scenes.length-1){advanceLesson(this.run,{type:'continueLesson'});this.finish();}this.render();this.maybeBot();});
 }
 protected maybeBot():void{
  if(this.dead||this.rewinding||!this.run||this.intro||this.busy||this.finished)return;const action=tutorialOpponentAction(this.run);if(!action)return;
  clearTimeout(this.timer);this.timer=window.setTimeout(()=>{if(!this.dead&&!this.busy)this.apply(action);},420);
 }
 protected showWin():void{/* The part completion speech replaces the normal outcome modal. */}
 private proceed():void{
  if(this.busy)return;
  if(this.finished){this.next(this.part+1);return;}
  if(this.intro){this.intro=false;this.render();this.maybeBot();return;}
  if(this.run.phase!=='review')return;
  const res=advanceLesson(this.run,{type:'continueLesson'});if(this.run.done)this.finish();else{this.busy=true;this.view.syncTurn(res.state,true);this.applyResult(res,false);this.afterPresentation(()=>{if(this.dead)return;this.view.syncTurn(this.run.state,true);this.view.render(this.run.state);this.busy=false;this.render();this.maybeBot();});}this.render();
 }
 private markComplete():void{try{localStorage.setItem(tutorialPartKey(this.part,this.accountId),'1');}catch{}}
 private finish():void{this.finished=true;this.markComplete();this.spirit?.celebrate();}
 private render():void{
  if(!this.host||!this.speech)return;const meta=TUTORIAL_PARTS[this.part],lang=getLang(),review=!this.intro&&this.run.phase==='review';
  const cue=!this.intro&&!this.finished&&!review?tutorialCue(this.run,!!this.root.querySelector('.game.hand-open')):null;
  if(cue?.action==='attack'&&this.run.state.players[1].field.length&&!this.attacker()?.directOnly)cue.instruction={ja:'光っている味方を、矢印の先の相手へドラッグしよう。',en:'Drag the indicated ally onto an enemy monster.',ko:'빛나는 아군을 화살표 끝의 상대에게 드래그해.'};
  if(cue?.action==='attack'&&this.run.state.players[1].field.length&&this.attacker()?.directOnly)cue.instruction={ja:'光っている味方を、上の相手プロフィールへドラッグしよう。',en:'Drag the glowing ally onto the opponent’s portrait above.',ko:'빛나는 아군을 위쪽 상대 프로필로 드래그해.'};
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
 private attacker(){const cue=tutorialCue(this.run,this.handOpen);return this.run.state.players[0].field.find(m=>(!cue.cardId||m.id===cue.cardId)&&monsterCanAttack(this.run.state,this.run.state.players[0],m));}
 private glow():void{
  if(!this.host||!this.guide)return;
  const modal=guideElement('#zoomOverlay .zoom-wrap')??guideElement('.duel-overlay .modal');
  this.host.hidden=!!modal;
  if(this.intro||this.finished||this.busy||this.run.phase!=='play'||modal){this.guide.hide();placeTutorialCoach(this.host,modal?[modal.getBoundingClientRect()]:[]);return;}
  const cue=tutorialCue(this.run,this.handOpen),attacker=cue.action==='attack'?this.attacker():null;
  const selector=cue.action==='buyMarket'?`#fixedMarket .card[data-card-id="${cue.cardId}"]`:cue.action==='buySupply'?`#supplyMarket .card[data-card-id="${cue.cardId}"]`:cue.action==='refresh'?'#refreshBtn':cue.action==='play'?(this.handOpen?`#hand .card[data-card-id="${cue.cardId}"]`:'#hand'):cue.action==='attack'&&attacker?`#meRow .card[data-uid="${attacker.uid}"]`:cue.action==='target'?'#oppRow .zone-mon .card':cue.action==='endTurn'?'#endBtn':'';
  const targetId=currentScene(this.run).steps[this.run.step]?.targetId;
  const dest=cue.action==='play'&&this.handOpen?'#meRow .zone-mon':cue.action==='attack'&&attacker&&this.run.state.players[1].field.length?(attacker.directOnly?'#portraitOpp .pt-ring':`#oppRow .zone-mon .card${targetId?`[data-card-id="${targetId}"]`:''}`):undefined;
  const avoid=this.guide.update(guideElement(selector),guideElement(dest));
  placeTutorialCoach(this.host,avoid);
 }
 destroy():void{cancelAnimationFrame(this.guideFrame);this.guide?.destroy();clearTimeout(this.timer);this.unsub();this.tour?.destroy();document.querySelectorAll('.part-highlight').forEach(e=>e.classList.remove('part-highlight','part-pointed'));this.spirit?.destroy();this.host?.remove();super.destroy();}
}
