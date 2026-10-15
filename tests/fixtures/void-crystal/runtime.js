import './src/styles/tokens.css';import './src/styles/base.css';import './src/styles/card.css';import './src/styles/game-overlays.css';import './src/styles/game.css';import './src/styles/screens.css';import './src/styles/reading-board.css';import './src/styles/presentation.css';
import {BaseController} from './src/game/controller';import {createGame,reduce} from './src/shared/engine';import {DB} from './src/shared/cards';import {setLang} from './src/i18n';import {startBoardLayout} from './src/ui/layout';import {waitForDuel} from './src/ui/duelReadiness';import * as A from './src/ui/anim';
setLang('ja');
class Harness extends BaseController{submit(){} async run({side=0,count=8,shield=0,reverse=false,echo=false}={}){
 A.setFxSkip(false);const g=createGame({mode:'online',seed:71,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;
 g.phase='main';g.pending=null;g.turn=3;g.cur=side;delete g.opening;
 for(const [i,p]of g.players.entries()){Object.assign(p,{openingDrawReady:false,mana:30,maxMana:30,hp:120,maxHp:120,hand:[],field:[],removed:[],enchants:[],quests:[],traps:[],shield:0});p.removed=Array.from({length:count},(_,j)=>({...DB.ELF,uid:`record-${i}-${j}`}));}
 g.players[side].hand=[{...DB.EXILE_NUKE2,uid:'cast'}];g.players[1-side].shield=shield;
 if(reverse)g.players[side].enchants.push({card:{...Object.values(DB).find(c=>c.ench==='blackReverse'),uid:'reverse'}});
 if(echo)g.players[side].enchants.push({card:{...Object.values(DB).find(c=>c.ench==='runeEcho'),uid:'echo'}});
 this.state=g;this.view.render(g);this.view.setHandOpen(false);await waitForDuel(document.getElementById('app'));const r=reduce(g,{type:'play',idx:0});this.state=r.state;
 window.qa.events=r.events;window.qa.expected=r.state.players.map(p=>p.hp);window.qa.done=false;window.qa.samples=[];
 let start=0;const sample=()=>{if(window.qa.done)return;const overlay=document.querySelector('.void-crystal-overlay');if(overlay&&!start)start=performance.now();window.qa.samples.push({t:start?performance.now()-start:-1,hp:[document.querySelector('#hp-me')?.textContent,document.querySelector('#hp-opp')?.textContent],gpu:document.querySelectorAll('.collapse-gpu').length});requestAnimationFrame(sample);};requestAnimationFrame(sample);
 try{await this.playEvents(g,r,new Set());}finally{window.qa.done=true;}
 return {hp:[document.querySelector('#hp-me')?.textContent,document.querySelector('#hp-opp')?.textContent],expected:window.qa.expected};
 }}
const h=new Harness(document.getElementById('app'),0,{onHome(){},onRematch(){}});const stop=startBoardLayout();window.qa={run:x=>h.run(x),skip:()=>A.setFxSkip(true),dispose:()=>{h.destroy();stop();},ready:true};
