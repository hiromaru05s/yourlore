import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {clearMonsterStates} from '../../ui/monster/runtime';
import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {studies,families,isExtinction,type Family} from './catalog';import {Renderer,loadAssets} from './renderer';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const css=document.createElement('style');css.textContent='body{margin:0;overflow:hidden;background:#f2eee8}.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const state=createGame({mode:'bot',seed:73,starting:0,p0:{id:'extinction-me',name:'YOU'},p1:{id:'extinction-opp',name:'OPPONENT'}}).state;
state.turn=3;state.phase='main';state.pending=null;for(const [i,p] of state.players.entries()){
 p.openingDrawReady=false;p.hp=30;p.shield=8;p.dew=8;p.brand=8;p.mana=6;p.maxMana=6;p.enchants=[];p.quests=[];p.traps=[];
 p.field=['M4','ELF','TDE2'].map((id,j)=>({...DB[id],uid:`extinction-${i}-${j}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));p.hand=[{...DB.DEFENSIVE_STANCE,uid:`extinction-hand-${i}`}];
}
view.render(state);view.setHandOpen(false);clearMonsterStates(root);
const anchors=[0,1].map(i=>Object.fromEntries(families.map(f=>[f,document.querySelector<HTMLElement>(`#${i?'portraitOpp':'portraitMe'} .pt-${f}`)!])) as Record<Family,HTMLElement>);
const canvas=document.createElement('canvas');canvas.className='extinction-overlay';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:180';document.body.append(canvas);
let renderer:Renderer,ready=false,disposed=false,id='S1',time=0,side=0,multi=false,reduced=false,active=false,dark=false,after=0,eventCount=0;const errors:string[]=[];
const stopLayout=startBoardLayout();
function restore(){anchors.forEach(a=>families.forEach(f=>{a[f].style.visibility='';a[f].querySelector('b')!.textContent='8';a[f].setAttribute('aria-label',(a[f].getAttribute('aria-label')||'').replace(/\d+$/,'8'));}));canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);}
function chosen(){const s=studies.find(s=>s.id===id)!;return multi?[0,1].flatMap(i=>families.map(f=>({el:anchors[i][f],study:studies.filter(s=>s.family===f)[Number(id.slice(1))-1]}))):[{el:anchors[side][s.family],study:s}];}
function draw(){
 restore();if(!ready||disposed||!active||document.hidden)return;root.style.filter=dark?'brightness(.68)':'';
 const dpr=Math.min(2,devicePixelRatio||1),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
 for(const {el,study} of chosen()){
  if(!isExtinction(8,after)){el.querySelector('b')!.textContent=String(after);el.setAttribute('aria-label',(el.getAttribute('aria-label')||'').replace(/\d+$/,String(after)));continue;}
  const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
  // Snapshot exact native badge location before hiding it. Every frame remeasures
  // layout, so zoom/resize never leaves a detached animation at an old position.
  if(time<=0)continue;el.style.visibility='hidden';renderer.draw(c,study,time,r.x+r.width/2,r.y+r.height/2,r.width,r.height,8,reduced);
 }
}
function dispose(){if(disposed)return;disposed=true;restore();renderer?.dispose();canvas.remove();stopLayout();view.destroy();}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='extinction-control'||disposed)return;
 const d=e.data;if(d.action==='dispose'){dispose();return;}if(d.action==='suspend'){active=false;restore();return;}
 if(studies.some(s=>s.id===d.id))id=d.id;time=Math.max(0,Math.min(1500,Number(d.time)||0));side=d.side===1?1:0;multi=!!d.multi;reduced=!!d.reduced;dark=!!d.dark;active=!!d.active;
 if(d.action==='restore'){after=0;time=0;}if(d.action==='decrement'){after=5;time=0;}if(d.action==='frame'&&time===0)after=0;
 draw();
});
window.addEventListener('resize',()=>requestAnimationFrame(draw));document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;restore();}});window.addEventListener('pagehide',dispose,{once:true});
// Tests can exercise the gating edge without connecting unselected studies to gameplay.
(window as any).extinctionBoard={get state(){return{ready,disposed,id,time,side,multi,active,after,eventCount,hidden:anchors.flatMap(a=>families.map(f=>a[f])).filter(e=>e.style.visibility==='hidden').length,errors,renderer:renderer?.info,rects:chosen().map(({el})=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})};},event(before:number,value:number){if(!isExtinction(before,value))return false;eventCount++;after=0;time=1;active=true;draw();return true;},restore,dispose};
void(async()=>{await waitForDuel(root);await document.fonts.ready;renderer=new Renderer(await loadAssets());await renderer.warm();ready=true;parent.postMessage({kind:'extinction-ready'},location.origin);draw();})().catch(e=>{errors.push(String(e));parent.postMessage({kind:'extinction-error',error:String(e)},location.origin);});
