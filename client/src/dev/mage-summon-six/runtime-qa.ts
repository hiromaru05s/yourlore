// Development-only real-board harness. Not a production Vite build entry.
import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../../ui/monster/runtime';
import {summonFromHand,ghostSummon,setFxSkip} from '../../ui/anim';
import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let ready=false,impacts=0;
function setup(id='FIRE_MASTER',side=0){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon('GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}


import {MAGE_CARDS} from '../../ui/mageSummon/selection';
import {cancelMageSummons} from '../../ui/mageSummon/runtime';
const panel=document.createElement('aside');panel.style.cssText='position:fixed;inset:8px 8px auto;z-index:300;background:#faf6ef;padding:12px;color:#241d2b';panel.innerHTML='<strong>炎術師・黒魔術師 ① 実召喚経路</strong><button id="run">再生</button><output>準備中</output>';document.body.append(panel);const status=panel.querySelector('output')!;
let firstImage='',reports:unknown[]=[];
async function run(id:string,side=0,path='direct',abortAfter=0){
 setFxSkip(false);const n=setup(id,side),controller=new AbortController(),before=impacts;let firstTime:string|undefined,visualTime:string|undefined,firstPainted=false,rawFrames=0,frames=0,raf=0,mounts=0;
 const observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node instanceof HTMLCanvasElement&&node.matches('.mage-summon')){mounts++;firstTime=node.dataset.time;visualTime=node.dataset.visualTime;firstImage=node.toDataURL();const pixels=node.getContext('2d')!.getImageData(0,0,node.width,node.height).data;firstPainted=pixels.some((v,i)=>i%4===3&&v>0);}});observer.observe(document.body,{childList:true});
 function monitor(){frames++;const host=document.querySelector<HTMLElement>('.mage-summon');const inHandoff=host&&Number(host.dataset.time)>=3500;const raw=path==='direct'?getComputedStyle(n).visibility!=='hidden':Array.from(document.querySelectorAll<HTMLElement>('.fx-field-ghost,.cast-reveal,.fx-card-flight')).some(el=>getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0');if(raw&&!inHandoff)rawFrames++;raf=requestAnimationFrame(monitor);}
 const card={...DB[id],uid:n.dataset.uid!};const promise=path==='hand'?summonFromHand(card,card.uid,side?'opp':'me'):path==='generated'?ghostSummon({...card,uid:'generated'},side?'opp':'me',3):playMonster(n,'summon',{signal:controller.signal,onImpact:()=>impacts++});
 const hiddenSynchronously=path==='direct'?n.style.visibility==='hidden':Array.from(document.querySelectorAll<HTMLElement>('.fx-field-ghost,.cast-reveal,.fx-card-flight')).every(el=>el.style.visibility==='hidden');
 raf=requestAnimationFrame(monitor);const timer=abortAfter?setTimeout(()=>controller.abort(),abortAfter):undefined;
 const result=await promise;cancelAnimationFrame(raf);clearTimeout(timer);observer.disconnect();const report={id,side,path,abortAfter,hiddenSynchronously,firstTime,visualTime,firstPainted,rawFrames,frames,mounts,result:result instanceof HTMLElement?'native-face':result,impacts:impacts-before,clean:!document.querySelector('.mage-summon'),restored:n.style.visibility!=='hidden'};reports.push(report);return report;
}
async function lifecycle(){const records:unknown[]=[];setFxSkip(false);setup();const nodes=Array.from(root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card'));nodes.forEach((n,i)=>n.dataset.cardId=MAGE_CARDS[i]);let hits=0;const promises=nodes.map(n=>playMonster(n,'summon',{onImpact:()=>hits++}));records.push({kind:'simultaneous',results:await Promise.all(promises),hits,clean:!document.querySelector('.mage-summon'),restored:nodes.every(n=>n.style.visibility!=='hidden')});
 let n=setup();hits=0;const first=playMonster(n,'summon',{onImpact:()=>hits++}),second=playMonster(n,'summon',{onImpact:()=>hits++});records.push({kind:'replacement',results:await Promise.all([first,second]),hits,clean:!document.querySelector('.mage-summon'),restored:n.style.visibility!=='hidden'});
 for(const kind of ['detach','resize','skip','root']){n=setup();const p=playMonster(n,'summon');if(kind==='detach')n.remove();else setTimeout(()=>{if(kind==='resize')window.dispatchEvent(new Event('resize'));else if(kind==='skip')setFxSkip(true);else clearMonsterStates(root);},350);records.push({kind,result:await p,clean:!document.querySelector('.mage-summon'),restored:n.style.visibility!=='hidden'});setFxSkip(false);}return records;}
panel.querySelector<HTMLButtonElement>('#run')!.onclick=async()=>{status.textContent='召喚中';status.textContent=JSON.stringify(await run('FIRE_MASTER',0,'generated'));};
(window as any).mageQA={get ready(){return ready;},run,lifecycle,get firstImage(){return firstImage;},get reports(){return reports;}};
setup();const stop=startBoardLayout();void waitForDuel(root).then(()=>{ready=true;status.textContent='準備完了';});window.addEventListener('pagehide',()=>{cancelMageSummons();stop();view.destroy();},{once:true});
