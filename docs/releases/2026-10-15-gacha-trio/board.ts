import '../../../client/src/styles/tokens.css';import '../../../client/src/styles/base.css';import '../../../client/src/styles/card.css';import '../../../client/src/styles/game-overlays.css';import '../../../client/src/styles/game.css';import '../../../client/src/styles/screens.css';import '../../../client/src/styles/reading-board.css';import '../../../client/src/styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../client/src/ui/boardView';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {waitForDuel} from '../../../client/src/ui/duelReadiness';
import {createGame} from '../../../client/src/shared/engine';
import {DB} from '../../../client/src/shared/cards';
import {setLang} from '../../../client/src/i18n';

import {animateDraw} from '../../../client/src/ui/anim';
import {captureHandLayout} from '../../../client/src/ui/handGeometry';
import {clearMonsterStates} from '../../../client/src/ui/monster/runtime';
const state={variant:0 as 0|1|2,time:0};
import {GACHA_THEMES,type GachaVariant as Variant} from '../../../client/src/shared/gachaCosmetics';


setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const css=document.createElement('style');css.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{};

const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const g=createGame({mode:'bot',seed:71,starting:1,p0:{id:'preview-self',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
g.turn=3;g.phase='main';g.pending=null;
let uid=0;
const cards=(n:number,id='ELF')=>Array.from({length:n},()=>({...DB[id],uid:`trio-${++uid}`}));
for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=['M4','ELF'].map((id,j)=>({...DB[id],uid:`living-${i}-${j}`,exhausted:true,summonedTurn:0,decayCnt:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));p.hand=cards(i===1?5:3);p.deck=cards(8);p.discard=cards(4,'HALF_ELF');}
let equipment:{sleeves:[string,string];furnitures:[string,string]}|undefined;
let busy=false,abort:AbortController|undefined,flight:Promise<void>=Promise.resolve(),epoch=0,disposed=false,frame=0;
function report(){const p=g.players[1];parent.postMessage({kind:'trio-state',variant:state.variant,deck:p.deck.length,grave:p.discard.length,hand:p.hand.length,busy},location.origin);}
function render(){const key=GACHA_THEMES[state.variant].key;g.sleeves=equipment?.sleeves??['default','sleeve:gacha-'+key];g.furnitures=equipment?.furnitures??['default','furniture:gacha-'+key];view.render(g);view.setHandOpen(false);clearMonsterStates(root);window.dispatchEvent(new Event('lore:layout'));report();}
render();const stop=startBoardLayout();
function tick(){if(disposed)return;frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);
async function apply(data:Record<string,unknown>){
 equipment=undefined;const token=++epoch;abort?.abort();await flight;if(disposed||token!==epoch)return;
 busy=false;
 const v=Number(data.variant);if(Number.isInteger(v)&&v>=0&&v<3)state.variant=v as Variant;
 if(data.counts&&Array.isArray(data.counts)){const [deck,grave,hand]=data.counts.map(n=>Math.max(0,Math.min(20,Math.floor(Number(n)||0))));const p=g.players[1];p.deck=cards(deck);p.discard=cards(grave,'HALF_ELF');p.hand=cards(Math.min(10,hand));}
 render();
}
async function draw(n:number,scale:number){
 if(busy||disposed)return;const p=g.players[1],count=Math.min(n,p.deck.length,10-p.hand.length);if(count<=0){report();return;}
 const before=captureHandLayout(document.getElementById('oppHand')),arriving=p.deck.splice(-count);p.hand.push(...arriving);busy=true;render();
 abort=new AbortController();const signal=abort.signal;
 flight=animateDraw(document.getElementById('oppHand'),count,'opp',{uids:arriving.map(c=>c.uid),previousHand:before,durationScale:Math.max(1,Math.min(4,scale)),signal}).finally(()=>{busy=false;if(!disposed)report();});
 await flight;
}
function message(e:MessageEvent){if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='trio-command')return;const d=e.data;if(d.action==='clock'){state.time=Math.max(0,Number(d.time)||0);return;}if(d.action==='draw'){void draw(Number(d.count)||1,Number(d.scale)||1);return;}if(d.action==='set')void apply(d);}
window.addEventListener('message',message);
function cancel(){abort?.abort();}
window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);
Object.assign(window,{trioBoard:{equip(sleeves:[string,string],furnitures:[string,string]){equipment={sleeves,furnitures};render();},dispose(){view.destroy();},cosmetics:()=>({piles:[...document.querySelectorAll<HTMLElement>('.pile--deck,.pile--shelf')].filter(e=>e.dataset.material?.includes('/gacha-trio-v1/')).map(e=>e.id)}),get counts(){const p=g.players[1];return {deck:p.deck.length,grave:p.discard.length,hand:p.hand.length};},get busy(){return busy;},get variant(){return state.variant;},get time(){return state.time;}}});
void waitForDuel(root).then(()=>{if(disposed)return;root.dataset.livingReady='true';parent.postMessage({kind:'trio-ready'},location.origin);report();});
window.addEventListener('pagehide',()=>{disposed=true;++epoch;abort?.abort();cancelAnimationFrame(frame);window.removeEventListener('message',message);window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);stop();view.destroy();},{once:true});
