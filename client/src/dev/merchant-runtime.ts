// Development-only real-board harness. Not a production Vite build entry.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../ui/monster/runtime';
import {summonFromHand,ghostSummon,revealSpell,setFxSkip} from '../ui/anim';
import {initSound} from '../ui/sound';
import {cancelDarkMerchants} from '../ui/merchant/runtime';
initSound();
import {createGame} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let ready=false,impacts=0;
function setup(id='MERCH2',side=0){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon('GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}
const qa={get ready(){return ready},get impacts(){return impacts},setup,skip:setFxSkip,
 async run(id:string,side=0,path='direct'){
  const n=setup(id==='DARK_MERCHANT'?'MERCH2':id,side);await new Promise(requestAnimationFrame);const card={...DB[id],uid:n.dataset.uid!};
  if(id==='DARK_MERCHANT')return revealSpell(card,side?'opp':'me','vanish');
  if(path==='hand')return summonFromHand(card,card.uid,side?'opp':'me');
  if(path==='generated')return ghostSummon({...card,uid:'generated'},side?'opp':'me',3);
  return playMonster(n,'summon',{onImpact:()=>impacts++});
 },cancel:()=>clearMonsterStates(root)};
(window as unknown as {merchantQA:typeof qa}).merchantQA=qa;
setup();startBoardLayout();void waitForDuel(root).then(()=>{ready=true;});


const panel=document.createElement('div');panel.style.cssText='position:fixed;top:6px;left:8px;z-index:10000;background:#101923;color:white;padding:8px;font:12px monospace';
panel.innerHTML='<button id="verify">全経路を検証</button> <button id="apprentice">見習い03</button> <button id="royal">王都03</button> <button id="dark">闇商人03</button> <button id="stop">スキップ</button><output id="qa-status">loading</output><pre id="qa-result" hidden></pre>';
document.body.append(panel);
const status=panel.querySelector('output')!,result=panel.querySelector('pre')!;
const errors:string[]=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const until=async(test:()=>boolean)=>{const start=performance.now();while(!test()){if(performance.now()-start>15000)throw Error('QA timeout');await wait(16);}};
const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
const rows:unknown[]=[];
for(const [button,id] of [['apprentice','MERCH1'],['royal','MERCH2'],['dark','DARK_MERCHANT']])panel.querySelector('#'+button)!.addEventListener('click',()=>{setFxSkip(false);void qa.run(id,0,'hand')});
panel.querySelector('#stop')!.addEventListener('click',()=>setFxSkip(true));
panel.querySelector('#verify')!.addEventListener('click',()=>{void(async()=>{
 try{
  await until(()=>ready);setFxSkip(false);
  for(const id of ['MERCH1','MERCH2','DARK_MERCHANT'])for(const side of [0,1])for(const path of id==='DARK_MERCHANT'?['hand']:['direct','hand','generated']){
   status.textContent=`RUN ${id} / ${side} / ${path}`;const before=impacts,pending=qa.run(id,side,path),selector=id==='DARK_MERCHANT'?'.dark-merchant-reveal':'.slate-summon';
   await until(()=>!!document.querySelector(selector));
   const host=document.querySelector<HTMLElement>(selector)!;
   check(host.dataset.variant===(id==='DARK_MERCHANT'?'3':'merchant-03'),'wrong selection');
   if(id!=='DARK_MERCHANT')check(host.dataset.coinCount===(id==='MERCH1'?'2':'6'),'coin count');
   else check(!document.querySelector('.slate-summon,.spell-frame-scene'),'duplicate spell');
   const firstTime=host.dataset.time;check(Number(firstTime)>=0,'negative animation clock');
   await pending;check(!document.querySelector(selector),'host leaked');
   check(root.querySelector<HTMLElement>(`[data-uid="target-${side}"]`)!.style.visibility==='','native card not restored');
   if(path==='direct')check(impacts===before+1,'contact callback count');
   rows.push({id,side,path,firstTime,passed:true});
  }
  for(const id of ['MERCH2','DARK_MERCHANT'])for(const reason of ['skip','resize','cancel']){
   status.textContent=`CANCEL ${id} / ${reason}`;
   const p=qa.run(id,0,'hand'),selector=id==='DARK_MERCHANT'?'.dark-merchant-reveal':'.slate-summon';await until(()=>!!document.querySelector(selector));
   if(reason==='skip')setFxSkip(true);else if(reason==='resize')window.dispatchEvent(new Event('resize'));else{clearMonsterStates(root);cancelDarkMerchants();}
   await p;setFxSkip(false);check(!document.querySelector(selector),reason+' leaked');rows.push({id,reason,passed:true});
  }
  setup('MERCH2');await wait(40);const nodes=[...root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card')];nodes.forEach(n=>n.dataset.cardId='MERCH2');
  const pending=nodes.map(n=>playMonster(n,'summon'));await until(()=>document.querySelectorAll('.slate-summon').length===3);await Promise.all(pending);check(!document.querySelector('.slate-summon'),'concurrent leaked');rows.push({concurrent:3,passed:true});
  check(errors.length===0,'browser errors');status.textContent=`PASS ${rows.length} groups`;result.textContent=JSON.stringify({rows,errors});
 }catch(e){status.textContent='FAIL '+String(e);result.textContent=JSON.stringify({rows,errors,error:String(e)});}
})();});
void until(()=>ready).then(()=>status.textContent='Ready');
