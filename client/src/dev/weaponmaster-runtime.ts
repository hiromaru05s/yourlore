// Development-only real-board harness. Not a production Vite build entry.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../ui/monster/runtime';
import {summonFromHand,ghostSummon} from '../ui/anim';
import {createGame} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let impacts=0;
function setup(id='SALLY_WEAPONMASTER',side=0){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon('GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}

const controls=document.createElement('aside');controls.style.cssText='position:fixed;z-index:999;left:8px;top:8px;background:#f7f2e9eF;color:#192534;padding:10px;border:1px solid #aaa;font:12px sans-serif;max-width:370px';
controls.innerHTML=`<b>サリィ④ 実盤面検証</b><div><button id="all">全経路を検証</button><button id="play">サリィを再生</button><button id="stop">中止</button><button id="still">④ 1.9秒</button><button id="dimensions">カード寸法測定</button></div><output id="status">準備中</output><pre id="report" style="max-height:150px;overflow:auto;white-space:pre-wrap"></pre>`;document.body.append(controls);
const status=controls.querySelector('output')!,report=controls.querySelector('pre')!;
const results:unknown[]=[];const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function run(id:string,side=0,path='direct'){
 const n=setup(id,side);await new Promise(requestAnimationFrame);const card={...DB[id],uid:n.dataset.uid!},before=n.getBoundingClientRect();let maximum=0,slate=0,hidden=false;
 const monitor=setInterval(()=>{maximum=Math.max(maximum,document.querySelectorAll('.weaponmaster-summon').length);slate=Math.max(slate,document.querySelectorAll('.slate-summon').length);hidden ||= n.style.visibility==='hidden';},16);
 let result:unknown;const oldImpact=impacts;
 try{if(path==='hand')result=await summonFromHand(card,card.uid,side?'opp':'me');else if(path==='generated')result=await ghostSummon({...card,uid:'generated'},side?'opp':'me',3);else result=await playMonster(n,'summon',{onImpact:()=>impacts++});}finally{clearInterval(monitor);}
 await pause(80);const after=n.getBoundingClientRect(),sally=id==='SALLY_WEAPONMASTER';const clean=document.querySelectorAll('.weaponmaster-summon,.slate-summon,.cast-reveal,.fx-card-flight').length===0;
 const item={id,side,path,ok:(path==='hand'||!!result)&&clean&&(sally?maximum===1&&slate===0:maximum===0&&slate===1)&&(path!=='direct'||(Math.abs(before.width-after.width)<.01&&Math.abs(before.height-after.height)<.01&&impacts-oldImpact===1)),maximum,slate,hidden,clean,impacts:impacts-oldImpact,before:[before.width,before.height],after:[after.width,after.height]};results.push(item);report.textContent=JSON.stringify(results,null,2);return item;
}
controls.querySelector<HTMLButtonElement>('#all')!.onclick=async()=>{results.length=0;for(const id of ['SALLY_WEAPONMASTER','APPRENTICE_ARMORER','VETERAN_ARMORER'])for(const side of [0,1])for(const path of id==='SALLY_WEAPONMASTER'?['direct','hand','generated']:['direct']){status.textContent=`検証中 ${id} ${side} ${path}`;await run(id,side,path);}status.textContent=results.every(x=>(x as {ok:boolean}).ok)?'PASS 全10経路':'FAIL';};
controls.querySelector<HTMLButtonElement>('#play')!.onclick=()=>{status.textContent='再生中';void run('SALLY_WEAPONMASTER',0,'hand').then(()=>status.textContent='再生終了');};
controls.querySelector<HTMLButtonElement>('#stop')!.onclick=()=>{clearMonsterStates(root);document.querySelector('#sally-still')?.remove();root.querySelectorAll<HTMLElement>('.card').forEach(n=>n.style.visibility='');};
controls.querySelector<HTMLButtonElement>('#still')!.onclick=async()=>{const n=setup();await new Promise(requestAnimationFrame);const [{Renderer},{captureCardSurface},{FRAME_BACK},{projectedPlacement}]=await Promise.all([import('../ui/weaponmasterSummon/renderer'),import('../ui/cardSurface'),import('../shared/cards'),import('../ui/boardProjection')]);const copy=n.cloneNode(true) as HTMLElement;copy.style.cssText='position:fixed;left:-4000px;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none';root.append(copy);const surface=await captureCardSurface(copy,FRAME_BACK,true,false);copy.remove();const canvas=document.createElement('canvas');canvas.id='sally-still';canvas.width=canvas.height=800;canvas.style.cssText='position:fixed;left:0;top:0;width:800px;height:800px;transform-origin:0 0;z-index:136;pointer-events:none';canvas.style.transform=projectedPlacement(n,180,281.25).translate(90-400,140.625-400).toString();const r=new Renderer();r.draw(canvas.getContext('2d')!,surface.face!,1900,400,400,180);document.body.append(canvas);n.style.visibility='hidden';r.dispose();status.textContent='④ 百兵の号令 / 1.9秒';};
controls.querySelector<HTMLButtonElement>('#dimensions')!.onclick=async()=>{const [{Renderer},{CARD_PADDING}]=await Promise.all([import('../ui/weaponmasterSummon/renderer'),import('../ui/cardSurface')]);const r=new Renderer(),face=document.createElement('canvas');face.width=1240;face.height=1802;const f=face.getContext('2d')!;f.fillStyle='#00ff00';f.fillRect(120,120,1000,1562.5);const canvas=document.createElement('canvas');canvas.width=canvas.height=800;const c=canvas.getContext('2d')!,checks=[];for(const ms of [0,3600]){r.draw(c,face,ms,400,400,180,false,true,'card');const pixels=c.getImageData(0,0,800,800).data;let x0=800,x1=0,y0=800,y1=0;for(let y=0;y<800;y++)for(let x=0;x<800;x++){const i=(y*800+x)*4;if(pixels[i+3]>128&&pixels[i+1]>200&&pixels[i]<30&&pixels[i+2]<30){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}checks.push({ms,width:x1-x0+1,height:y1-y0+1,ok:Math.abs(x1-x0+1-180)<2&&Math.abs(y1-y0+1-281.25)<2});}report.textContent=JSON.stringify({checks,shaderErrors:r.shaderErrors,padding:CARD_PADDING},null,2);status.textContent=checks.every(x=>x.ok)&&!r.shaderErrors.length?'PASS カード寸法':'FAIL 寸法';r.dispose();};
setup();startBoardLayout();void waitForDuel(root).then(()=>{status.textContent='準備完了';});
