import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/passives.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {createGame,reduce} from '../shared/engine';import {DB} from '../shared/cards';import type {Action,GameState,Side} from '../shared/types';import {startBoardLayout} from '../ui/layout';import {setLang} from '../i18n';import {setMyAvatar,setOppAvatar} from '../ui/boardView';import {waitForDuel} from '../ui/duelReadiness';import * as A from '../ui/anim';import {closeOverlay} from '../ui/modal';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
class Preview extends BaseController{
 submit(a:Action){this.applyResult(reduce(this.state,a));}
 show(g:GameState){this.fastForward();this.state=g;this.view.render(g);}
 async run(a:Action){this.submit(a);await (this as unknown as {queue:Promise<void>}).queue;(this as unknown as {stopTimer():void}).stopTimer();}
 get current(){return this.state;}
}
const c=new Preview(document.getElementById('app')!,0,{onHome(){},onRematch(){}});const stop=startBoardLayout();
function fixture(side:Side=0,cost=2,blocked=false){
 const g=createGame({mode:'bot',seed:89,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;Object.assign(g,{turn:3,cur:side,phase:'main',pending:null});
 for(const [i,p]of g.players.entries())Object.assign(p,{openingDrawReady:false,mana:7,maxMana:12,hp:30,shield:0,dew:0,brand:0,traps:[],quests:[],enchants:[],hand:[],removed:[],field:['INFKNIGHT','M4'].map((id,n)=>({...DB[id],uid:`standing-${i}-${n}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0})),discard:[],supply:[{...DB.QUICK_REBIRTH,uid:`market-${i}`}]});
 g.players[side].discard=[{...DB.ELF,cost,uid:'chosen'},{...DB.M4,uid:'top-grave'}];g.players[side].summonLockUntil=blocked?10:undefined;return g;
}
const panel=document.createElement('div');panel.style.cssText='position:fixed;z-index:999;top:0;left:0;right:0;background:#f3efe7;padding:5px;font:12px sans-serif;display:flex;gap:8px;align-items:center';panel.innerHTML='<button id="reset">購入前へ</button><button id="purchase">購入のみ</button><button id="normal">購入→選択→復活</button><button id="qa">通常経路QA</button><output role="status">準備中</output>';document.body.append(panel);
const output=panel.querySelector('output')!;const errors:string[]=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
async function reset(){c.show(fixture());await waitForDuel(document.getElementById('app')!);output.textContent='マーケットから購入できます';}
panel.querySelector<HTMLButtonElement>('#purchase')!.onclick=()=>void c.run({type:'buySupply',i:0});
const checks:unknown[]=[];
async function run(side:Side=0,mode='normal',cost=2,blocked=false){
 c.show(fixture(side,cost,blocked));await waitForDuel(document.getElementById('app')!);await c.run({type:'buySupply',i:0});closeOverlay();
 const nativeMedia=window.matchMedia;if(mode==='reduced')window.matchMedia=(q:string)=>q.includes('prefers-reduced-motion')?{...nativeMedia(q),matches:true} as MediaQueryList:nativeMedia(q);
 const frames:{fx:boolean;void:boolean;visible:boolean;time:number}[]=[];let running=true,interrupted=false;
 const poll=()=>{if(!running)return;const fx=document.querySelector<HTMLElement>('[data-rebirth-fx]'),coat=document.querySelector('[data-dimension-void-fx]'),face=document.querySelector<HTMLElement>('.zone-mon [data-uid="chosen"]');frames.push({fx:!!fx,void:!!coat,visible:!!face&&getComputedStyle(face).visibility!=='hidden',time:Number(fx?.dataset.time??0)});
 if(fx&&!interrupted&&mode!=='normal'&&Number(fx.dataset.time)>450){interrupted=true;if(mode==='skip')A.setFxSkip(true);if(mode==='resize')window.dispatchEvent(new Event('resize'));}requestAnimationFrame(poll);};requestAnimationFrame(poll);
 await c.run({type:'pick',uid:'chosen'});running=false;window.matchMedia=nativeMedia;A.setFxSkip(false);
 const left=document.querySelectorAll('[data-rebirth-fx],[data-rebirth-capture],[data-dimension-void-fx]').length,success=cost<=7&&!blocked,p=c.current.players[side];
 if(left||p.field.some(x=>x.uid==='chosen')!==success||success&&!p.field.find(x=>x.uid==='chosen')?.passive?.includes('void'))throw Error('state/cleanup failed');
 if(success&&mode==='normal'&&(!frames.some(f=>f.fx)||!frames.some(f=>f.void)||frames.some(f=>f.fx&&f.void)))throw Error('arrival/coat sequencing failed');
 if(success&&mode==='reduced'&&(frames.some(f=>f.fx)||!frames.some(f=>f.void)))throw Error('reduced path failed');
 if(!success&&frames.some(f=>f.fx||f.void))throw Error('invalid summon animated');
 checks.push({side,mode,cost,blocked,frames:frames.length,arrival:frames.filter(f=>f.fx).length,coat:frames.filter(f=>f.void).length,left});return frames;
}
panel.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>void reset();panel.querySelector<HTMLButtonElement>('#normal')!.onclick=()=>void run().then(()=>output.textContent='PASS 通常経路').catch(e=>output.textContent=String(e));
panel.querySelector<HTMLButtonElement>('#qa')!.onclick=async()=>{try{output.textContent='QA実行中';checks.length=0;for(const side of [0,1] as Side[])await run(side);for(const mode of ['skip','resize','reduced'])await run(0,mode);await run(0,'normal',8);await run(1,'normal',2,true);if(errors.length)throw Error(errors.join('\n'));output.textContent='PASS '+JSON.stringify({checks,errors});}catch(e){output.textContent='FAIL '+String(e);}};
Object.assign(window,{rebirthRuntimeQA:{checks,errors}});window.addEventListener('pagehide',()=>{c.destroy();stop();},{once:true});void reset();
