import '../../../client/src/styles/tokens.css';
import '../../../client/src/styles/base.css';
import '../../../client/src/styles/card.css';
import '../../../client/src/styles/game-overlays.css';
import '../../../client/src/styles/game.css';
import '../../../client/src/styles/screens.css';
import '../../../client/src/styles/presentation.css';
import '../../../client/src/styles/reading-board.css';
import {createGame} from '../../../client/src/shared/engine';
import {DB,STARTERS} from '../../../client/src/shared/cards';
import type {CardInst,FieldMon} from '../../../client/src/shared/types';
import {GameView,setMyAvatar,setOppAvatar} from '../../../client/src/ui/boardView';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {setLang} from '../../../client/src/i18n';
import {draw as drawOriginal} from './references/2026-10-02-sigil-five/render';
import {drawTurnSigil as runtimeDraw,type Side} from '../../../client/src/ui/turnSigil';
import {turnBanner,setFxSkip} from '../../../client/src/ui/anim';
const studies=[{id:'recall',duration:2320,name:'採用版・還流の封印'}] as const;
const backgroundsReady=Promise.resolve();
function draw(canvas:HTMLCanvasElement,_id:string,side:Side,time:number,opts:{reduced:boolean}){runtimeDraw(canvas,side,time,{title:side==='me'?'あなたのターンです':'相手のターンです',subtitle:side==='me'?'YOUR TURN  ·  06':'OPPONENT’S TURN  ·  06'},opts.reduced);}

