import {createGame,reduce} from '../shared/engine';
import {DB} from '../shared/cards';
import {setOppAvatar} from '../ui/boardView';
import {paintDuelClock} from '../ui/duelClock';
import type {FieldMon,GameState,ReduceResult,Side} from '../shared/types';

type Preview={state:GameState;show(g:GameState):void;applyResult(r:ReduceResult):void;queue:Promise<void>;fastForward():void;introShown:boolean;stopTimer():void};
export function tempoFixture(kind:string,side:Side=0){
 const g=createGame({mode:'bot',seed:71,starting:side,p0:{id:'tempo-self',name:'YOU'},p1:{id:'tempo-bot',name:'BOT'}}).state;
 g.cur=side;g.turn=3;g.phase='main';g.pending=null;
 for(const p of g.players)Object.assign(p,{hand:[],enchants:[],quests:[],traps:[],removed:[],discard:[],field:[],openingDrawReady:false,hp:60,maxHp:60,mana:20,maxMana:20,shield:0,dew:0,brand:0});
 const mon=(id:string,uid:string,props:Partial<FieldMon>={}):FieldMon=>({...DB[id],uid,atk:2,def:30,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,guts:0,summonedTurn:0,...props}) as FieldMon;
 const attacker=mon('M4','tempo-attacker',{atk:kind==='lethal'||kind==='mutual'?25:kind==='face'?12:4,def:kind==='mutual'?3:30,mult:kind==='multi'?2:1});
 const defender=mon(kind==='counter'||kind==='mutual'?'INFKNIGHT':'M1','tempo-defender',{atk:8,def:20,dmg:2,exhausted:true});
 g.players[side].field=[attacker,mon('M4','tempo-next',{atk:6})];
 g.players[1-side].field=kind==='face'?[]:[defender];
 if(kind==='summon'){
  g.players[side].field=[];g.players[side].hand=[{...DB.PRIEST,uid:'tempo-priest'}];
  return{prev:g,res:reduce(g,{type:'play',idx:0})};
 }
 const attack=reduce(g,{type:'attack',uid:attacker.uid});
 return{prev:g,res:kind==='face'?attack:reduce(attack.state,{type:'chooseTarget',uid:defender.uid})};
}
export function mountCombatTempo(controller:unknown){
 const c=controller as Preview;c.introShown=true;setOppAvatar('NPC_NOEL');
 const panel=document.createElement('div');panel.className='tempo-controls';panel.innerHTML='<strong>戦闘テンポ</strong><span>実盤面・実際の戦闘処理で再生</span><div class="tempo-buttons"></div><label>残り時間 <input aria-label="残り時間" type="range" min="1" max="30" value="30"><output>30秒</output></label><p role="status">場の2体目でも続けて攻撃できます。</p>';
 const style=document.createElement('style');style.textContent='.tempo-controls{position:fixed;z-index:500;left:12px;top:12px;max-width:350px;padding:12px 16px;border:1px solid #baaa88;border-radius:10px;background:#fffcf2ed;color:#243141;font:12px/1.5 sans-serif;box-shadow:0 4px 18px #20334b22}.tempo-controls.is-playing{opacity:0;pointer-events:none}.tempo-controls strong{font-size:15px;margin-right:12px}.tempo-buttons{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0}.tempo-controls button{padding:5px 10px;border:1px solid #b6b2a8;border-radius:5px;background:white;color:#263b49;cursor:pointer}.tempo-controls button:disabled{opacity:.5}.tempo-controls label{display:flex;align-items:center;gap:8px}.tempo-controls p{margin:5px 0 0}.tempo-controls input{max-width:170px}@media(max-width:600px){.tempo-controls{top:auto;bottom:8px;left:8px;right:8px;padding:8px}.tempo-controls span{display:none}.tempo-controls button{padding:4px 7px}}';document.head.append(style);document.body.append(panel);
 let busy=false;
 const run=async(kind:string,side:Side=0)=>{
  if(busy)return;busy=true;panel.classList.add('is-playing');panel.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{c.fastForward();await c.queue;const f=tempoFixture(kind,side);c.show(f.prev);await new Promise(r=>setTimeout(r,200));c.applyResult(f.res);await c.queue;}
  finally{busy=false;panel.classList.remove('is-playing');panel.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
 for(const [kind,label,side] of [['counter','被弾＋即反撃',0],['lethal','破壊＋次の操作',0],['mutual','反撃で相打ち',0],['face','BOTへ12ダメージ',0],['face','自分への被弾',1],['multi','連続攻撃',0],['summon','召喚＋雫・シールド',0]] as const){const b=document.createElement('button');b.textContent=label;b.dataset.tempo=kind;b.dataset.side=String(side);b.onclick=()=>void run(kind,side);panel.querySelector('.tempo-buttons')!.append(b);}
 const clock=(seconds:number,mine=true)=>{const side:Side=mine?0:1;if(c.state.cur!==side)c.show({...c.state,cur:side});c.stopTimer();const el=document.getElementById(mine?'clock-me':'clock-opp');if(el)paintDuelClock(el,seconds,90,mine);};
 const slider=panel.querySelector('input')!;slider.oninput=()=>{clock(Number(slider.value));panel.querySelector('output')!.textContent=slider.value+'秒';};
 c.show(tempoFixture('counter').prev);
 Object.assign(window,{combatTempo:{run,fixture:tempoFixture,controller:c,clock}});
}
