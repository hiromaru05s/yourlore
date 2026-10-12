import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/passives.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB} from '../../shared/cards';
import type {Action,GameState} from '../../shared/types';
import {startBoardLayout} from '../../ui/layout';
import {setLang} from '../../i18n';
import {waitForDuel} from '../../ui/duelReadiness';
import {playMonster} from '../../ui/monster/runtime';
import {Actor} from '../../ui/monster/actor';
import {DualReadySurface} from '../../ui/monster/dualReady';
import {ReadyStudy} from './effect';
setLang('ja');
const root=document.querySelector<HTMLElement>('#app')!;
const panel=document.createElement('aside');panel.style.cssText='position:fixed;top:4px;left:4px;z-index:2147483647;background:#fffffff0;color:#201e18;font:12px sans-serif;padding:8px;max-width:95vw';
panel.innerHTML='<b>二刀流④・実装確認</b> <button id="reset">リセット</button> <button id="hit">攻撃</button> <button id="test">自動検証</button> <a href="?reduced">動きを減らす</a><output id="result" style="display:block;white-space:pre-wrap"></output>';document.body.append(panel);
class Fixture extends BaseController {
 submit(action:Action){void this.act(action);}
 async act(action:Action){this.applyResult(reduce(this.state,action));await (this as unknown as {queue:Promise<void>}).queue;report();}
 reset(){this.state=fresh();this.view.render(this.state);report();}
 get game(){return this.state!;}
 draw(g:GameState){this.state=g;this.view.render(g);}
}
const ctl=new Fixture(root,0,{onHome(){},onRematch(){}});
function fresh(){const g=createGame({mode:'bot',seed:741,starting:0,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;g.phase='main';for(const [side,p]of g.players.entries()){p.openingDrawReady=false;p.mana=10;p.maxMana=10;p.hp=200;p.enchants=[];p.quests=[];p.traps=[];p.hand=[];p.field=side?[]:['DRAGON_RIDER','ANTIQUE_DK','ASSASSIN4','M4'].map((id,i)=>({...DB[id],uid:'dual-runtime-'+i,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,attacksUsed:0}));}return g;}
const output=panel.querySelector<HTMLOutputElement>('output')!;
const snapshot=()=>({cards:ctl.game.players[0].field.map(m=>({id:m.id,used:m.attacksUsed,exhausted:m.exhausted})),gold:root.querySelectorAll('[data-monster-variant="dual-04"]').length,normal:root.querySelectorAll('[data-monster-kind="ready"][data-monster-variant="C"]').length,blocked:root.querySelectorAll('[data-monster-kind="blocked"]').length});
function report(){requestAnimationFrame(()=>output.textContent=JSON.stringify(snapshot()));}
const settle=()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
const assert=(v:unknown,s:string)=>{if(!v)throw Error(s);};
async function test(){const checks:string[]=[];try{
 ctl.reset();await waitForDuel(root);await settle();assert(snapshot().gold===3&&snapshot().normal===1,'3 dual + normal');checks.push('3 simultaneous dual + normal');
 const n=root.querySelector<HTMLElement>('[data-uid="dual-runtime-0"]')!;
 const refHost=document.createElement('div');refHost.style.cssText='position:fixed;left:-4000px';document.body.append(refHost);
 const study=new ReadyStudy(n,refHost);study.variant=3;const actor=new Actor(n,refHost),surface=new DualReadySurface(actor);
 const b=n.getBoundingClientRect(),r={x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height};
 for(const side of [-1,1])for(const reduced of [false,true])for(const ms of [0,504,1232,2200,2800]){study.side=side;study.paint(ms,reduced);actor.paint('ready','C',0,r,r,reduced);surface.paint(r,ms,reduced,side);const a=study.canvas.getContext('2d')!.getImageData(0,0,study.canvas.width,study.canvas.height).data,b=surface.canvas.getContext('2d')!.getImageData(0,0,surface.canvas.width,surface.canvas.height).data;assert(a.length===b.length&&a.every((v,i)=>v===b[i]),'selected surface parity');}
 study.dispose();actor.dispose();refHost.remove();ctl.reset();await settle();checks.push('20 exact surface comparisons with selected 04 (both directions/reduced)');
 const source=root.querySelector<HTMLElement>('[data-uid="dual-runtime-0"]')!,abort=new AbortController();const action=playMonster(source,'attack',{exhaust:false,signal:abort.signal});abort.abort();assert(await action===false,'cancel');await settle();assert(snapshot().gold===3&&ctl.game.players[0].field[0].attacksUsed===0,'cancel keeps ready');checks.push('cancel restores readiness without spending');
 await ctl.act({type:'attack',uid:'dual-runtime-0'});await settle();assert(snapshot().gold===2&&snapshot().normal===2&&ctl.game.players[0].field[0].attacksUsed===1,'first attack');checks.push('real controller first attack → normal');
 await ctl.act({type:'attack',uid:'dual-runtime-0'});await settle();assert(snapshot().gold===2&&snapshot().blocked>=1&&ctl.game.players[0].field[0].exhausted,'second attack');checks.push('real controller second attack → exhausted');
 const pending=structuredClone(fresh());pending.pending={kind:'oppMon',reason:'attack',hint:'',hintJa:'',allowCancel:true,data:{attackerUid:'dual-runtime-0'}} as GameState['pending'];ctl.draw(pending);await settle();assert(snapshot().gold===0,'target selection');checks.push('target selection hides ready');
 const opp=fresh();opp.cur=1;ctl.draw(opp);await settle();assert(snapshot().gold===0,'opponent turn');checks.push('opponent turn hides ready');
 ctl.reset();await settle();const moved=root.querySelector<HTMLElement>('[data-uid="dual-runtime-0"]')!;moved.classList.add('is-dragging');await settle();assert(root.querySelector<HTMLElement>('[data-card-id="DRAGON_RIDER"].duet-card')?.style.display==='none','drag hide');moved.classList.remove('is-dragging');await settle();checks.push('drag hides one complete actor');
 const gold=root.querySelector<HTMLElement>('[data-monster-variant="dual-04"]')!,canvas=gold.querySelector<HTMLCanvasElement>('.dual-ready-surface')!;assert(Math.abs(parseFloat(canvas.style.width)/parseFloat(gold.style.width)-1.44)<.001,'density alignment');checks.push('2x raster surface stays attached');
 ctl.destroy();assert(!root.querySelector('.monster-animation-layer'),'cleanup');checks.push('controller disposal releases layers');output.textContent=JSON.stringify({status:'passed',checks,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});
 }catch(e){output.textContent=JSON.stringify({status:'failed',checks,error:String(e)});}}
panel.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>ctl.reset();panel.querySelector<HTMLButtonElement>('#hit')!.onclick=()=>void ctl.act({type:'attack',uid:'dual-runtime-0'});panel.querySelector<HTMLButtonElement>('#test')!.onclick=()=>void test();
ctl.reset();startBoardLayout();void waitForDuel(root).then(report);
