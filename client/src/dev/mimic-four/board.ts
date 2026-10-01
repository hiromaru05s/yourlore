import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';import {cardEl} from '../../ui/cardView';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {fieldPlacement} from '../../ui/anim';import {clearMonsterStates} from '../../ui/monster/runtime';import {setLang} from '../../i18n';
import {makeFixture} from '../series-vfx-d/revision3/fixture';import {MimicRig,patterns,DURATION,ease} from './rig';
const q=new URLSearchParams(location.search),study=q.get('mode')==='compare',onBoard=q.get('mode')==='board',side=q.get('side')==='1'?1:0;let variant=Math.max(1,Math.min(4,Number(q.get('variant')||1)));
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#162029';
const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}.m4-rig .card{transition:none!important;animation:none!important}.m4-study{display:grid;grid-template-columns:repeat(2,1fr);height:100vh;gap:1px;background:#37434b}.m4-cell{position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,#384038,#17232b 73%)}.m4-cell h2{position:absolute;top:12px;left:20px;font:14px system-ui;color:#dfcfaa}.m4-label{position:fixed;bottom:12px;left:16px;color:#c9c3b1;font:11px system-ui;z-index:190;pointer-events:none}';document.head.append(style);
const fixture=makeFixture({item:'S07',card:'MIMIC',variant:1,side,outcome:'hit',reduced:false,background:'light'});
const root=document.getElementById('app')!;const noop=()=>{};let view:GameView|undefined,stopLayout=()=>{},original:HTMLElement|null=null,handPose:DOMMatrix|undefined;
let ready=false,playing=false,time=0,raf=0,last=0,speed=1,reduced=false,loop=false,disposed=false;const rigs:MimicRig[]=[];const cells:HTMLElement[]=[];
const status=()=>({ready,playing,time,duration:DURATION,variant,mode:study?'compare':onBoard?'board':'summon',open:rigs.map(r=>Number(r.node.dataset.open)),visibleOriginal:original?getComputedStyle(original).visibility!=='hidden':null});
const post=()=>parent.postMessage({kind:'mimic-four',...status()},location.origin);
function fieldNode(){return root.querySelector<HTMLElement>('.field .card[data-uid="r3-source"]')||root.querySelector<HTMLElement>('.card[data-uid="r3-source"]');}
function mix(a:DOMMatrix,b:DOMMatrix,t:number){const av=a.toFloat64Array(),bv=b.toFloat64Array();return new DOMMatrix(Array.from(av,(n,i)=>n+(bv[i]-n)*t));}
function draw(){if(!ready||disposed)return;for(const [i,rig]of rigs.entries()){
 rig.draw(time,study?i+1:variant,reduced);
 if(study){const box=cells[i].getBoundingClientRect(),scale=Math.min((box.width-42)/245,(box.height-58)/380,1.15);rig.node.style.transform=`translate(${box.x+(box.width-180*scale)/2}px,${box.y+48+(box.height-48-280*scale)/2}px) scale(${scale})`;}
 else if(original){const end=fieldPlacement(original,180,280);const focusScale=Math.min(innerWidth/460,innerHeight/505,1.12);const focus=new DOMMatrix().translate((innerWidth-180*focusScale)/2,(innerHeight-280*focusScale)/2-10).scale(focusScale);const active=time>0&&time<DURATION;
  original.style.visibility=active?'hidden':'visible';rig.node.style.visibility=active?'visible':'hidden';let position=end;
  if(!onBoard&&!reduced){position=time<460?mix(handPose||end,focus,ease(0,460,time)):mix(focus,end,ease(2430,3100,time));}
  rig.node.style.transform=position.toString();
 }
}post();}
async function setup(){
 if(study){root.className='m4-study';patterns.forEach((p,i)=>{const cell=document.createElement('div');cell.className='m4-cell';cell.innerHTML=`<h2>0${i+1} / ${p.name}</h2>`;root.append(cell);cells.push(cell);const rig=new MimicRig(cardEl(fixture.source,{size:'hand',fullArt:true}));document.body.append(rig.node);rigs.push(rig);});}
 else{view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});(view as unknown as {statRise:{dispose():void}}).statRise.dispose();view.render(structuredClone(fixture.before));view.setHandOpen(false);clearMonsterStates(root);stopLayout=startBoardLayout();await waitForDuel(root);const source=fieldNode();if(source)handPose=fieldPlacement(source,180,280);
  view.render(structuredClone(fixture.after));view.setHandOpen(false);clearMonsterStates(root);await waitForDuel(root);original=fieldNode();if(!original)throw new Error('ミミックの召喚先が見つかりません');const rig=new MimicRig(cardEl(fixture.source,{size:'hand',fullArt:true}));document.body.append(rig.node);rigs.push(rig);
 }
 await Promise.all(rigs.map(r=>r.ready()));await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));if(disposed)return;ready=true;draw();
}
function tick(now:number){if(!playing||disposed)return;time=Math.min(DURATION,time+Math.min(70,now-last)*speed);last=now;draw();if(time>=DURATION){playing=false;post();if(loop){time=0;playing=true;last=performance.now();raf=requestAnimationFrame(tick);}return;}raf=requestAnimationFrame(tick);}
function play(){if(!ready||playing)return;if(time>=DURATION)time=0;playing=true;last=performance.now();raf=requestAnimationFrame(tick);}
function pause(){playing=false;cancelAnimationFrame(raf);post();}
function seek(t:number){pause();time=Math.max(0,Math.min(DURATION,t));draw();}
function dispose(){disposed=true;pause();if(original)original.style.visibility='visible';rigs.forEach(r=>r.dispose());stopLayout();view?.destroy();}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='mimic-control')return;const d=e.data;if(d.command==='play')play();if(d.command==='pause')pause();if(d.command==='seek')seek(d.time);if(d.command==='reset')seek(0);if(d.command==='options'){speed=Number(d.speed)||1;reduced=!!d.reduced;loop=!!d.loop;draw();}if(d.command==='background'){root.style.filter=d.dark?'brightness(.62)':'';}});
window.addEventListener('resize',()=>draw());window.addEventListener('pagehide',dispose,{once:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
(window as any).mimicFour={play,pause,seek,dispose,get state(){return status();},fixture};
void setup().catch(e=>parent.postMessage({kind:'mimic-four',error:String(e)},location.origin));
