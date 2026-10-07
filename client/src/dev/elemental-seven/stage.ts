import {DB,STARTERS} from '../../shared/cards';
import {createGame} from '../../shared/engine';
import type {CardDef,CardInst,FieldMon} from '../../shared/types';
import {cardEl} from '../../ui/cardView';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {entry,hitPlan,clamp,pulse,type Entry,type Anchor,type Hit} from './catalog';
import {Effects} from './effects';
import {CardMaterial} from './surface';
// T13 is retired by v43. This isolated art fixture does not put it back in DB.
const archivedLightning:CardDef={id:'T13',t:'trap',name:'낙뢰',nameJa:'落雷',cost:4,play:3,react:'lightning',text:'공격 무효 · 무작위 3회 각 12 데미지',textJa:'攻撃無効 · 相手・敵味方モンスターから無作為に3回選出、各12ダメージ'};
export class Stage {
 readonly canvas=document.createElement('canvas');private ctx:CanvasRenderingContext2D;
 readonly fx=new Effects();private materials:CardMaterial[]=[];private source!:HTMLElement;private targets:HTMLElement[]=[];
 private view?:GameView;private stopLayout?:()=>void;private frame=0;private last=0;private epoch=0;private disposed=false;
 current:Entry=entry('cannon');time=0;speed=1;playing=false;loop=false;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 ready=false;side=0;heavy=false;friendly=false;enhanced=false;player=false;hits:Hit[]=[];onTick=()=>{};
 readonly board:boolean;readonly root:HTMLElement;
 constructor(root:HTMLElement,board:boolean){this.root=root;this.board=board;this.canvas.className='element-overlay';document.body.append(this.canvas);this.ctx=this.canvas.getContext('2d')!;
  if(board){setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');const noop=()=>{};this.view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});this.stopLayout=startBoardLayout()}
 }
 private card(id:string,uid:string):CardInst{return {...(DB[id]??STARTERS[id]??(id==='T13'?archivedLightning:undefined)),uid}}
 private mon(id:string,uid:string):FieldMon{return {...this.card(id,uid),exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:40,dmg:0}}
 async load(kind:string,side=this.side){this.stop();this.ready=false;const epoch=++this.epoch;this.materials.forEach(m=>m.dispose());this.materials=[];this.current=entry(kind);this.side=side;const id=this.heavy&&kind==='cannon'?'HEAVY_GUNNER':this.current.card;
  if(this.board){const g=createGame({mode:'bot',seed:734,starting:0,p0:{id:'element-me',name:'YOU'},p1:{id:'element-opp',name:'OPPONENT'}}).state;g.turn=4;g.pending=null;
   for(const[n,p]of g.players.entries()){p.hp=80;p.mana=8;p.maxMana=12;p.openingDrawReady=false;p.hand=[];p.enchants=[];p.traps=[];p.quests=[];p.discard=[this.card('STARTER_MANA',`shelf-${n}`)];p.field=(n===side?[this.card(id,'').t==='mon'?id:'INFKNIGHT','ELF','SOLDIER2']:['ELF','INFKNIGHT','MANA_GIANT']).map((cid,j)=>this.mon(cid,`element-${n}-${j}`));}
   this.view!.render(g);this.view!.setHandOpen(false);clearMonsterStates(this.root);document.querySelector('.help-callout')?.remove();
   if(this.card(id,'').t==='mon')this.source=this.root.querySelector<HTMLElement>(`.card[data-uid="element-${side}-0"]`)!;
   else{this.root.querySelector('.element-cast')?.remove();const wrap=document.createElement('div');wrap.className=`element-cast ${side?'is-opponent':''}`;this.source=cardEl(this.card(id,'element-source'),{size:'hand',fullArt:true});wrap.append(this.source);this.root.append(wrap)}
   const other=1-side;this.targets=[0,1,2].map(j=>this.root.querySelector<HTMLElement>(`.card[data-uid="element-${other}-${j}"]`)!);this.targets.push(document.getElementById(other?'portraitOpp':'portraitMe')!,this.root.querySelector<HTMLElement>(`.card[data-uid="element-${side}-1"]`)!);
   await Promise.race([waitForDuel(this.root),new Promise<void>(resolve=>setTimeout(resolve,18000))]);
  }else{
   this.root.innerHTML='<div class="studio-floor"></div><div class="studio-caption">LORE <span>ELEMENTAL STUDIES</span></div><div class="studio-enemies"></div><div class="studio-source"></div><div class="studio-ally"></div><div class="studio-player"><span>相手プレイヤー</span><b>80</b></div><div class="studio-source-label">発動元</div><div class="studio-enemy-label">対象</div>';
   this.source=cardEl(this.card(id,'element-source'),{size:'hand',fullArt:true});this.root.querySelector('.studio-source')!.append(this.source);
   this.targets=['ELF','INFKNIGHT','MANA_GIANT'].map((cid,j)=>{const el=cardEl(this.mon(cid,`target-${j}`),{size:'hand',fullArt:true});this.root.querySelector('.studio-enemies')!.append(el);return el});this.targets.push(this.root.querySelector<HTMLElement>('.studio-player')!);
   const ally=cardEl(this.mon('ELF','target-ally'),{size:'hand',fullArt:true});this.root.querySelector('.studio-ally')!.append(ally);this.targets.push(ally);this.root.classList.toggle('mirror',side===1);
  }
  await Promise.all([...this.root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
  if(epoch!==this.epoch||this.disposed)return;
  this.materials=[this.source,...this.targets.filter(e=>e.classList.contains('card'))].map(e=>new CardMaterial(e));this.hits=hitPlan(this.current,this.friendly,this.heavy,this.enhanced,this.player);this.ready=true;this.seek(0);
 }
 private anchor(el:HTMLElement):Anchor{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.5,w:r.width,h:r.height,el}}
 private restore(){for(const el of [this.source,...this.targets])if(el){el.style.translate='';el.style.rotate='';el.style.scale='';el.style.filter=''}}
 seek(t:number){this.time=clamp(t/this.current.duration)*this.current.duration;if(!this.ready)return;this.restore();
  const dpr=Math.min(devicePixelRatio,1.5),width=Math.round(innerWidth*dpr),height=Math.round(innerHeight*dpr);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
  const e=this.current,source=this.anchor(this.source),targets=this.targets.map(el=>this.anchor(el)),time=this.time,active=time>0&&time<e.duration;
  const sourceHeat=active?pulse(time,130,800,e.kind==='meteor'?2700:1500):0;
  for(const m of this.materials){const idx=this.targets.indexOf(m.el),last=this.hits.filter(h=>h.target===idx&&time>=h.at).at(-1),age=last?time-last.at:-1;const heat=m.el===this.source?sourceHeat:age>=0?pulse(age,-1,50,450):0;const scorch=active&&age>=0?pulse(age,50,300,1000):0;m.paint(time,this.reduced?0:heat,e.kind,this.reduced?0:scorch)}
  if(active&&!this.reduced){
   if(e.kind==='cannon'){const a=time-1030,k=a>=0&&a<650?Math.sin(Math.min(1,a/120)*Math.PI/2)*Math.exp(-a/150):0;this.source.style.translate=`${-source.w*.11*k}px ${source.h*.025*k}px`;this.source.style.rotate=`${-2*k}deg`}
   else if(e.kind==='berserk'){const b=targets[this.hits[0].target],p=pulse(time,820,1490,2210),anticipation=pulse(time,200,650,880);this.source.style.translate=`${(b.x-source.x)*p*.7-anticipation*source.w*.06}px ${(b.y-source.y)*p*.7+anticipation*source.h*.025}px`;this.source.style.rotate=`${-8*anticipation+16*p}deg`}
   else this.source.style.translate=`0 ${-Math.sin(clamp(time/1350)*Math.PI)*source.h*.028}px`;
   for(const [i,target]of targets.entries()){const h=this.hits.filter(h=>h.target===i&&time>=h.at).at(-1);if(!h)continue;const a=time-h.at;if(a<380){const k=Math.exp(-a/90)*Math.sin(a*.09);target.el.style.translate=`${k*target.w*.025}px ${Math.sin(a*.045)*Math.exp(-a/100)*target.w*.028}px`;target.el.style.rotate=`${k*1.2}deg`}}
  }
  this.fx.render(c,e,time,source,targets,this.hits,this.reduced);
  for(const[i,el]of this.targets.entries()){const total=this.hits.filter(h=>h.target===i&&time>=h.at).reduce((sum,h)=>sum+h.amount,0);const label=el.querySelector('.ad-def .seal-value')??el.querySelector('.pt-hp b')??el.querySelector('b');if(label&&i!==3){const id=['ELF','INFKNIGHT','MANA_GIANT','','ELF'][i];label.textContent=String((DB[id]?.def??0)+40-total)}if(i===3){const hp=this.board?document.getElementById((1-this.side)?'hp-opp':'hp-me'):el.querySelector('b');if(hp)hp.textContent=String(80-total)}}
  this.canvas.dataset.time=String(time);this.onTick();
 }
 play(){if(!this.ready||this.playing)return;if(this.time>=this.current.duration)this.seek(0);this.playing=true;this.last=performance.now();const tick=(now:number)=>{if(!this.playing||this.disposed)return;const delta=Math.min(100,now-this.last);this.last=now;const next=this.time+delta*this.speed;if(next>=this.current.duration){this.seek(this.current.duration);if(this.loop&&!this.reduced)this.seek(0);else{this.stop();return}}else this.seek(next);this.frame=requestAnimationFrame(tick)};this.frame=requestAnimationFrame(tick)}
 stop(){this.playing=false;cancelAnimationFrame(this.frame);this.frame=0;this.onTick()}
 reset(){this.stop();this.seek(0)}
 status(){return {kind:this.current.kind,ready:this.ready,time:this.time,playing:this.playing,renderer:this.fx.fire.available?'volume-webgl':'fallback-2d',hits:this.hits,sourceVisible:this.source?.isConnected,boardReady:this.board?this.root.dataset.sceneReady??this.root.dataset.tableState:'studio',overlays:document.querySelectorAll('.element-overlay').length}}
 dispose(){if(this.disposed)return;this.disposed=true;++this.epoch;this.stop();this.restore();this.materials.forEach(m=>m.dispose());this.fx.dispose();this.canvas.remove();this.stopLayout?.();this.view?.destroy()}
}
