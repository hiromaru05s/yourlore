import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/screens.css';
import '../styles/reading-board.css';
import '../styles/presentation.css';
import './shelfReturnLab.css';
import {createGame} from '../shared/engine';
import {DB} from '../shared/cards';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {moveOnBoard} from '../ui/boardMotion';
import {setLang} from '../i18n';
import {RETURN_STUDIES,previewClock} from './shelfReturnEffects';
import type {ReturnVariant} from './shelfReturnEffects';
import {GATE_STUDIES} from './gateReturnPresets';
import type {GateVariant} from './gateReturnPresets';
import {CONNECTED_STUDIES} from './connectedReturnPresets';
import type {ConnectedVariant} from './connectedReturnPresets';
import {PORTAL_STUDIES} from './portalReturnPresets';
import type {PortalVariant} from './portalReturnPresets';
type StudyVariant=ReturnVariant|GateVariant|ConnectedVariant|PortalVariant;
const portal=new URLSearchParams(location.search).has('portal');
const connected=new URLSearchParams(location.search).has('connected');
const rich=new URLSearchParams(location.search).has('gates');
const studies=portal?PORTAL_STUDIES:connected?CONNECTED_STUDIES:rich?GATE_STUDIES:RETURN_STUDIES;

declare global {interface Window {loreShelfPreview?:{
  play:(variant?:StudyVariant|'original')=>Promise<void>;sample:(variant:StudyVariant,ms:number)=>Promise<void>;seek:(ms:number)=>Promise<void>;cancel:()=>Promise<void>;
  side:(side:'me'|'opp')=>Promise<void>;count:(n:number)=>Promise<void>;ready:boolean;
};}}
if(import.meta.env.DEV)void mount();
async function mount(){
  setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  const root=document.getElementById('app')!,state=createGame({mode:'bot',seed:207,starting:0,p0:{id:'preview-me',name:'シーカー'},p1:{id:'preview-opp',name:'シーカー'}}).state;
  const noop=()=>{},view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  let side:'me'|'opp'='me',count=14,variant:StudyVariant|'original'=portal?'portal-echo':connected?'linked-silver':rich?'gate-astral':'gilded',abort=new AbortController(),running:Promise<void>=Promise.resolve(),generation=0,reel=0,destroyed=false;
  const catalog=Object.values(DB).filter(c=>c.t==='mon'&&c.atk&&c.def);
  const reset=()=>{for(const [s,p] of state.players.entries()){
    p.deck=[];p.hand=[];p.field=[];p.traps=[];p.enchants=[];
    p.discard=Array.from({length:count},(_,i)=>({...catalog[(i+s*3)%catalog.length],uid:`study-${s}-${i}`}));
    p.maxMana=8;p.mana=6;
  }view.render(state);};
  reset();const stop=startBoardLayout();
  const panel=document.createElement('section');panel.className='return-lab';panel.setAttribute('aria-label','シェルフ帰還アニメーションの比較');
  panel.innerHTML=`<header><div><span class="return-eyebrow">${portal?'LORE / BIBLION RETURN':connected?'LORE / MATERIAL CONTINUITY':rich?'LORE / TWIN GATE ATELIER':'LORE / MOTION STUDIES'}</span><h1>${portal?'消えて、デッキの左へ。5つの帰還':connected?'カードからつながる、5つの帰還':rich?'双環ゲート — 5つの深化':'シェルフ → デッキ'}</h1></div><span class="return-badge">LOCAL PREVIEW · 5 VARIATIONS</span></header>
    <nav class="return-studies" aria-label="演出パターン">${studies.map((s,i)=>`<button data-variant="${s.id}" style="--accent:${s.color}"><span>0${i+1} / ${s.en}</span><strong>${s.name}</strong></button>`).join('')}</nav>
    <p class="return-description"></p>
    <div class="return-controls"><button data-action="play" class="return-primary">▶ 再生</button><button data-action="pause">一時停止</button><button data-action="all">5案を連続再生</button><button data-action="original">${portal?'前回の1番と比較':connected?'前回の装飾案と比較':rich?'前回の2番と比較':'現行と比較'}</button>
    <label>速度 <select aria-label="再生速度"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label>
    <label>陣営 <select aria-label="陣営"><option value="me">自分</option><option value="opp">相手</option></select></label>
    <label>枚数 <select aria-label="カード枚数"><option>14</option><option>1</option><option>40</option></select></label></div>
    <div class="return-timeline"><span class="return-time">0.00 / 2.20 s</span><input type="range" min="0" max="2200" value="0" step="5" aria-label="再生位置"><span class="return-phase" aria-live="polite">準備中</span></div>`;
  document.body.append(panel);
  const scrub=panel.querySelector<HTMLInputElement>('input')!,time=panel.querySelector<HTMLElement>('.return-time')!,phase=panel.querySelector<HTMLElement>('.return-phase')!,pause=panel.querySelector<HTMLButtonElement>('[data-action=pause]')!;
  const study=()=>[...RETURN_STUDIES,...GATE_STUDIES,...CONNECTED_STUDIES,...PORTAL_STUDIES].find(s=>s.id===variant);
  const select=(id:StudyVariant|'original')=>{
    variant=id;
    if(id==='original')delete root.dataset.shelfReturnVariant;else root.dataset.shelfReturnVariant=id;
    panel.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.variant===id));});
    panel.querySelector('.return-description')!.textContent=study()?.description??'採用済みの演出：双光の呼応。消失 → デッキの左で再出現（2.06秒）';
    scrub.max=String(study()?.ms??2060);scrub.disabled=id==='original';pause.disabled=id==='original';
  };
  async function launch(sample?:number){
    const gen=++generation;abort.abort();await running;if(gen!==generation||destroyed)return;
    reset();abort=new AbortController();previewClock.time=sample??0;previewClock.paused=sample!==undefined;
    pause.textContent=previewClock.paused?'続きから再生':'一時停止';phase.textContent='準備中';
    const prefix=side==='me'?'pile-my':'pile-opp';
    running=(async()=>{
      const ok=await moveOnBoard({kind:'shuffle',source:document.getElementById(prefix+'Disc')!,target:document.getElementById(prefix+'Deck')!,count,signal:abort.signal});
      if(gen===generation){phase.textContent=ok?'帰還完了':'停止';if(ok&&variant==='original')scrub.value='2060';}
    })();
    await running;
  }
  const cancel=async()=>{reel++;generation++;abort.abort();await running;phase.textContent='停止';};
  const play=async(id?:StudyVariant|'original')=>{reel++;await cancel();if(id)select(id);await launch();};
  const seek=async(ms:number)=>{
    if(variant==='original')return;
    reel++;const at=Math.max(0,Math.min(study()!.ms,ms));
    if(previewClock.active){previewClock.paused=true;previewClock.time=at;pause.textContent='続きから再生';return;}
    void launch(at);
    // API resolves when the sampled scene exists, not when a paused motion finishes.
    for(let i=0;i<300&&!previewClock.active&&!destroyed;i++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));
  };
  panel.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>void play(b.dataset.variant as StudyVariant));
  panel.querySelector<HTMLButtonElement>('[data-action=play]')!.onclick=()=>void play();
  pause.onclick=()=>{if(!previewClock.active){void play();return;}previewClock.paused=!previewClock.paused;pause.textContent=previewClock.paused?'続きから再生':'一時停止';};
  panel.querySelector<HTMLButtonElement>('[data-action=original]')!.onclick=()=>void play(portal?'linked-silver':connected?'gate-astral':rich?'gates':'original');
  panel.querySelector<HTMLButtonElement>('[data-action=all]')!.onclick=async()=>{
    await cancel();const id=++reel;
    for(const s of studies){if(id!==reel||destroyed)break;select(s.id);await launch();if(id!==reel)break;await new Promise(r=>setTimeout(r,500));}
  };
  panel.querySelector<HTMLSelectElement>('[aria-label="再生速度"]')!.onchange=e=>{previewClock.speed=Number((e.target as HTMLSelectElement).value);};
  const setSide=async(s:'me'|'opp')=>{await cancel();side=s;panel.dataset.side=s;panel.querySelector<HTMLSelectElement>('[aria-label="陣営"]')!.value=s;await launch();};
  const setCount=async(n:number)=>{await cancel();count=Math.max(1,Math.min(40,n));await launch();};
  panel.querySelector<HTMLSelectElement>('[aria-label="陣営"]')!.onchange=e=>void setSide((e.target as HTMLSelectElement).value as 'me'|'opp');
  panel.querySelector<HTMLSelectElement>('[aria-label="カード枚数"]')!.onchange=e=>void setCount(Number((e.target as HTMLSelectElement).value));
  scrub.oninput=()=>void seek(Number(scrub.value));
  const cancelOnHide=()=>{if(document.hidden)void cancel();};
  const cancelOnResize=()=>{void cancel().then(()=>{if(!destroyed)reset();});};
  document.addEventListener('visibilitychange',cancelOnHide);window.addEventListener('resize',cancelOnResize);
  const clockFrame=()=>{if(destroyed)return;if(previewClock.active){scrub.value=String(previewClock.time);time.textContent=`${(previewClock.time/1000).toFixed(2)} / ${((study()?.ms??2060)/1000).toFixed(2)} s`;phase.textContent=root.dataset.shufflePhase??'準備中';}requestAnimationFrame(clockFrame);};clockFrame();
  const sample=async(id:StudyVariant,ms:number)=>{await cancel();select(id);await seek(ms);};
  window.loreShelfPreview={play,sample,seek,cancel,side:setSide,count:setCount,ready:false};
  select(portal?'portal-echo':connected?'linked-silver':rich?'gate-astral':'gilded');await waitForDuel(root);window.loreShelfPreview.ready=true;phase.textContent='再生できます';
  if(new URLSearchParams(location.search).has('autoplay'))void play();
  window.addEventListener('pagehide',()=>{destroyed=true;void cancel();stop();view.destroy();panel.remove();document.removeEventListener('visibilitychange',cancelOnHide);window.removeEventListener('resize',cancelOnResize);delete window.loreShelfPreview;},{once:true});
}
