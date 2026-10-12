import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import type {GameState,Side,ReduceResult} from '../../shared/types';
import {setLang} from '../../i18n';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {prepareTaunt,cancelTaunts} from '../../ui/taunt/runtime';
import {setFxSkip} from '../../ui/anim';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;
const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}#taunt-controls{position:fixed;top:2px;left:2px;z-index:9999;background:#102426e8;color:#e1eadd;padding:7px;font:11px sans-serif;max-width:97vw}#taunt-report{max-height:27vh;overflow:auto;white-space:pre-wrap}';document.head.append(style);
class Harness extends BaseController{
 protected submit(){}
 constructor(){super(root,0,{onHome(){},onRematch(){}});}
 mount(g:GameState){setFxSkip(false);this.state=g;this.view.render(g);this.view.setHandOpen(false);}
 async run(prev:GameState,res:ReduceResult){this.state=res.state;await (this as unknown as {playResult:(p:GameState,r:ReduceResult,a:boolean,g:number,s:Set<string>)=>Promise<void>}).playResult(prev,res,true,1,new Set());}
}
const controller=new Harness(),stopLayout=startBoardLayout();
function fixture(side:Side,success:boolean,granted=false,evading=false){
 for(let seed=1;seed<100;seed++){
  const g=createGame({mode:'bot',seed,starting:side,p0:{id:'test-self',name:'シーカー'},p1:{id:'test-opp',name:'相手'}}).state;
  g.cur=side;g.turn=5;g.phase='main';g.pending={kind:'oppMon',reason:'attack',hint:'',hintJa:'',allowCancel:true,data:{attackerUid:'attacker'}};
  for(const [i,p]of g.players.entries()){p.field=[];p.hand=[{...STARTERS.STARTER_CHEST,uid:`hand-${i}`}];p.enchants=[];p.traps=[];p.quests=[];p.openingDrawReady=false;p.hp=30;p.mana=12;p.maxMana=12;p.removed=[];}
  const mon=(id:string,uid:string)=>({...DB[id],uid,dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0});
  g.players[side].field=[mon('M4','attacker')];
  g.players[1-side].field=[{...mon('M4','target'),defMod:30,passivesG:evading?['evade']:[]},...['left','right'].map(uid=>({...mon(granted?'M4':'SHIELD_TITAN',uid),defMod:30,passivesG:[...granted?['taunt']:[],...evading?['evade']:[]]}))];
  const result=reduce(g,{type:'chooseTarget',uid:'target'}),roll=result.events.find(e=>e.type==='dice'&&e.taunt);
  if(roll?.type==='dice'&&roll.success===success)return {g,result};
 }throw Error('Fixture seed unavailable');
}
const panel=document.createElement('div');panel.id='taunt-controls';panel.innerHTML='<button id="runtime-check">本体経路を検証</button> <button id="runtime-preview">03を反復</button> <button id="runtime-stop">停止・復元</button> <select id="runtime-side" aria-label="挑発する側"><option value="1">自分側</option><option value="0">相手側</option></select><output id="runtime-status">準備中</output><pre id="taunt-report" hidden></pre>';document.body.append(panel);
const status=panel.querySelector('output')!,report=panel.querySelector('pre')!,side=panel.querySelector('select')!;
let repeating=false;
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const rows:unknown[]=[];
async function check(attacker:Side,success:boolean,granted=false,evading=false){
 const {g,result}=fixture(attacker,success,granted,evading);controller.mount(g);await waitForDuel(root);
 const source=result.events.find(e=>e.type==='dice'&&e.taunt),evade=result.events.find(e=>e.type==='dice'&&e.evasion);if(source?.type!=='dice'||!source.taunt)throw Error('Missing taunt');
 const samples:Array<{t:number;shield:number|null;dice:boolean;evade:boolean;attack:boolean;uid:string|null;hidden:number}>=[],start=performance.now();const diceNodes=new Set<Element>();let monitor=true;
 function sample(){const die=document.querySelector('.d3-overlay');if(die)diceNodes.add(die);const fx=document.querySelector<HTMLElement>('.taunt-shield');samples.push({t:performance.now()-start,shield:fx?Number(fx.dataset.time):null,dice:!!document.querySelector('.d3-overlay'),evade:!!document.querySelector('.evade-refraction'),attack:!!document.querySelector('[data-monster-kind="attack"]'),uid:fx?.dataset.uid??null,hidden:root.querySelectorAll('.zone-mon .card[style*="visibility: hidden"]').length});if(monitor)requestAnimationFrame(sample);}
 sample();await controller.run(g,result);monitor=false;await pause(50);
 const shields=samples.filter(s=>s.shield!==null),dice=samples.filter(s=>s.dice),att=samples.filter(s=>s.attack),dodges=samples.filter(s=>s.evade);
 const diceRuns=diceNodes.size;
 const passed=shields.length>5&&shields.every(s=>s.uid===source.taunt!.sourceUid&&s.hidden===0&&!s.attack&&!s.dice)&&dice[0]?.t>shields.at(-1)!.t&&diceRuns===(evading?2:1)&&(evade?.type==='dice'&&evade.success?att.length===0:att.length>0&&att[0].t>dice.at(-1)!.t)&&(!evading||dodges.length>0)&&!document.querySelector('.taunt-shield,.taunt-capture,.evade-refraction,.evade-capture');
 rows.push({attacker,success,granted,evading,passed,sourceUid:source.taunt.sourceUid,shieldFrames:shields.length,lastShieldMs:shields.at(-1)?.shield,firstDice:dice[0]?.t,diceRuns,firstAttack:att[0]?.t??null,lastShieldAt:shields.at(-1)?.t});report.hidden=false;report.textContent=JSON.stringify(rows,null,2);if(!passed)throw Error('Controller sequence failed');
}
panel.querySelector('#runtime-check')!.addEventListener('click',()=>{void(async()=>{repeating=false;cancelTaunts();rows.length=0;status.textContent='検証中';try{for(const attacker of [0,1] as const)for(const success of [true,false])await check(attacker,success);await check(0,true,true);await check(0,true,true,true);await check(1,false,true,true);status.textContent='PASS 7 / 実controller経路';}catch(e){status.textContent='FAIL '+e;}report.hidden=false;report.textContent=JSON.stringify(rows,null,2);})();});
panel.querySelector('#runtime-preview')!.addEventListener('click',()=>{void(async()=>{if(repeating)return;repeating=true;const {g,result}=fixture(Number(side.value) as Side,true);controller.mount(g);await waitForDuel(root);status.textContent='本体03 · 1000ms反復';while(repeating){const roll=result.events.find(e=>e.type==='dice'&&e.taunt);if(roll?.type!=='dice'||!roll.taunt)break;const node=root.querySelector<HTMLElement>(`.zone-mon .card[data-uid="${roll.taunt.sourceUid}"]`);await prepareTaunt(node).play();await pause(800);}})();});
panel.querySelector('#runtime-stop')!.addEventListener('click',()=>{repeating=false;cancelTaunts();setFxSkip(true);status.textContent='停止・復元';});
window.addEventListener('pagehide',()=>{repeating=false;cancelTaunts();controller.destroy();stopLayout();},{once:true});
controller.mount(fixture(1,true).g);void waitForDuel(root).then(()=>status.textContent='準備完了');
