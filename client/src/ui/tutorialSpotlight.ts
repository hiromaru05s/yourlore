import {getLang,onLangChange} from '../i18n';
import {mountManaSpirit} from './manaSpirit';
import {copy as c,type Copy} from '../shared/tutorialSteps';
import type {TourPlacement,TutorialTourStep} from '../shared/tutorialParts';
import type {GameState} from '../shared/types';

interface SpotlightOptions {
 label:Copy;
 onComplete():void;
 onExit():void;
 /** Settled game state for action:'play' steps; null while the board is still animating. */
 state?():GameState|null;
}

type Box={left:number;top:number;right:number;bottom:number};
const RING_PAD=4,CUT_PAD=6,PLACEMENTS:TourPlacement[]=['top-right','top-left','bottom-right','bottom-left'];
const visible=(r:DOMRect)=>r.width>2&&r.height>2&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
const grow=(b:Box,n:number):Box=>({left:b.left-n,top:b.top-n,right:b.right+n,bottom:b.bottom+n});
const clamp=(b:Box):Box=>({left:Math.floor(Math.max(2,b.left)),top:Math.floor(Math.max(2,b.top)),right:Math.ceil(Math.min(innerWidth-2,b.right)),bottom:Math.ceil(Math.min(innerHeight-2,b.bottom))});
const union=(boxes:Box[]):Box|null=>boxes.length?{left:Math.min(...boxes.map(b=>b.left)),top:Math.min(...boxes.map(b=>b.top)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))}:null;
const overlaps=(a:Box,b:Box)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

/**
 * Guided overlay for the duel board and menu screens. The area being taught stays
 * sharp while everything outside it is dimmed and blurred; a tight ring marks the
 * exact control. Steps can wait for a click, for a real move on the board, or for
 * "Next", and the learner can always step back.
 */
