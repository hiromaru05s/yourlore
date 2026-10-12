import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {clearMonsterStates} from '../../ui/monster/runtime';import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';import {outcomes} from './catalog';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(style);
import {BaseController} from '../../game/controller';
import type {GameState,ReduceResult} from '../../shared/types';
class Fixture extends BaseController{
 protected submit(){} protected get useTurnClock(){return false;}
 get board(){return this.view;}
 async batch(prev:GameState,res:ReduceResult){this.state=res.state;await (this as any).playEvents(prev,res,new Set());}
}
const root=document.getElementById('app')!,noop=()=>{},fixture=new Fixture(root,0,{onHome:noop,onRematch:noop}),view=fixture.board;
let fixtureState:GameState;


import {hatchSummon,setFxSkip} from '../../ui/anim';
import {cancelHatches} from '../../ui/hatchSummon/runtime';
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
const status=document.createElement('output'),button=document.createElement('button');button.textContent='孵化ランタイム検証';const controls=document.createElement('div');controls.style.cssText='position:fixed;top:8px;left:8px;z-index:9999;background:white;padding:8px';controls.append(button,status);document.body.append(controls);
function setup(outcome:number,side:number){const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;g.turn=8;g.phase='main';g.pending=null;g.players.forEach((p,i)=>{p.openingDrawReady=false;p.field=[mon('DRAGON_EGG',`left-${i}`),mon(outcomes[outcome].egg,`egg-${i}`),mon('DRAGON_EGG',`right-${i}`)];p.enchants=[];p.quests=[];p.traps=[];});fixtureState=g;view.render(g);view.setHandOpen(false);clearMonsterStates(root);return root.querySelector<HTMLElement>(`[data-uid="egg-${side}"]`)!;}
setup(0,0);const stop=startBoardLayout();window.addEventListener('pagehide',()=>{cancelHatches();stop();view.destroy();});
const rect=(n:Element)=>{const r=n.getBoundingClientRect();return[r.x,r.y,r.width,r.height];};
button.onclick=async()=>{
 button.disabled=true;const results:any[]=[];let failure='';
 try{await waitForDuel(root);
 for(const side of [0,1])for(let o=0;o<4;o++){
  status.textContent=` ${side===0?'自分':'相手'} / ${outcomes[o].name}`;const source=setup(o,side);await new Promise(requestAnimationFrame);const before=rect(source);let maxError=0,samples=0,mounts=0;
  const observer=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.classList.contains('hatch-summon'))mounts++;});observer.observe(document.body,{childList:true});
  let sampling=true;const sample=()=>{const host=document.querySelector('.hatch-summon');if(host){for(const face of host.querySelectorAll(':scope > .card')){const box=rect(face);box.forEach((v,i)=>maxError=Math.max(maxError,Math.abs(v-before[i])));}samples++;}if(sampling)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const result=await hatchSummon(source.dataset.uid!,mon(outcomes[o].id,`result-${side}`));sampling=false;observer.disconnect();
  if(!result)throw Error('Missing handoff');const after=rect(result);after.forEach((v,i)=>maxError=Math.max(maxError,Math.abs(v-before[i])));
  if(maxError>1||mounts!==1||samples<2||document.querySelector('.hatch-summon')||result.style.visibility==='hidden')throw Error(JSON.stringify({o,side,maxError,mounts,samples}));
  results.push({o,side,maxError,mounts,samples,before,after});
 }

 for(const side of [0,1]){
  const o=side?3:1,source=setup(o,side);await new Promise(requestAnimationFrame);const before=rect(source),prev=structuredClone(fixtureState),next=structuredClone(prev),egg=next.players[side].field[1],result=mon(outcomes[o].id,'batch-result');next.players[side].field[1]=result;(next.players[side].removed??=[]).push(egg);
  let mounts=0;const observer=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.classList.contains('hatch-summon'))mounts++;});observer.observe(document.body,{childList:true});
  await fixture.batch(prev,{state:next,events:[{type:'destroy',player:side as 0|1,uid:egg.uid,id:egg.id},{type:'summon',player:side as 0|1,uid:result.uid,id:result.id,hatchFrom:{uid:egg.uid,id:egg.id}}]});observer.disconnect();
  const final=root.querySelector<HTMLElement>('[data-uid="batch-result"]');if(!final||mounts!==1||root.querySelectorAll('.zone-mon .card').length!==6||rect(final).some((v,i)=>Math.abs(v-before[i])>1))throw Error('Controller handoff '+side);
  results.push({controller:true,side,mounts,sameSlot:true});
 }
 for(const reason of ['cancel','skip','resize']){const source=setup(0,0);const pending=hatchSummon(source.dataset.uid!,mon('D_BLACK','cancel-result'));await new Promise(requestAnimationFrame);if(reason==='cancel')cancelHatches();if(reason==='skip')setFxSkip(true);if(reason==='resize')window.dispatchEvent(new Event('resize'));await pending;setFxSkip(false);if(document.querySelector('.hatch-summon'))throw Error('Residue '+reason);results.push({reason,clean:true});}
 status.textContent=` PASS ${results.length} / カード寸法固定・両陣営・4種・中断`;
 }catch(e){failure=String(e);status.textContent=' FAIL '+failure;}finally{button.disabled=false;await fetch('/__hatch-evidence/runtime-'+innerWidth+'.json',{method:'POST',body:JSON.stringify({width:innerWidth,results,failure},null,2)});}
};
