import {cardEl} from '../../ui/cardView';
// Development-only real-board harness. Not a production Vite build entry.
import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../../ui/monster/runtime';
import {summonFromHand,ghostSummon} from '../../ui/anim';
import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let ready=false,impacts=0;
function setup(id='POISON_MASTER',side=0){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon('GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}

import {IDS as cards,names as nameMap} from './catalog';
const names=cards.map(id=>nameMap[id]);
import {cancelPoisonSummons} from '../../ui/poisonSummon/runtime';
const panel=document.createElement('aside');panel.style.cssText='position:fixed;inset:8px 8px auto;z-index:300;background:#faf6ef;color:#251b2b;padding:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
panel.innerHTML=`<strong>毒・菌 選択案 実経路確認</strong><select aria-label="対象">${cards.map((id,i)=>`<option value="${id}">${names[i]}</option>`).join('')}</select><select aria-label="陣営"><option value="0">自分側</option><option value="1">相手側</option></select><select aria-label="経路"><option value="generated">実召喚イベント</option><option value="hand">手札から</option><option value="direct">盤面上</option></select><button id="run">召喚</button><button id="cancel">中断</button><button id="tests">自動検証・保存</button><button id="lifecycle">同時・中断検証</button><output role="status">準備中</output>`;document.body.append(panel);
const status=panel.querySelector('output')!,button=panel.querySelector<HTMLButtonElement>('#run')!;
const save=async(name:string,body:Blob|string)=>{const r=await fetch('/__poison-evidence/'+name,{method:'POST',body});if(!r.ok)throw Error('save '+r.status);};
let sampleFrames:HTMLCanvasElement[]=[];
async function run(id:string,side=0,path='direct',abortAfter=0){
 const n=setup(id,side),controller=new AbortController(),before=impacts;let observedVariant:string|undefined,firstTime:string|undefined,firstPainted=false,rawFrames=0,frames=0,raf=0,mounts=0;
 const observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node instanceof HTMLElement&&node.matches('.poison-summon')){mounts++;firstTime=node.dataset.time;const canvas=node.querySelector('canvas')!;observedVariant=node.dataset.variant;const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;firstPainted=pixels.some((v,i)=>i%4===3&&v>0);}});observer.observe(document.body,{childList:true});
 function monitor(){frames++;const raw=path==='direct'?getComputedStyle(n).visibility!=='hidden':Array.from(document.querySelectorAll<HTMLElement>('.fx-field-ghost,.cast-reveal,.fx-card-flight')).some(el=>getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0');if(raw)rawFrames++;raf=requestAnimationFrame(monitor);}
 const card={...DB[id],uid:n.dataset.uid!};
 const promise=path==='hand'?summonFromHand(card,card.uid,side?'opp':'me'):path==='generated'?ghostSummon({...card,uid:'generated'},side?'opp':'me',3):playMonster(n,'summon',{signal:controller.signal,onImpact:()=>impacts++});
 const hiddenSynchronously=path==='direct'?n.style.visibility==='hidden':Array.from(document.querySelectorAll<HTMLElement>('.fx-field-ghost,.cast-reveal,.fx-card-flight')).every(el=>el.style.visibility==='hidden');
 raf=requestAnimationFrame(monitor);const timer=abortAfter?setTimeout(()=>controller.abort(),abortAfter):undefined;
 const samples=[0,500,1300,2200].map(delay=>setTimeout(()=>{const el=document.querySelector<HTMLCanvasElement>('.poison-summon canvas');if(el){const c=document.createElement('canvas');c.width=el.width;c.height=el.height;c.getContext('2d')!.drawImage(el,0,0);sampleFrames.push(c);}},delay));
 const result=await promise;cancelAnimationFrame(raf);clearTimeout(timer);samples.forEach(clearTimeout);observer.disconnect();
 const report={id,side,path,abortAfter,hiddenSynchronously,observedVariant,firstTime,firstPainted,rawFrames,frames,mounts,result:result instanceof HTMLElement?'native-face':result,impacts:impacts-before,clean:!document.querySelector('.poison-summon'),restored:n.style.visibility!== 'hidden'};
 return report;
}
button.onclick=async()=>{if(!ready)return;button.disabled=true;sampleFrames=[];try{const id=panel.querySelectorAll('select')[0].value,side=Number(panel.querySelectorAll('select')[1].value),path=panel.querySelectorAll('select')[2].value;status.textContent='召喚中';const result=await run(id,side,path);status.textContent=JSON.stringify(result);}finally{button.disabled=false;}};
panel.querySelector<HTMLButtonElement>('#cancel')!.onclick=()=>cancelPoisonSummons();
panel.querySelector<HTMLButtonElement>('#tests')!.onclick=async()=>{
 if(!ready)return;button.disabled=true;const tests=panel.querySelector<HTMLButtonElement>('#tests')!;tests.disabled=true;const results:unknown[]=[];sampleFrames=[];
 try{
 for(const path of ['direct','hand','generated'])for(const side of [0,1])for(const id of cards){status.textContent=`${path} / ${side} / ${id}`;results.push(await run(id,side,path));}
 results.push(await run('POISON_MASTER',0,'direct',1));results.push(await run('RUST_SHROOM',1,'direct',650));
 await save('runtime-report.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
 const sheet=document.createElement('canvas');sheet.width=960;sheet.height=Math.ceil(sampleFrames.length/4)*180;const x=sheet.getContext('2d')!;x.fillStyle='#f1ede8';x.fillRect(0,0,sheet.width,sheet.height);sampleFrames.forEach((f,i)=>x.drawImage(f,i%4*240,Math.floor(i/4)*180,240,180));await save('runtime-frames.png',await new Promise<Blob>(r=>sheet.toBlob(b=>r(b!))));status.textContent=`完了: ${results.length} ケース。runtime-report.json 保存済み`;
 }catch(error){status.textContent='失敗: '+String(error);}finally{button.disabled=false;tests.disabled=false;}
};

panel.querySelector<HTMLButtonElement>('#lifecycle')!.onclick=async()=>{
 const records:unknown[]=[];status.textContent='同時・中断検証中';
 try{
  setup('POISON_MASTER');const nodes=Array.from(root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card'));nodes.forEach((n,i)=>{const fresh=cardEl({...DB[cards[i]],uid:n.dataset.uid!},{field:true});n.replaceWith(fresh);nodes[i]=fresh;});let hits=0;
  const promises=nodes.map(n=>playMonster(n,'summon',{onImpact:()=>hits++}));const simultaneous=await Promise.all(promises);records.push({kind:'simultaneous',results:simultaneous,hits,clean:!document.querySelector('.poison-summon'),restored:nodes.every(n=>n.style.visibility!=='hidden')});
  let n=setup('POISON_MASTER');hits=0;const first=playMonster(n,'summon',{onImpact:()=>hits++}),second=playMonster(n,'summon',{onImpact:()=>hits++});records.push({kind:'replaced-before-capture',results:await Promise.all([first,second]),hits,clean:!document.querySelector('.poison-summon'),restored:n.style.visibility!=='hidden'});
  n=setup('POISON_MASTER');const detached=playMonster(n,'summon');n.remove();records.push({kind:'detached',result:await detached,clean:!document.querySelector('.poison-summon')});
  n=setup('POISON_MASTER');const interrupted=playMonster(n,'summon');setTimeout(()=>window.dispatchEvent(new Event('resize')),450);records.push({kind:'resize',result:await interrupted,clean:!document.querySelector('.poison-summon'),restored:n.style.visibility!=='hidden'});
  await save('runtime-lifecycle.json',JSON.stringify(records,null,2));status.textContent='同時・中断検証 完了';
 }catch(error){status.textContent=String(error);}
};
setup();const stop=startBoardLayout();void waitForDuel(root).then(()=>{ready=true;status.textContent='準備完了';});window.addEventListener('pagehide',()=>{cancelPoisonSummons();stop();view.destroy();},{once:true});