export class TutorialSpotlight {
 private index=0;
 private layer:HTMLElement;
 private shades:HTMLElement[];
 private rings:HTMLElement[]=[];
 private coach:HTMLElement;
 private bubble:HTMLElement;
 private spirit:ReturnType<typeof mountManaSpirit>;
 private target:HTMLElement|null=null;
 private frame=0;
 private disposed=false;
 private undoing=false;
 private advancing=false;
 private unlocked=false;
 private unlockCleanup:()=>void=()=>{};
 private unsub:()=>void;
 constructor(private root:HTMLElement,private steps:TutorialTourStep[],private options:SpotlightOptions){
  this.layer=document.createElement('div');this.layer.className='tutorial-tour-layer tutorial-part-tour';
  this.layer.innerHTML='<div class="tutorial-tour-shade"></div><div class="tutorial-tour-shade"></div><div class="tutorial-tour-shade"></div><div class="tutorial-tour-shade"></div><div class="tutorial-tour-ring" aria-hidden="true"></div><aside class="tutorial-tour-coach"><div class="tutorial-tour-spirit"></div><div class="tutorial-tour-bubble lore-surface" aria-live="polite"></div></aside>';
  document.body.append(this.layer);
  this.shades=[...this.layer.querySelectorAll<HTMLElement>('.tutorial-tour-shade')];this.rings=[this.layer.querySelector('.tutorial-tour-ring')!];
  this.coach=this.layer.querySelector('.tutorial-tour-coach')!;this.bubble=this.layer.querySelector('.tutorial-tour-bubble')!;
  this.spirit=mountManaSpirit(this.layer.querySelector('.tutorial-tour-spirit')!);
  document.addEventListener('click',this.clicked,true);
  this.unsub=onLangChange(()=>this.render());this.render();
  const tick=()=>{if(this.disposed)return;this.position();this.checkMove();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);
 }
 /** Board moves are only accepted while the current step asks for one. */
 allowsGame():boolean{return !this.disposed&&this.step()?.action==='play';}
 private step():TutorialTourStep{return this.steps[this.index];}
 private find(selector:string):HTMLElement|null{
  const all=[...this.root.querySelectorAll<HTMLElement>(selector),...document.querySelectorAll<HTMLElement>(selector)];
  return all.find(el=>visible(el.getBoundingClientRect()))??all[0]??null;
 }
 private box(el:HTMLElement|null):Box|null{
  if(!el)return null;const r=el.getBoundingClientRect();if(visible(r))return r;
  // Zero-size wrappers (display:contents) are measured through their visible children.
  return union([...el.querySelectorAll<HTMLElement>('*')].map(n=>n.getBoundingClientRect()).filter(visible));
 }
 private clicked=(event:MouseEvent):void=>{
  if(this.undoing||this.advancing)return;
  const step=this.step(),origin=event.target instanceof Element?event.target:null;
  if(step.action!=='click'||!step.selector||!origin?.closest(step.selector))return;
  this.advancing=true;window.setTimeout(()=>{this.advancing=false;if(!this.disposed)this.go(this.index+1);},160);
 };
 private checkMove():void{
  const step=this.step();if(step.action!=='play'||!step.until||this.advancing)return;
  const g=this.options.state?.();if(!g||!step.until(g))return;
  this.advancing=true;window.setTimeout(()=>{this.advancing=false;if(!this.disposed)this.go(this.index+1);},500);
 }
 private position():void{
  const step=this.step();
  const target=step.selector?this.find(step.selector):null;
  if(target!==this.target){this.target?.classList.remove('tutorial-tour-target');this.target=target;target?.classList.add('tutorial-tour-target');}
  const parts=step.region?step.region.map(sel=>this.box(this.find(sel))).filter((b):b is Box=>!!b):[];
  const marked=union(target?[...parts,...[this.box(target)].filter((b):b is Box=>!!b)]:parts);
  const focus=step.focus?this.box(this.find(step.focus)):null;
  const ring=marked?clamp(grow(marked,RING_PAD)):null;
  const ringBoxes=ring?(step.ringEach&&parts.length>1?parts.map(b=>clamp(grow(b,RING_PAD))):[ring]):[];
  const cut=focus?clamp(grow(union([focus,...(ring?[ring]:[])])!,2)):ring?clamp(grow(ring,CUT_PAD)):null;
  const waiting=!!(step.selector||step.region)&&!ring;
  this.layer.classList.toggle('is-summary',!cut&&!waiting);
  this.paintRings(cut?ringBoxes:[]);
  if(!cut)this.shades.forEach((s,i)=>Object.assign(s.style,{left:'0px',top:'0px',width:i===0?`${innerWidth}px`:'0px',height:i===0?`${innerHeight}px`:'0px'}));
  else{
   const [top,bottom,left,right]=this.shades;
   Object.assign(top.style,{left:'0px',top:'0px',width:`${innerWidth}px`,height:`${cut.top}px`});
   Object.assign(bottom.style,{left:'0px',top:`${cut.bottom}px`,width:`${innerWidth}px`,height:`${Math.max(0,innerHeight-cut.bottom)}px`});
   Object.assign(left.style,{left:'0px',top:`${cut.top}px`,width:`${cut.left}px`,height:`${cut.bottom-cut.top}px`});
   Object.assign(right.style,{left:`${cut.right}px`,top:`${cut.top}px`,width:`${Math.max(0,innerWidth-cut.right)}px`,height:`${cut.bottom-cut.top}px`});
  }
  this.place(cut);
 }
 private paintRings(boxes:Box[]):void{
  while(this.rings.length<boxes.length){const r=document.createElement('div');r.className='tutorial-tour-ring';r.setAttribute('aria-hidden','true');this.rings[0].after(r);this.rings.push(r);}
  this.rings.forEach((r,i)=>{const b=boxes[i];r.style.display=b?'block':'none';if(b)Object.assign(r.style,{left:`${b.left}px`,top:`${b.top}px`,width:`${b.right-b.left}px`,height:`${b.bottom-b.top}px`});});
 }
 /** Keep Zeno's bubble off the area being taught, preferring the step's own corner. */
 private place(cut:Box|null):void{
  const w=this.coach.offsetWidth,h=this.coach.offsetHeight,m=18;
  const at=(p:TourPlacement):Box=>({left:p.endsWith('left')?m:innerWidth-m-w,right:p.endsWith('left')?m+w:innerWidth-m,top:p.startsWith('top')?m:innerHeight-m-h,bottom:p.startsWith('top')?m+h:innerHeight-m});
  const order=[...new Set([this.step().placement??'top-right',...PLACEMENTS])];
  const best=cut?order.find(p=>!overlaps(at(p),cut))??order.reduce((a,b)=>{const area=(p:TourPlacement)=>{const x=at(p);return Math.max(0,Math.min(x.right,cut.right)-Math.max(x.left,cut.left))*Math.max(0,Math.min(x.bottom,cut.bottom)-Math.max(x.top,cut.top));};return area(b)<area(a)?b:a;}):order[0];
  if(this.coach.dataset.placement!==best)this.coach.dataset.placement=best;
 }
 private backTarget():number{
  let i=this.index-1;const g=this.options.state?.();
  while(i>0){const s=this.steps[i];if(s.skipOnBack||s.action==='play'&&(!g||s.until?.(g)))i--;else break;}
  return i;
 }
 private back():void{
  if(this.disposed||this.advancing)return;const to=this.backTarget();if(to<0)return;
  const undo=this.step().undo;const el=undo?this.find(undo):null;
  if(el){this.undoing=true;try{el.click();}finally{this.undoing=false;}}
  this.go(to);
 }
 private go(index:number):void{
  if(this.disposed)return;
  if(index>=this.steps.length){this.destroy();this.options.onComplete();return;}
  this.index=Math.max(0,index);this.render();
 }
 private render():void{
  if(this.disposed)return;const step=this.step(),lang=getLang();
  this.unlockCleanup();this.unlockCleanup=()=>{};this.unlocked=!step.enableOn;
  const last=this.index===this.steps.length-1,kind=step.action??'next';
  const next=last?c('パート完了','Complete part','파트 완료'):c('次へ','Next','다음');
  const hint=kind==='click'?c('光っている場所を押そう','Press the highlighted control','빛나는 곳을 직접 누르세요'):kind==='play'?c('盤面で実際に操作しよう','Make the move on the board','필드에서 직접 조작하세요'):null;
  const canBack=this.index>0&&this.backTarget()>=0;
  this.bubble.innerHTML=`<header><span class="tutorial-eyebrow">ZENO · ${this.options.label[lang]} · ${this.index+1}/${this.steps.length}</span><button class="lore-button-quiet tutorial-tour-skip" aria-label="${c('終了','Exit','나가기')[lang]}">×</button></header><h2>${step.title[lang]}</h2><p>${step.body[lang]}</p>${step.prompt?`<strong>${step.prompt[lang]}</strong>`:''}<footer class="tutorial-tour-actions"><button class="lore-button lore-button-quiet tutorial-tour-back" ${canBack?'':'disabled'}>← ${c('戻る','Back','이전')[lang]}</button>${kind==='next'?`<button class="lore-button lore-button-primary tutorial-tour-next" ${this.unlocked?'':'disabled'}>${next[lang]} →</button>`:`<span class="tutorial-tour-hint">${hint![lang]}</span>`}</footer>`;
  this.bubble.querySelector('.tutorial-tour-next')?.addEventListener('click',()=>{if(this.unlocked&&!this.advancing)this.go(this.index+1);});
  this.bubble.querySelector('.tutorial-tour-back')?.addEventListener('click',()=>this.back());
  this.bubble.querySelector('.tutorial-tour-skip')?.addEventListener('click',()=>{this.destroy();this.options.onExit();});
  if(step.enableOn){
   const {selector,event}=step.enableOn,unlock=(e:Event)=>{if(!(e.target instanceof Element)||!e.target.closest(selector))return;this.unlocked=true;this.bubble.querySelector<HTMLButtonElement>('.tutorial-tour-next')?.removeAttribute('disabled');};
   document.addEventListener(event,unlock,true);this.unlockCleanup=()=>document.removeEventListener(event,unlock,true);
  }
  this.position();
 }
 destroy():void{
  if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.unlockCleanup();this.target?.classList.remove('tutorial-tour-target');
  document.removeEventListener('click',this.clicked,true);this.unsub();this.spirit.destroy();this.layer.remove();
 }
}
