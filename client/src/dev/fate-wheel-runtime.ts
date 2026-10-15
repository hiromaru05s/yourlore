/** Local QA entry: normal controller, reducer and redacted online event batches. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';import '../styles/dice.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import {redactFor} from '../shared/protocol';
import {DB,STARTERS} from '../shared/cards';
import type {Action,GameState,Side} from '../shared/types';
import {waitForDuel} from '../ui/duelReadiness';
import {setLang} from '../i18n';import {startBoardLayout} from '../ui/layout';
setLang('ja');startBoardLayout();
let authority:GameState;let controller:Runtime;
class Runtime extends BaseController {
 constructor(){super(document.getElementById('app')!,0,{onHome:()=>{},onRematch:()=>{}});this.introShown=true;this.applyResult({state:redactFor(authority,0),events:[]},false);}
 protected submit(a:Action){send(a);}
 receive(a:Action){const r=reduce(authority,a);authority=r.state;document.getElementById('state')!.textContent=JSON.stringify({pending:authority.pending?.kind??null,roll:authority.pending?.data?.dice,hp:authority.players.map(p=>p.hp),max:authority.players.map(p=>p.maxMana),mimic:authority.players.map(p=>p.field.filter(c=>c.id==='MIMIC').length)});this.applyResult({state:redactFor(r.state,0),events:r.events});}
}
function send(a:Action){controller.receive(a);}
function reset(side:Side){controller?.destroy();authority=createGame({mode:'online',seed:42,starting:side,p0:{id:'qa0',name:'あなた'},p1:{id:'qa1',name:'相手'}}).state;authority.turn=3;authority.phase='main';authority.cur=side;authority.pending=null;authority.opening=undefined;
 for(const [i,p] of authority.players.entries()){Object.assign(p,{openingDrawReady:false,hp:24,mana:6,maxMana:6,hand:[],field:[],enchants:[],traps:[],quests:[]});p.field=[{...DB.M4,uid:'qa-guard-'+i,dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:1}];}
 authority.players[side].hand=[{...STARTERS.STARTER_CHEST,uid:'qa-chest'}];authority.players[side].enchants=[{card:{...DB.FATE_WHEEL,uid:'qa-wheel'},turns:99,bornTurn:1}];controller=new Runtime();void waitForDuel(document.getElementById('app')!);document.getElementById('state')!.textContent=side?'相手を操作する検証':'自分を操作する検証';}
document.getElementById('own')!.onclick=()=>reset(0);document.getElementById('opp')!.onclick=()=>reset(1);document.getElementById('play')!.onclick=()=>send({type:'play',idx:0});document.getElementById('remote-re')!.onclick=()=>{if(authority.cur===1)send({type:'pick',uid:'re'});};document.getElementById('remote-keep')!.onclick=()=>{if(authority.cur===1)send({type:'pick',uid:null});};reset(0);
