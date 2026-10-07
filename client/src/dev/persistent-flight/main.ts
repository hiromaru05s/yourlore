import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {clearMonsterStates} from '../../ui/monster/runtime';import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';import {revealSpell,setFxSkip} from '../../ui/anim';

setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
g.turn=3;g.phase='main';g.pending=null;
for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=p.maxMana=12;p.hp=30;p.quests=[];p.traps=[];p.enchants=[];p.field=['M4','ELF','TDE2'].map((id,j)=>({...DB[id],uid:`mon-${i}-${j}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));p.hand=[{...DB.E3,uid:`hand-${i}`}];}
view.render(g);view.setHandOpen(false);clearMonsterStates(root);startBoardLayout();
const params=new URLSearchParams(location.search);
if(params.has('reduced')){const original=window.matchMedia.bind(window);window.matchMedia=(query:string)=>query==='(prefers-reduced-motion: reduce)'?new Proxy(original(query),{get:(target,key)=>key==='matches'?true:Reflect.get(target,key,target)}):original(query);}
const panel=document.createElement('div');panel.style.cssText='position:fixed;left:8px;top:8px;z-index:9999;background:#fff;padding:10px;font:12px sans-serif;color:#123;max-height:160px;max-width:270px;overflow:auto';panel.innerHTML='<button id="play-me">自分側 ②</button> <button id="play-opp">相手側 ②</button> <button id="suite">検証</button><pre id="report">読み込み中</pre>';document.body.append(panel);
const report=panel.querySelector('pre')!;const results:unknown[]=[];let busy=false;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function play(side:'me'|'opp',id='E3',interrupt=''){
 document.querySelectorAll('.fx-field-ghost').forEach(n=>n.remove());setFxSkip(interrupt==='skip');
 let seen=false,oldFrame=false,maxCanvases=0;const probe=setInterval(()=>{seen||=!!document.querySelector('.persistent-flight-canvas');oldFrame||=!!document.querySelector('.spell-frame-resonance');maxCanvases=Math.max(maxCanvases,document.querySelectorAll('.persistent-flight-canvas').length);},16);
 const timer=interrupt==='abort'?setTimeout(()=>setFxSkip(true),700):interrupt==='resize'?setTimeout(()=>window.dispatchEvent(new Event('resize')),700):0;
 const begun=performance.now();const ghost=await revealSpell({...DB[id],uid:`flight-${side}-${id}`},side,'field',1);
 clearInterval(probe);clearTimeout(timer);setFxSkip(false);
 const item={side,id,interrupt,seen,oldFrame,maxCanvases,ms:Math.round(performance.now()-begun),ghost:!!ghost?.isConnected,canvases:document.querySelectorAll('.persistent-flight-canvas,.persistent-flight-trail').length,source:document.querySelectorAll('.fx-card-flight').length,hidden:document.querySelectorAll('.fx-field-ghost [style*="visibility: hidden"]').length};results.push(item);report.textContent=JSON.stringify(results,null,2);return item;
}
async function suite(){if(busy)return;busy=true;results.length=0;try{for(const side of ['me','opp'] as const)for(const id of ['E3','WORLD_SEED'])await play(side,id);for(const mode of ['abort','resize','skip'])await play('me','E3',mode);report.dataset.done='true';await fetch('/__flight-evidence?label='+ (params.has('reduced')?'reduced':innerWidth<500?'mobile':'desktop'),{method:'POST',body:JSON.stringify(results,null,2)});}finally{busy=false;}}
for(const side of ['me','opp'] as const)panel.querySelector(`#play-${side}`)!.addEventListener('click',async()=>{if(busy)return;busy=true;try{await play(side);}finally{busy=false;}});
panel.querySelector('#suite')!.addEventListener('click',()=>void suite());
void(async()=>{await waitForDuel(root);await document.fonts.ready;await sleep(300);report.textContent='準備完了';if(location.search.includes('qa=run'))await suite();})();
