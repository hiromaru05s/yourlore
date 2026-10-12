import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import type {GameState,Side,ReduceResult} from '../../shared/types';
import {setLang} from '../../i18n';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {prepareEvade,cancelEvades} from '../../ui/evade/runtime';
import {setFxSkip} from '../../ui/anim';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;
const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}#evade-controls{position:fixed;top:2px;left:2px;z-index:9999;background:#102426e8;color:#e1eadd;padding:7px;font:11px sans-serif;max-width:97vw}#evade-report{max-height:27vh;overflow:auto;white-space:pre-wrap}';document.head.append(style);
class Harness extends BaseController{
 protected submit(){}
 constructor(){super(root,0,{onHome(){},onRematch(){}});}
 mount(g:GameState){setFxSkip(false);this.state=g;this.view.render(g);this.view.setHandOpen(false);}
 async run(prev:GameState,res:ReduceResult){this.state=res.state;await (this as unknown as {playResult:(p:GameState,r:ReduceResult,a:boolean,g:number,s:Set<string>)=>Promise<void>}).playResult(prev,res,true,1,new Set());}
}
const controller=new Harness(),stopLayout=startBoardLayout();
function fixture(side:Side,success:boolean,granted=false){
 for(let seed=1;seed<100;seed++){
  const g=createGame({mode:'bot',seed,starting:side,p0:{id:'test-self',name:'シーカー'},p1:{id:'test-opp',name:'相手'}}).state;
  g.cur=side;g.turn=5;g.phase='main';g.pending={kind:'oppMon',reason:'attack',hint:'',hintJa:'',allowCancel:true,data:{attackerUid:'attacker'}};
  for(const [i,p]of g.players.entries()){p.field=[];p.hand=[{...STARTERS.STARTER_CHEST,uid:`hand-${i}`}];p.enchants=[];p.traps=[];p.quests=[];p.openingDrawReady=false;p.hp=30;p.mana=12;p.maxMana=12;p.removed=[];}
  const mon=(id:string,uid:string)=>({...DB[id],uid,dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0});
  g.players[side].field=[mon('M4','attacker')];
  g.players[1-side].field=['left','target','right'].map(uid=>({...mon(granted?'ELF':'HIGH_ELF',uid),defMod:20,...granted?{passivesG:['evade']}:{}}));
  const result=reduce(g,{type:'chooseTarget',uid:'target'}),roll=result.events.find(e=>e.type==='dice'&&e.evasion);
  if(roll?.type==='dice'&&roll.success===success)return {g,result};
 }throw Error('Fixture seed unavailable');
}
const panel=document.createElement('div');panel.id='evade-controls';panel.innerHTML='<button id="runtime-check">本体経路を検証</button> <button id="runtime-preview">03を反復</button> <button id="runtime-stop">停止・復元</button> <select id="runtime-side" aria-label="回避する側"><option value="1">自分側</option><option value="0">相手側</option></select><output id="runtime-status">準備中</output><pre id="evade-report" hidden></pre>';document.body.append(panel);
const status=panel.querySelector('output')!,report=panel.querySelector('pre')!,side=panel.querySelector('select')!;
let repeating=false;
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const rows:unknown[]=[];
async function check(attacker:Side,success:boolean,granted=false){
 const {g,result}=fixture(attacker,success,granted);controller.mount(g);await waitForDuel(root);
 const samples:Array<{t:number;evade:number|null;attack:boolean;uid:string|null;hidden:number}>=[],start=performance.now();let monitor=true;
 function sample(){const fx=document.querySelector<HTMLElement>('.evade-refraction');samples.push({t:performance.now()-start,evade:fx?Number(fx.dataset.time):null,attack:!!document.querySelector('[data-monster-kind="attack"]'),uid:fx?.dataset.uid??null,hidden:root.querySelectorAll('.zone-mon .card[style*="visibility: hidden"]').length});if(monitor)requestAnimationFrame(sample);}
 sample();await controller.run(g,result);monitor=false;await pause(50);
 const ev=samples.filter(s=>s.evade!==null),att=samples.filter(s=>s.attack);
 const passed=ev.length>5&&ev.every(s=>s.uid==='target'&&s.hidden===1&&!s.attack)&&(success?att.length===0:att.length>0&&att[0].t>ev[ev.length-1].t)&&!document.querySelector('.evade-refraction,.evade-capture')&&root.querySelectorAll('.zone-mon .card[style*="visibility: hidden"]').length===0;
 rows.push({attacker,success,granted,passed,evadeFrames:ev.length,lastEvadeMs:ev.at(-1)?.evade,firstAttack:att[0]?.t??null,lastEvadeAt:ev.at(-1)?.t});if(!passed)throw Error('Controller sequence failed');
}
panel.querySelector('#runtime-check')!.addEventListener('click',()=>{void(async()=>{repeating=false;cancelEvades();rows.length=0;status.textContent='検証中';try{for(const attacker of [0,1] as const)for(const success of [true,false])await check(attacker,success);await check(0,true,true);status.textContent='PASS 5 / 実controller経路';}catch(e){status.textContent='FAIL '+e;}report.hidden=false;report.textContent=JSON.stringify(rows,null,2);})();});
panel.querySelector('#runtime-preview')!.addEventListener('click',()=>{void(async()=>{if(repeating)return;repeating=true;const {g}=fixture(Number(side.value) as Side,true);controller.mount(g);await waitForDuel(root);status.textContent='本体03 · 700ms反復';while(repeating){const node=root.querySelector<HTMLElement>('.zone-mon .card[data-uid="target"]');await prepareEvade(node,{side:side.value==='1'?'me':'opp',success:true}).play();await pause(800);}})();});
panel.querySelector('#runtime-stop')!.addEventListener('click',()=>{repeating=false;cancelEvades();setFxSkip(true);status.textContent='停止・復元';});
window.addEventListener('pagehide',()=>{repeating=false;cancelEvades();controller.destroy();stopLayout();},{once:true});
controller.mount(fixture(1,true).g);void waitForDuel(root).then(()=>status.textContent='準備完了');
