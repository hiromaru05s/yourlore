import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/screens.css';
import '../../styles/reading-board.css';
import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame} from '../../shared/engine';
import {DB,STARTERS,FRAME_BACK} from '../../shared/cards';
import {startBoardLayout} from '../../ui/layout';
import {captureCardSurface} from '../../ui/cardSurface';
import {cardEl} from '../../ui/cardView';
import {setLang} from '../../i18n';
import type {Scene} from './catalog';
import {arrange,applyStage,describeStage} from './choreography';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'b0',name:'YOU'},p1:{id:'b1',name:'OPPONENT'}}).state;
g.turn=3;g.pending=null;g.opening=undefined;
const noop=()=>{};
const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
// Fixture snapshots must not launch the production wall-clock stat particles.
(view as unknown as {statRise:{dispose():void}}).statRise.dispose();
const stop=startBoardLayout();
let chosen='WORLD_TREE',side=0,scene:Scene,step=-1,baseline:any=null,anchors:any=null,arrival:HTMLCanvasElement|undefined,secondary:HTMLCanvasElement|undefined;
const cache=new Map<string,HTMLCanvasElement>();
const card=(id:string,uid:string)=>({...((DB as any)[id]||(STARTERS as any)[id]||DB.ELF),uid,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0});
function reset(){if(baseline)Object.assign(g,structuredClone(baseline));step=-1;anchors=null;render();}
function render(){view.render(g);view.setHandOpen(false);document.querySelector('.help-callout')?.remove();}
function destination(selector:string){const r=document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};}
function motionUid(){return scene?.id==='A016'?`focus-${1-side}`:`focus-${side}`;}
function node(uid:string){if(scene?.id==='A146'&&uid===motionUid())return document.querySelector<HTMLElement>('#fixedMarket .card');return document.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`);}
function hero(owner:number){const n=document.querySelector<HTMLElement>(owner===0?'#portraitMe .pt-ring':'#portraitOpp .pt-ring')!;const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.65,w:r.width*.45,h:r.height*.45};}
function rect(uid:string){const n=node(uid);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};}
function outcome(p:number){const next=p<.38?0:p<.72?1:p<.93?2:3;if(next===step)return;step=next;Object.assign(g,structuredClone(baseline));applyStage(g,scene,chosen,side,next);render();}
async function texture(id:string){if(cache.has(id))return cache.get(id)!;const c=cardEl(card(id,'texture'));c.style.cssText='position:fixed;left:-3000px;top:0;width:160px;height:250px;--cw:160px;--ch:250px;transform:none';document.body.append(c);await document.fonts.ready;const s=await captureCardSurface(c,FRAME_BACK,true,false);c.remove();const src=s.face!;const result=document.createElement('canvas');result.width=320;result.height=500;result.getContext('2d')!.drawImage(src,1536*.12,1536*.12,1536,2400,0,0,320,500);cache.set(id,result);if(cache.size>20)cache.delete(cache.keys().next().value!);return result;}
const api={ready:true,g,async prepare(s:Scene,id:string,owner:number){scene=s;chosen=id;side=owner;arrange(g,s,id,side);baseline=structuredClone(g);reset();const initial=g.players[scene.id==='A016'?1-side:side].field.find(c=>c.uid===motionUid())?.id||id;const source=await texture(initial);const second=g.players[side].field.find(c=>c.uid===`ally-${side}`)?.id;secondary=second?await texture(second):undefined;applyStage(g,s,id,side,2);const arrived=g.players[side].field.find(c=>c.uid===`focus-${side}`)?.id;arrival=arrived&&arrived!==initial?await texture(arrived):undefined;reset();return source;},reset,render,outcome,get arrival(){return arrival;},get secondary(){return secondary;},hideSecondary(hidden:boolean){const n=node(`ally-${side}`);if(n)n.style.visibility=hidden?'hidden':'';},get phase(){return (g as any).previewB?.phase||describeStage(scene,chosen,step);},name(id:string){return ((DB as any)[id]||(STARTERS as any)[id])?.nameJa||id;},hide(hidden:boolean){const n=node(motionUid());if(n)n.style.visibility=hidden?'hidden':'';},sample(){if(anchors)return anchors;const source=rect(motionUid())||rect(`ally-${side}`)||hero(side);return anchors={source,hero:hero(side),enemyHero:hero(1-side),shelf:destination(side===0?'#pile-myDisc':'#pile-oppDisc'),target:rect(`ally-${side}`)||hero(side),enemy:rect(`focus-${1-side}`)||rect(`ally-${1-side}`)!,hand:destination((scene.id==='A016'?1-side:side)===0?'#hand':'#oppHand')};},dark(value:boolean){document.documentElement.style.filter=value?'brightness(.57) contrast(1.12)':'';},dispose(){stop();view.destroy();cache.clear();}};
(window as any).seriesBBoard=api;window.addEventListener('pagehide',()=>api.dispose(),{once:true});
