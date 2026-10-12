import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';
import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {attackStrike,setFxSkip} from '../../ui/anim';import {usesAssassinStrike,ASSASSIN_IDS} from '../../ui/assassinAttack/model';
import {playAssassinStrike,cancelAssassinStrikes} from '../../ui/assassinAttack/runtime';
import type {FieldMon} from '../../shared/types';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!,noop=()=>{},view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});startBoardLayout();
const card=document.querySelector<HTMLSelectElement>('#card')!,side=document.querySelector<HTMLSelectElement>('#side')!,status=document.querySelector('#status')!,result=document.querySelector('#result')!;
for(const id of [...ASSASSIN_IDS,'GHOST','GUILD_HALL','SOLDIER2'])card.add(new Option(DB[id].nameJa??id,id));
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const assert=(v:unknown,label:string)=>{if(!v)throw Error(label);};
async function until(fn:()=>boolean,timeout=4000){const start=performance.now();while(!fn()){if(performance.now()-start>timeout)throw Error('timeout');await wait(20);}}
function mon(id:string,uid:string):FieldMon{return{...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,guts:0};}
async function fixture(id=card.value,owner=Number(side.value)){
 setFxSkip(false);const g=createGame({mode:'bot',seed:47,starting:owner as 0|1,p0:{id:'a',name:'自分'},p1:{id:'b',name:'相手'}}).state;g.turn=4;g.phase='main';g.pending=null;g.opening=undefined;
 for(const [i,p] of g.players.entries()){p.hp=80;p.hand=[];p.enchants=[];p.quests=[];p.traps=[];p.field=i===owner?[mon('ELF','left'),mon(id,'attacker'),mon('SOLDIER2','right')]:[mon('SOLDIER2','front-0'),mon('GOLEM1','front-1'),mon('ELF','front-2')];}
 view.render(g);view.setHandOpen(false);await waitForDuel(root);await wait(60);return root.querySelector<HTMLElement>('[data-uid="attacker"]')!;
}
async function play(){const owner=Number(side.value);await fixture();status.textContent='再生中';await attackStrike('attacker',null,owner===0?'opp':'me',()=>{root.querySelector(owner===0?'#hp-opp':'#hp-me')!.textContent='76';},false);status.textContent='完了';}
(document.querySelector('#play') as HTMLButtonElement).onclick=()=>void play();
async function run(){
 const rows:object[]=[];for(const owner of [0,1])for(const id of [...ASSASSIN_IDS,'GHOST','GUILD_HALL','SOLDIER2']){
  status.textContent=`検証 ${rows.length} / ${id}`;const source=await fixture(id,owner),blockedBefore=source.dataset.monsterBlocked;let hits=0,saw=false;
  const scan=setInterval(()=>{saw||=!!document.querySelector('.assassin-strike');},10);
  await attackStrike('attacker',null,owner===0?'opp':'me',()=>hits++,false);clearInterval(scan);
  assert(hits===1,'single hit '+id);assert(saw===usesAssassinStrike(id),'family routing '+id);assert(source.style.visibility!=='hidden'&&!document.querySelector('.assassin-strike,.assassin-capture,.assassin-dom-fallback'),'cleanup '+id);assert(source.dataset.monsterBlocked===blockedBefore,'ready state preserved '+id);rows.push({owner,id,hits,selected:saw});
 }
 for(const mode of ['abort','skip','resize','detach','repeat','concurrent','fallback','monster-target']){
  status.textContent='lifecycle '+mode;const source=await fixture();const target=root.querySelector<HTMLElement>('#portraitOpp .avatar')!,abort=new AbortController();let hits=0;
  if(mode==='fallback')source.querySelector<HTMLElement>('.card-frame')!.style.backgroundImage='url("data:image/png;base64,AA==")';
  if(mode==='skip'){
   const p=attackStrike('attacker',null,'opp',()=>hits++,false);await until(()=>!!document.querySelector('.assassin-strike'));setFxSkip(true);await p;setFxSkip(false);
  }else if(mode==='concurrent'){
   const second=root.querySelector<HTMLElement>('[data-uid="left"]')!;
   await Promise.all([playAssassinStrike(source,target,{signal:abort.signal,side:0,onImpact:()=>hits++}),playAssassinStrike(second,target,{signal:abort.signal,side:0,onImpact:()=>hits++})]);assert(hits===2,'concurrent');
  }else{
   const destination=mode==='monster-target'?root.querySelector<HTMLElement>('[data-uid="front-1"]')!:target;
   const p=playAssassinStrike(source,destination,{signal:abort.signal,side:0,onImpact:()=>hits++});await until(()=>!!document.querySelector('.assassin-strike'));
   if(mode==='fallback')assert(!!document.querySelector('.assassin-dom-fallback'),'fallback used');
   if(mode==='abort')abort.abort();if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='detach')source.remove();
   await p;
   if(mode==='repeat'){await playAssassinStrike(source,target,{signal:abort.signal,side:0,onImpact:()=>hits++});assert(hits===2,'repeat');}
   if(['abort','resize','detach'].includes(mode))assert(hits===0,'cancelled impact');
   if(['fallback','monster-target'].includes(mode))assert(hits===1,mode+' hit');
  }
  assert(source.style.visibility!=='hidden','lifecycle restore '+mode);assert(!document.querySelector('.assassin-strike,.assassin-capture,.assassin-dom-fallback'),'lifecycle residue '+mode);rows.push({mode,hits,passed:true});
 }
 cancelAssassinStrikes();result.textContent=JSON.stringify({passed:true,cases:rows.length,rows},null,2);result.setAttribute('data-result','passed');status.textContent='全検証完了';await fixture();
}
(document.querySelector('#run') as HTMLButtonElement).onclick=()=>void run().catch(e=>{status.textContent=String(e);result.setAttribute('data-result','failed');});
void fixture().then(()=>{status.textContent='準備完了';if(new URLSearchParams(location.search).has('qa'))return run();}).catch(e=>{status.textContent=String(e);result.setAttribute('data-result','failed');});
