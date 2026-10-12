// Development-only real-board harness. Not a production Vite build entry.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../ui/monster/runtime';
import {summonFromHand,ghostSummon,setFxSkip} from '../ui/anim';
import {createGame} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let ready=false,impacts=0;
function setup(id='ASSASSIN4',side=0){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon('GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}
const qa={get ready(){return ready},get impacts(){return impacts},setup,skip:setFxSkip,
 async run(id:string,side=0,path='direct'){
  const n=setup(id,side);await new Promise(requestAnimationFrame);const card={...DB[id],uid:n.dataset.uid!};
  if(path==='hand')return summonFromHand(card,card.uid,side?'opp':'me');
  if(path==='generated')return ghostSummon({...card,uid:'generated'},side?'opp':'me',3);
  return playMonster(n,'summon',{onImpact:()=>impacts++});
 },cancel:()=>clearMonsterStates(root)};
(window as unknown as {assassinQA:typeof qa}).assassinQA=qa;
setup();startBoardLayout();void waitForDuel(root).then(()=>{ready=true;});

// Visible QA controls exercise production entry points with the native animation clock.
const panel=document.createElement('div');panel.style.cssText='position:fixed;top:6px;left:8px;z-index:10000;background:#101923;color:white;padding:8px;font:12px monospace';
panel.innerHTML='<button id="verify">Verify 30 routes</button> <button id="preview">Play Nightlord hand</button> <button id="opponent">Play squad opponent</button> <output id="qa-status">loading</output><pre id="qa-result" hidden></pre>';
document.body.append(panel);
const status=panel.querySelector('output')!,result=panel.querySelector('pre')!;
const errors:string[]=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const until=async(test:()=>boolean)=>{const start=performance.now();while(!test()){if(performance.now()-start>15000)throw Error('QA timeout');await wait(16);}};
const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
const rows:unknown[]=[];
panel.querySelector('#preview')!.addEventListener('click',()=>{void qa.run('ASSASSIN4',0,'hand')});
panel.querySelector('#opponent')!.addEventListener('click',()=>{void qa.run('ASSASSIN_SQUAD',1,'generated')});
panel.querySelector('#verify')!.addEventListener('click',()=>{void(async()=>{
 try{
  await until(()=>ready);
  for(const id of ['ASSASSIN1','ASSASSIN2','ASSASSIN3','ASSASSIN4','ASSASSIN_SQUAD'])for(const side of [0,1])for(const path of ['direct','hand','generated']){
   status.textContent=`RUN ${id} / ${side} / ${path}`;const before=impacts,pending=qa.run(id,side,path);
   await until(()=>!!document.querySelector('.assassin-summon'));
   const host=document.querySelector<HTMLCanvasElement>('.assassin-summon')!;
   check(host.dataset.variant==='5','wrong selected variant');
   check(!document.querySelector('.slate-summon,.verdant-summon,[data-tribe-summon]'),'duplicate summon');
   check([...document.querySelectorAll<HTMLElement>('.fx-field-ghost,.fx-card-flight')].filter(n=>getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().left>=0).length===0,'raw ghost visible');
   const data=host.getContext('2d')!.getImageData(0,0,host.width,host.height).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>30)pixels++;
   check(pixels>30,'empty render');const firstTime=host.dataset.time;
   await pending;check(!document.querySelector('.assassin-summon'),'host leaked');
   check(root.querySelector<HTMLElement>(`[data-uid="target-${side}"]`)!.style.visibility==='','native card not restored');
   if(path==='direct')check(impacts===before+1,'contact callback count');
   rows.push({id,side,path,pixels,firstTime,passed:true});
  }
  for(const reason of ['skip','cancel','resize']){
   const p=qa.run('ASSASSIN4',0,'hand');await until(()=>!!document.querySelector('.assassin-summon'));
   if(reason==='skip')setFxSkip(true);else if(reason==='cancel')clearMonsterStates(root);else window.dispatchEvent(new Event('resize'));
   await p;setFxSkip(false);check(!document.querySelector('.assassin-summon'),reason+' leaked');rows.push({reason,passed:true});
  }
  setup('ASSASSIN_SQUAD');await wait(40);const nodes=[...root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card')];
  nodes.forEach(n=>n.dataset.cardId='ASSASSIN_SQUAD');const pending=nodes.map(n=>playMonster(n,'summon'));
  await until(()=>document.querySelectorAll('.assassin-summon').length===3);await Promise.all(pending);
  check(!document.querySelector('.assassin-summon'),'concurrent leaked');rows.push({concurrent:3,passed:true});
  check(errors.length===0,'browser errors');status.textContent=`PASS ${rows.length} groups`;result.textContent=JSON.stringify({rows,errors});
 }catch(e){status.textContent='FAIL '+String(e);result.textContent=JSON.stringify({rows,errors,error:String(e)});}
})();});
void until(()=>ready).then(()=>status.textContent='Ready');
