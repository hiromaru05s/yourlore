import {fxWait,isFxSkipped} from '../anim';
import {monsterPresentationNodes} from '../monster/runtime';
import {PersistentLight,frameMasks} from './surface';
import {createTrickRoomTracker,type TrickPlan,type TrickValue} from './changes';
import './style.css';
let masks:Promise<HTMLCanvasElement[]>|undefined;
function warmMasks(){return masks??=frameMasks().catch(e=>{masks=undefined;throw e;});}
const smooth=(q:number)=>q*q*(3-2*q);
const properties=['filter','translate','rotate','scale'] as const;
type Seal={el:HTMLElement;sign:number;other:HTMLElement;style:string[]};
function setValues(card:HTMLElement,v:TrickValue){
 for(const [selector,value] of [['.ad-atk',v.atk],['.ad-def',v.hp]] as const){
  const seal=card.querySelector<HTMLElement>(selector),label=seal?.querySelector('.seal-value');if(!seal||!label)continue;
  label.textContent=String(value);seal.classList.toggle('ad-num--3d',String(value).length>=3);
 }
 card.querySelector('.ad-def')?.classList.toggle('ad-def--hurt',v.hurt);
}
/** One owner for selected 01 surface + selected 02 (600 ms) icon exchange. */
export class TrickRoomPresentation{
 readonly track=createTrickRoomTracker();
 private light?:PersistentLight;
 private pending?:Promise<void>;
 private disposed=false;
 private frame=0;
 private last=0;
 private lastPaint=0;
 private time=0;
 private level=0;
 private active=false;
 private fade?:{from:number;to:number;age:number;duration:number};
 private job?:{age:number;duration:number;committed:boolean;commit:()=>void;seals:Seal[];resolve:()=>void};
 private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private root:HTMLElement){
  void warmMasks().catch(()=>{});
  document.addEventListener('visibilitychange',this.visibility);
  window.addEventListener('resize',this.invalidate);
  this.reduced.addEventListener('change',this.motionChange);
 }
 private cards(){return [...this.root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')].flatMap(monsterPresentationNodes);}
 private ensureLight(){
  if(this.light||this.pending||this.disposed)return;
  this.pending=warmMasks().then(m=>{if(this.disposed||!this.active&&!this.fade)return;this.light=new PersistentLight(this.root,m);this.light.bind(this.cards());this.paint();this.schedule();}).catch(()=>{/* A missing optional mask must never break gameplay or numeric updates. */}).finally(()=>{this.pending=undefined;});
 }
 present(plan:TrickPlan):Promise<void>{
  if(this.disposed)return Promise.resolve();
  if(!this.frame)this.last=0;
  this.active=plan.active;
  if(plan.initial){this.level=plan.active?1:0;this.fade=undefined;}
  else if(plan.entered||plan.exited)this.fade={from:this.level,to:plan.active?1:0,age:0,duration:plan.active?850:750};
  if(plan.active||this.fade)this.ensureLight();
  this.light?.bind(this.cards());
  const fast=isFxSkipped()||document.hidden;
  if(fast){this.level=plan.active?1:0;this.fade=undefined;}
  let done=Promise.resolve();
  if(plan.changes.length&&!fast){
   const targets=plan.changes.flatMap(change=>{
    const source=[...this.root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')].find(c=>c.dataset.uid===change.uid);
    return source?monsterPresentationNodes(source).map(card=>({card,...change})):[];
   });
   const seals:Seal[]=[];
   for(const {card,before} of targets){setValues(card,before);const a=card.querySelector<HTMLElement>('.ad-atk'),b=card.querySelector<HTMLElement>('.ad-def');if(!a||!b)continue;
    for(const [i,el] of [a,b].entries())seals.push({el,sign:i?-1:1,other:i?a:b,style:properties.map(p=>el.style.getPropertyValue(p))});
   }
   const duration=this.reduced.matches?180:600;
   done=new Promise(resolve=>{this.job={age:0,duration,committed:false,commit:()=>targets.forEach(({card,after})=>setValues(card,after)),seals,resolve};});
   const job=this.job;
   // Shares the controller's fast-forward clock, including tab changes and user input.
   void fxWait(duration).then(()=>{if(this.job===job)this.finish();});
  }
  this.paint();this.schedule();return done;
 }
 finish(){
  const job=this.job;if(!job)return;this.job=undefined;
  if(!job.committed)job.commit();
  for(const {el,style} of job.seals)properties.forEach((p,i)=>{if(style[i])el.style.setProperty(p,style[i]);else el.style.removeProperty(p);});
  job.resolve();
 }
 private tick=(now:number)=>{
  this.frame=0;if(this.disposed||document.hidden)return;
  const dt=this.last?now-this.last:0;this.last=now;this.time+=dt;
  if(this.job){const j=this.job;j.age+=dt;const q=Math.min(1,j.age/j.duration),pulse=Math.sin(Math.PI*q),travel=q<.5?smooth(q*2):1-smooth((q-.5)*2);
   if(q>=.5&&!j.committed){j.commit();j.committed=true;}
   for(const {el,sign,other} of j.seals){
    const distance=Math.abs(other.offsetLeft-el.offsetLeft);
    el.style.filter=`brightness(${1+pulse*.32}) drop-shadow(${sign*2*pulse}px 0 ${3*pulse}px ${sign===1?'#62bdff':'#ff7e9c'})`;
    if(!this.reduced.matches){el.style.translate=`${sign*distance*.32*travel}px ${-5*pulse}px`;el.style.rotate=`${sign*-14*travel}deg`;el.style.scale=String(1+.13*pulse);}
   }
   if(q===1)this.finish();
  }
  if(this.fade){const f=this.fade;f.age+=dt;const q=Math.min(1,f.age/f.duration);this.level=f.from+(f.to-f.from)*(f.to?smooth(q):1-(1-q)**2);if(q===1)this.fade=undefined;}
  if(now-this.lastPaint>=33||!this.active&&!this.fade){this.lastPaint=now;this.paint();}
  this.schedule();
 };
 private paint(){
  if(!this.active&&!this.fade&&this.level===0){this.light?.dispose();this.light=undefined;return;}
  this.light?.bind(this.cards());
  this.light?.draw({time:this.time,level:this.level,reduced:this.reduced.matches});
 }
 private schedule(){if(!this.frame&&!this.disposed&&!document.hidden&&(this.job||this.fade||this.active&&!this.reduced.matches))this.frame=requestAnimationFrame(this.tick);}
 private invalidate=()=>{this.paint();this.schedule();};
 private motionChange=()=>{this.finish();this.paint();this.schedule();};
 private visibility=()=>{this.last=0;if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.finish();this.light?.clear();}else{this.paint();this.schedule();}};
 dispose(){this.disposed=true;this.finish();cancelAnimationFrame(this.frame);this.light?.dispose();this.light=undefined;document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('resize',this.invalidate);this.reduced.removeEventListener('change',this.motionChange);}
}
