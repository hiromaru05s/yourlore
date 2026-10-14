import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';import '../../styles/dice.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB} from '../../shared/cards';
import type {Action,Side,GameState} from '../../shared/types';
import {startBoardLayout} from '../../ui/layout';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {waitForDuel} from '../../ui/duelReadiness';
import {setLang} from '../../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;
const panel=document.createElement('aside');panel.style.cssText='position:fixed;top:8px;left:8px;z-index:9999;max-width:calc(100vw - 16px);padding:8px;background:#f7f2e8;color:#222;font:12px sans-serif';
panel.innerHTML='<select aria-label="発動側"><option value="0">自分</option><option value="1">相手</option></select> <select aria-label="出目"><option value="5">5 成功</option><option value="3">3 失敗</option><option value="4">4 成功</option></select> <button id="reset">初期化</button> <button id="cast" disabled>発動</button> <button id="other-end">相手ターン終了</button> <button id="forward">早送り</button> <button id="rejoin">再接続</button> <button id="leave">対戦終了</button><output id="qa-state"></output><pre id="qa-history" style="max-width:320px;font-size:9px;white-space:pre-wrap"></pre>';
document.body.append(panel);
let controller:Harness|undefined,turn=7,history:string[]=[];let last='';
const publish=()=>{const c=controller;if(!c)return;const g=c.current();if(!g)return;const fx=document.querySelector<HTMLElement>('.timewarp-optics');const state={turn:g.turn,cur:g.cur,queued:g.players.map(p=>p.skipTurns??0),sources:g.players.map(p=>p.skipTurnSources??[]),phase:fx?.dataset.phase??(document.querySelector('.d3-overlay')?'dice':'none'),canEnd:!(document.querySelector('#endBtn') as HTMLButtonElement)?.disabled,reading:root.dataset.readingTurn};panel.querySelector('output')!.textContent=JSON.stringify(state);const key=JSON.stringify(state);if(key!==last){last=key;history.push(key);panel.querySelector('pre')!.textContent=history.slice(-8).join('\n');}};
class Harness extends BaseController{
 constructor(g:GameState){super(root,0,{onHome:()=>{},onRematch:()=>{},onBattleReady:publish});this.introShown=true;this.applyResult({state:g,events:[]},false);}
 protected submit(a:Action){this.applyResult(reduce(this.state,a));publish();}
 current(){return this.state;}
 cast(){this.submit({type:'play',idx:0});}
 otherEnd(){this.submit({type:'endTurn'});}
 forward(){this.fastForward();}
}
function fixture(seed:number,side:Side){const g=createGame({mode:'bot',seed,starting:side,p0:{id:'self',name:'あなた'},p1:{id:'opponent',name:'相手'}}).state;g.turn=turn;g.turnTotalMs=3600000;g.cur=side;g.pending=null;g.phase='main';for(const [i,p] of g.players.entries()){Object.assign(p,{openingDrawReady:false,mana:30,maxMana:30,hp:100,hand:[],traps:[],quests:[],enchants:[],skipTurns:0,skipNext:false,skipTurnSources:[]});p.field=['M4','ELF','TDE2'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));}g.players[side].hand=[{...DB.TIMEWARP,uid:'timewarp-source'}];return g;}
async function reset(g?:GameState){controller?.destroy();root.replaceChildren();controller=undefined;history=[];last='';(panel.querySelector('#cast') as HTMLButtonElement).disabled=true;turn+=4;if(!g){const side=Number((panel.querySelector('[aria-label="発動側"]') as HTMLSelectElement).value) as Side,roll=Number((panel.querySelector('[aria-label="出目"]') as HTMLSelectElement).value);for(let seed=1;seed<500;seed++){const candidate=fixture(seed,side),test=reduce(candidate,{type:'play',idx:0});if(test.events.some(e=>e.type==='dice'&&e.source.id==='TIMEWARP'&&e.rolls[0]===roll)){g=candidate;break;}}}if(!g)throw Error('seed');controller=new Harness(g);await waitForDuel(root);(panel.querySelector('#cast') as HTMLButtonElement).disabled=false;publish();}
panel.querySelector('#reset')!.addEventListener('click',()=>void reset());panel.querySelector('#cast')!.addEventListener('click',()=>controller?.cast());panel.querySelector('#other-end')!.addEventListener('click',()=>controller?.otherEnd());panel.querySelector('#forward')!.addEventListener('click',()=>controller?.forward());panel.querySelector('#rejoin')!.addEventListener('click',()=>void reset(structuredClone(controller!.current())));panel.querySelector('#leave')!.addEventListener('click',()=>controller?.destroy());
const stop=startBoardLayout(),interval=setInterval(publish,80);window.addEventListener('pagehide',()=>{clearInterval(interval);stop();controller?.destroy();});void reset();
