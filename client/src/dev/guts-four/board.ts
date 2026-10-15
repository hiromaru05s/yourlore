import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {createGame} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import {attackPlan,attackPose,drawAttackVisual} from '../../ui/attackVisual';
import {projectedPlacement} from '../../ui/boardProjection';
import type {CardInst,FieldMon,GameState} from '../../shared/types';
import {EnduranceRig} from './rig';
import {CONTACT,type Variant} from './catalog';
export class Board {
 view:GameView;g:GameState;stopLayout:()=>void;ready:Promise<void>;
 rigs:EnduranceRig[]=[];side=0;variant:Variant=0;concurrent=false;count=2;cardId='NWL3';
 private attackClone:HTMLElement|null=null;private attacker:HTMLElement|null=null;
 private attackMatrix:DOMMatrix|null=null;private attackFrom:DOMRect|null=null;private attackTo:DOMRect|null=null;
 private canvas=document.createElement('canvas');private c:CanvasRenderingContext2D;
 constructor(root:HTMLElement){
  setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
  this.g=createGame({mode:'bot',seed:741,starting:0,p0:{id:'endurance-self',name:'シーカー'},p1:{id:'endurance-opp',name:'相手'}}).state;
  const noop=()=>{};this.view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  this.stopLayout=startBoardLayout();this.c=this.canvas.getContext('2d')!;this.canvas.className='guts-attack';document.body.append(this.canvas);this.fixture();
  this.ready=(async()=>{await waitForDuel(root);await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));this.attach();this.render(0,false,true)})();
 }
 inst(id:string,uid:string):CardInst{return {...(DB[id]??STARTERS[id]),uid}}
 mon(id:string,uid:string):FieldMon{return {...this.inst(id,uid),guts:this.count,passivesG:['guts'],tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0}}
 fixture(){
  this.clean();const g=this.g;g.turn=4;g.pending=null;g.opening=undefined;g.over=false;g.cur=(1-this.side) as 0|1;
  for(const [n,p] of g.players.entries()){
   p.hp=32;p.mana=6;p.maxMana=9;p.openingDrawReady=false;p.enchants=[];p.traps=[];p.quests=[];
   p.field=(n===this.side?['ELF',this.cardId,'INFKNIGHT']:['SOLDIER2','MANA_GIANT','ELF']).map((id,i)=>this.mon(id,`guts-${n}-${i}`));
   // A clearly lethal fixed attack: even the 12 HP alternate target must endure.
   if(n!==this.side)p.field[1].atkMod=16;
   p.hand=['STARTER_CHEST','STARTER_TRASH'].map((id,i)=>this.inst(id,`hand-${n}-${i}`));p.discard=[this.inst('STARTER_MANA',`discard-${n}`)];p.removed=[];
  }
  this.view.render(g);clearMonsterStates(this.view.root);this.view.setHandOpen(false);document.querySelector('.help-callout')?.remove();
 }
 el(n:number,i:number){return this.view.root.querySelector<HTMLElement>(`.zone-mon [data-uid="guts-${n}-${i}"]`)!}
 attach(){
  this.clean();const direction=this.side?-1:1;this.rigs=[new EnduranceRig(this.el(this.side,1),this.variant,this.count,direction)];
  if(this.concurrent)this.rigs.push(new EnduranceRig(this.el(this.side,0),this.variant,this.count,direction),new EnduranceRig(this.el(this.side,2),this.variant,this.count,direction));
  this.attacker=this.el(1-this.side,1);this.attackFrom=this.attacker.getBoundingClientRect();this.attackTo=this.el(this.side,1).getBoundingClientRect();
  this.attackMatrix=projectedPlacement(this.attacker,this.attacker.offsetWidth,this.attacker.offsetHeight);
  const clone=this.attacker.cloneNode(true) as HTMLElement;clone.removeAttribute('data-uid');clone.classList.add('guts-flight');clone.style.cssText=`position:fixed;left:0;top:0;width:${this.attacker.offsetWidth}px;height:${this.attacker.offsetHeight}px;--cw:${this.attacker.offsetWidth}px;--ch:${this.attacker.offsetHeight}px;transform-origin:0 0;pointer-events:none;z-index:126;visibility:hidden;transition:none`;document.body.append(clone);this.attackClone=clone;
  const dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(innerWidth*dpr);this.canvas.height=Math.round(innerHeight*dpr);this.canvas.style.width=`${innerWidth}px`;this.canvas.style.height=`${innerHeight}px`;this.c.setTransform(dpr,0,0,dpr,0,0);
 }
 render(t:number,reduced:boolean,trigger:boolean){
  for(const rig of this.rigs)rig.render(t,reduced,trigger);
  this.c.clearRect(0,0,innerWidth,innerHeight);
  const age=t-(CONTACT-340),from=this.attackFrom,to=this.attackTo,clone=this.attackClone,att=this.attacker;
  if(!from||!to||!clone||!att||!this.attackMatrix)return;
  const moving=!reduced&&age>=0&&age<880;
  att.style.visibility=moving?'hidden':'';clone.style.visibility=moving?'visible':'hidden';
  if(moving){const plan=attackPlan(from,to),pose=attackPose(plan,age);clone.style.transform=new DOMMatrix().translate(pose.x,pose.y).rotate(pose.turn).scale(pose.scale).translate(-plan.origin.x,-plan.origin.y).multiply(this.attackMatrix).toString();drawAttackVisual(this.c,from,to,age/1000);}
 }
 configure(variant:Variant,side:number,concurrent:boolean,count:number,cardId:string){this.variant=variant;this.side=side;this.concurrent=concurrent;this.count=count;this.cardId=cardId;this.fixture();this.attach();}
 clean(){this.rigs.forEach(r=>r.dispose());this.rigs=[];this.attackClone?.remove();this.attackClone=null;if(this.attacker)this.attacker.style.visibility='';}
 dispose(){this.clean();this.canvas.remove();this.stopLayout();this.view.destroy()}
}