setLang('ja');
const q=new URLSearchParams(location.search),id=studies.find(s=>s.id===q.get('variant'))?.id??'recall';
let side:Side=q.get('side')==='opp'?'opp':'me';
const g=createGame({mode:'bot',seed:207,starting:0,p0:{id:'study-me',name:'シーカー'},p1:{id:'study-opp',name:'相手'}}).state;
let uid=0;const inst=(key:string):CardInst=>({...DB[key]||STARTERS[key],uid:`turn-study-${++uid}`});
const mons=Object.values(DB).filter(c=>c.t==='mon'&&c.atk&&c.def),spells=Object.values(DB).filter(c=>c.ench);
g.turn=6;g.cur=side==='me'?0:1;
for(const [s,p] of g.players.entries()){
 p.field=mons.slice(s*3,s*3+3).map(c=>({...inst(c.id),exhausted:s===1,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}) as FieldMon);
 p.enchants=[{card:inst(spells[0].id),turns:2}];p.traps=[];p.discard=mons.slice(0,5).map(c=>inst(c.id));p.removed=[inst(mons[8].id)];
 p.hp=s?28:32;p.maxMana=8;p.mana=6;p.hand=[...mons.slice(0,3).map(c=>inst(c.id)),...Object.keys(STARTERS).slice(0,3).map(inst)];
}
setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const empty=()=>{};
const view=new GameView(document.getElementById('app')!,0,{onPlay:empty,onBlockedPlay:empty,onAttack:empty,onBlockedAttack:empty,onReorder:empty,onChooseTarget:empty,onBuyMarket:empty,onBuySupply:empty,onRefresh:empty,onEndTurn:()=>selectSide('opp'),onSurrender:empty});
view.render(g);const stopLayout=startBoardLayout();
const style=document.createElement('style');style.textContent=`#turn-controls{position:fixed;top:8px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 20px);z-index:300;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;background:#eef3f0f5;color:#2c4558;padding:9px;border:1px solid #a8bdc6;border-radius:5px;box-shadow:0 4px 12px #1232;font:11px system-ui}#turn-controls button,#turn-controls select{font:11px system-ui;padding:7px 10px;border:1px solid #a4bbc7;border-radius:3px;background:#f9fbf5;color:#27445a;cursor:pointer}#turn-controls button[aria-pressed=true]{background:#294d66;color:#fff}#turn-controls label{display:flex;align-items:center;gap:4px}#turn-controls input[type=range]{width:95px;accent-color:#416984}#turn-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:175}#turn-status{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:300;padding:5px 10px;border-radius:3px;background:#eff4f0e8;color:#315067;font:10px system-ui;white-space:nowrap}.sr-only{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}@media(max-width:500px){#turn-controls{gap:4px;top:5px;padding:6px;width:calc(100% - 16px)}#turn-controls button{padding:6px 8px}#turn-controls input[type=range]{width:90px}}`;
document.head.append(style);
const controls=document.createElement('div');controls.id='turn-controls';controls.innerHTML=`<button id="me" aria-pressed="${side==='me'}">自分</button><button id="opp" aria-pressed="${side==='opp'}">相手</button><button id="replay">最初から再生</button><button id="freeze">停止</button><button id="old">原案</button><button id="peak">表示中</button><button id="exit-play">閉じる動き</button><button id="exit-mid">閉じる途中</button><select id="board-speed" aria-label="再生速度"><option value="1">1×</option><option value="0.25">0.25×</option></select><label><input id="closing-only" type="checkbox">閉じる部分のみ</label><label><input id="loop" type="checkbox" checked>反復</label><label><input id="quiet" type="checkbox">低減</label><input id="board-seek" type="range" aria-label="時刻" min="0" max="1000" value="470">`;
document.body.append(controls);
const canvas=document.createElement('canvas');canvas.id='turn-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
const status=document.createElement('div');status.id='turn-status';document.body.append(status);
const live=document.createElement('div');live.className='sr-only';live.role='status';live.setAttribute('aria-live','polite');document.body.append(live);
const $=<T extends HTMLElement>(s:string)=>document.getElementById(s) as T;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');$<HTMLInputElement>('quiet').checked=reduced.matches;
let time=0,playing=false,raf=0,last=0,original=false;
const duration=studies.find(s=>s.id===id)!.duration;
function paint(){const opts={background:'none' as const,reduced:$<HTMLInputElement>('quiet').checked};if(original)drawOriginal(canvas,'veil',side,time<=1500?time:1500+(Math.min(time,duration)-1500)*420/820,opts);else draw(canvas,id,side,Math.min(time,duration),opts);$('old').setAttribute('aria-pressed',String(original));$<HTMLInputElement>('board-seek').value=String(Math.round(Math.min(1,time/duration)*1000));status.textContent=`${original?'原案 / ':''}${studies.find(s=>s.id===id)!.name} / ${side==='me'?'自分':'相手'} / ${(Math.min(time,duration)/1000).toFixed(2)} s · 固定盤面の試作`;}
function stop(){playing=false;cancelAnimationFrame(raf);}
function tick(now:number){if(!playing)return;time+=Math.min(now-last,50)*Number($<HTMLSelectElement>('board-speed').value);last=now;if(time>=duration+450){if($<HTMLInputElement>('loop').checked)time=$<HTMLInputElement>('closing-only').checked?1450:0;else{time=duration;stop();}}paint();if(playing)raf=requestAnimationFrame(tick);}
function play(){stop();document.querySelectorAll('.fx-turnbanner').forEach(n=>n.remove());time=$<HTMLInputElement>('closing-only').checked?1450:0;last=performance.now();playing=true;live.textContent=side==='me'?'あなたのターンです':'相手のターンです';raf=requestAnimationFrame(tick);}
function selectSide(s:Side){side=s;g.cur=s==='me'?0:1;view.render(g);$('me').setAttribute('aria-pressed',String(s==='me'));$('opp').setAttribute('aria-pressed',String(s==='opp'));play();}
$('exit-play').onclick=()=>{$<HTMLInputElement>('closing-only').checked=true;play();};$('exit-mid').onclick=()=>{stop();time=1900;paint();};
$('me').onclick=()=>selectSide('me');$('opp').onclick=()=>selectSide('opp');$('replay').onclick=()=>{$<HTMLInputElement>('closing-only').checked=false;play();};$('freeze').onclick=stop;
$('peak').onclick=()=>{stop();document.querySelectorAll('.fx-turnbanner').forEach(n=>n.remove());time=duration*.47;paint();};
$('old').onclick=()=>{stop();original=!original;time=duration*.47;paint();};
$<HTMLInputElement>('board-seek').oninput=e=>{stop();document.querySelectorAll('.fx-turnbanner').forEach(n=>n.remove());time=+(e.target as HTMLInputElement).value/1000*duration;paint();};
$<HTMLInputElement>('quiet').onchange=()=>{stop();time=duration*.47;paint();};
const ro=new ResizeObserver(paint);ro.observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();time=duration;paint();document.querySelectorAll('.fx-turnbanner').forEach(n=>n.remove());}});
reduced.addEventListener('change',()=>{$<HTMLInputElement>('quiet').checked=reduced.matches;stop();time=duration*.47;paint();});
window.addEventListener('pagehide',()=>{stop();ro.disconnect();stopLayout();view.destroy();canvas.remove();document.querySelectorAll('.fx-turnbanner').forEach(n=>n.remove());});paint();

let interacted=false;controls.addEventListener('pointerdown',()=>{interacted=true;},{once:true});
function startWhenReady(){if(interacted||document.hidden)return;if(document.querySelector('.game-loading')){raf=requestAnimationFrame(startWhenReady);return;}if(reduced.matches){time=950;paint();}else play();}
void backgroundsReady.then(startWhenReady);

const actual=document.createElement('button');actual.textContent='ゲーム経路で再生';controls.append(actual);actual.onclick=()=>{stop();time=duration;paint();setFxSkip(false);turnBanner(side==='me',6);};
