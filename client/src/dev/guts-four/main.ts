/// <reference types="vite/client" />
import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/screens.css';
import '../../styles/duel-opening.css';
import '../../styles/presentation.css';
import '../../styles/reading-board.css';
import './style.css';
import {setLang,cardName} from '../../i18n';
import {cardEl} from '../../ui/cardView';
import {DB} from '../../shared/cards';
import type {FieldMon} from '../../shared/types';
import {studies,CONTACT,END,DURATION,phase,type Variant} from './catalog';
import {EnduranceRig,closeupStrike} from './rig';
import type {Board} from './board';

type Config={variant:Variant;side:number;concurrent:boolean;count:number;cardId:string;reduced:boolean;dark:boolean;enabled:boolean};
type Api={ready:boolean;seek:(t:number)=>void;play:()=>void;stop:()=>void;reset:()=>void;configure:(p:Partial<Config>)=>void;snapshot:()=>unknown;dispose:()=>void};
declare global {interface Window {__guts:Api;}}
const app=document.getElementById('app')!,query=new URLSearchParams(location.search),stage=query.has('stage');
setLang('ja');
document.title='LORE · 気合 / 耐久の四案';
const config:Config={variant:Math.max(0,Math.min(3,Number(query.get('v')??0))) as Variant,side:0,concurrent:false,count:2,cardId:'NWL3',reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,dark:false,enabled:true};
let board:Board|undefined,rigs:EnduranceRig[]=[],strikeContexts:CanvasRenderingContext2D[]=[],time=0,frame=0,playing=false,last=0,speed=1,loop=true,sequence=false,ready=false,disposed=false;
let iframe:HTMLIFrameElement|undefined,view='compare',childReady=false;
const pointStats:number[]=[];

function send(type:string,extra:Record<string,unknown>={}){if(childReady)iframe?.contentWindow?.postMessage({type,...extra},location.origin)}
function paint(t:number){
 time=Math.max(0,Math.min(DURATION,t));const start=performance.now();
 if(stage)board?.render(time,config.reduced,config.enabled);
 else {
  if(view==='compare'){rigs.forEach(r=>r.render(time,config.reduced,config.enabled));strikeContexts.forEach(c=>closeupStrike(c,time,config.reduced));}
  if(view==='board')send('guts:seek',{time});
  const slider=document.getElementById('seek') as HTMLInputElement;slider.value=String(Math.round(time));
  document.getElementById('clock')!.textContent=`${(time/1000).toFixed(2)} / 2.80 s`;
  document.getElementById('phase')!.textContent=phase(time);
  const consumed=time>=CONTACT&&config.enabled;
  document.querySelectorAll<HTMLElement>('[data-result]').forEach(n=>{n.textContent=consumed?`体力 1 · 気合 ${config.count-1}`:`気合 ${config.count} · 被弾前`;n.classList.toggle('resolved',consumed)});
  document.querySelectorAll<HTMLElement>('.beats span').forEach((n,i)=>n.classList.toggle('active',i===(time<CONTACT?0:time<1180?1:time<END?2:3)));
 }
 if(playing&&pointStats.length<1000)pointStats.push(performance.now()-start);
}
function pause(){playing=false;cancelAnimationFrame(frame);frame=0;if(!stage)document.getElementById('play')!.textContent='再生';}
function play(){if(!ready||disposed)return;pause();if(time>=DURATION)paint(0);playing=true;last=performance.now();if(!stage)document.getElementById('play')!.textContent='一時停止';const tick=(now:number)=>{if(!playing||disposed)return;const dt=Math.min(now-last,100);last=now;paint(time+dt*speed);if(time>=DURATION){if(sequence){config.variant=((config.variant+1)%4) as Variant;updateSelection();send('guts:configure',{config});paint(0);}else if(loop)paint(0);else{pause();return}}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)}
function seek(t:number){pause();paint(t)}
function reset(){pause();paint(0)}
function closeups(){
 rigs.forEach(r=>r.dispose());rigs=[];strikeContexts=[];
 for(const study of studies){
  const host=document.getElementById(`card-${study.id}`)!;host.replaceChildren();
  const m:FieldMon={...DB[config.cardId],uid:`closeup-${study.id}`,guts:config.count,passivesG:['guts'],dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0};
  const card=cardEl(m,{field:true,fullArt:true});host.append(card);rigs.push(new EnduranceRig(card,study.id,config.count));
  const strike=document.createElement('canvas');strike.width=600;strike.height=840;strike.className='closeup-strike';host.append(strike);const c=strike.getContext('2d')!;c.scale(2,2);strikeContexts.push(c);
 }
}
function updateSelection(){
 if(stage)return;
 document.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.variant)===config.variant);b.setAttribute('aria-pressed',String(Number(b.dataset.variant)===config.variant))});
 document.getElementById('board-title')!.textContent=`0${config.variant+1} ${studies[config.variant].name}`;
}
function configure(p:Partial<Config>){
 const rebuild=['variant','side','concurrent','count','cardId'].some(k=>k in p&&p[k as keyof Config]!==config[k as keyof Config]);
 Object.assign(config,p);config.variant=Math.max(0,Math.min(3,config.variant)) as Variant;config.count=Math.max(1,Math.min(3,config.count));
 document.body.classList.toggle('guts-dark',config.dark);
 if(stage){if(rebuild)board?.configure(config.variant,config.side,config.concurrent,config.count,config.cardId);paint(time);return;}
 if('cardId'in p||'count'in p)closeups();updateSelection();send('guts:configure',{config});paint(time);
}
function snapshot(){return {ready,time,playing,view,config,active:(board?.rigs??rigs).filter(r=>r.active).length,surfaces:document.querySelectorAll('.guts-surface').length,flights:document.querySelectorAll('.guts-flight').length,cards:(board?.rigs??rigs).map(r=>({hp:r.card.querySelector('.ad-def .seal-value')?.textContent,count:r.card.querySelector('[data-psv="guts"] b')?.textContent??'0',state:r.card.dataset.endurance,visible:getComputedStyle(r.card).visibility})),paintMs:pointStats.length?{samples:pointStats.length,max:Math.max(...pointStats),mean:pointStats.reduce((a,b)=>a+b,0)/pointStats.length}:null};}
const receive=(event:MessageEvent)=>{
 if(event.origin!==location.origin)return;
 if(stage){if(event.source!==parent)return;const d=event.data;if(d.type==='guts:seek')paint(d.time);if(d.type==='guts:configure')configure(d.config);if(d.type==='guts:reset')reset();}
 else if(event.source===iframe?.contentWindow&&event.data.type==='guts:ready'){childReady=true;send('guts:configure',{config});send('guts:seek',{time});document.getElementById('board-loading')?.remove()}
};
const resize=()=>{if(stage&&ready){board?.attach();paint(time)}};
function dispose(){disposed=true;pause();rigs.forEach(r=>r.dispose());rigs=[];board?.dispose();window.removeEventListener('message',receive);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);iframe?.remove();}
window.__guts={get ready(){return ready},seek,play,stop:()=>{pause();paint(DURATION)},reset,configure,snapshot,dispose};
window.addEventListener('message',receive);window.addEventListener('resize',resize);window.addEventListener('pagehide',dispose,{once:true});
const visibility=()=>{if(document.hidden)pause()};document.addEventListener('visibilitychange',visibility);

if(stage){
 document.body.classList.add('guts-stage');
 void import('./board').then(async({Board})=>{if(disposed)return;board=new Board(app);await board.ready;if(disposed)return;ready=true;paint(0);parent.postMessage({type:'guts:ready'},location.origin)});
}else{
 document.body.classList.add('guts-lab');
 app.innerHTML=`<div class="study-root">
 <header class="study-header"><div class="wordmark">LORE <span>/ MOTION STUDIES 04</span></div><div class="edition">気合 · 耐久 / 選定用プレビュー</div></header>
 <section class="intro"><div><p class="eyebrow">ENDURE THE IMPOSSIBLE</p><h1>最後の一点を、残す。</h1><p>致命傷を受け、気合をひとつ消費して体力1で生存する。<br>同じ瞬間を、四つの素材と動きで。</p></div><div class="intro-note"><span>01—04</span>実カードの面と枠から発生<br>同じ衝撃・同じ時間で比較</div></section>
 <section class="transport" aria-label="再生操作"><div class="transport-row"><button id="replay" class="primary">最初から再生</button><button id="play">再生</button><button id="reset">リセット</button><label>速度 <select id="speed"><option value="1">1×</option><option value=".5">0.5×</option><option value=".25">0.25×</option></select></label><label><input id="loop" type="checkbox" checked>ループ</label><button id="sequence">4案を順に見る</button><div class="views"><button id="compare" class="selected">4案比較</button><button id="board">実盤面</button></div></div>
 <div class="timeline"><output id="clock">0.00 / 2.80 s</output><input id="seek" aria-label="再生位置" type="range" min="0" max="2800" step="1" value="0"><span id="phase">衝撃前</span></div>
 <div class="beats"><span>攻撃</span><span>気合消費・生存</span><span>素材の収束</span><span>体力1で残る</span></div></section>
 <section class="options"><label>カード <select id="card">${['NWL3','INFKNIGHT','ELF'].map(id=>`<option value="${id}">${cardName({...DB[id],uid:id})}${id==='NWL3'?'':'（気合付与）'}</option>`).join('')}</select></label><label>気合 <select id="count"><option value="2">2 → 1</option><option value="1">1 → 0</option><option value="3">3 → 2</option></select></label><label>陣営 <select id="side"><option value="0">自分側</option><option value="1">相手側</option></select></label><label><input id="dark" type="checkbox">暗背景</label><label><input id="reduced" type="checkbox" ${config.reduced?'checked':''}>動き低減</label><label><input id="concurrent" type="checkbox">3体同時テスト</label></section>
 <main><div id="comparison" class="comparison">${studies.map(s=>`<article class="study" style="--study-color:${s.color}"><button class="study-heading" data-variant="${s.id}" aria-pressed="${s.id===0}"><span class="study-number">0${s.id+1}</span><span><small>${s.en}</small><h2>${s.name}</h2></span><span class="view-arrow">↗</span></button><div class="specimen"><div class="plinth"></div><div id="card-${s.id}" class="sample-card"></div><div class="result" data-result>気合 2 · 被弾前</div></div><div class="study-caption"><b>${s.material}</b><p>${s.description}</p><button data-focus="${s.id}">この案を実盤面で見る ↗</button></div></article>`).join('')}</div>
 <section id="board-pane" hidden><div class="board-bar"><h2 id="board-title"></h2><div>${studies.map(s=>`<button data-variant="${s.id}">0${s.id+1} ${s.name}</button>`).join('')}</div><p>気合を持つ中央のカードが対象 · 対戦盤面の表示を使用</p></div><div class="board-window"><p id="board-loading">盤面を準備しています…</p><iframe id="board-frame" title="気合の耐久・実盤面プレビュー"></iframe></div></section></main>
 <footer><p>比較版 · 通常対戦への適用前 / 無音</p><details><summary>制作根拠と確認範囲</summary><p>被弾の短いピーク、素材の抵抗、体力1への収束を共通時計で制御。粒子や全画面フラッシュは使わず、カードの絵柄と数値を残します。</p><p>参照：<a href="https://www.riotgames.com/en/artedu/visual-effects" target="_blank" rel="noreferrer">Riot Games · Visual Effects</a> / <a href="https://hearthstone.blizzard.com/en-us/news/22552047" target="_blank" rel="noreferrer">Hearthstone · The Art Behind THE SCIENCE</a> / LORE「銀紋の流墨」</p><p>実盤面表示を使う固定シナリオです。ゲームエンジンの気合発火には未接続。3体同時は負荷と重なりの比較テストです。</p></details></footer></div>`;
 closeups();updateSelection();iframe=document.getElementById('board-frame') as HTMLIFrameElement;
 const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
 function switchView(next:string){view=next;byId('comparison').hidden=next!=='compare';byId('board-pane').hidden=next!=='board';byId('compare').classList.toggle('selected',next==='compare');byId('board').classList.toggle('selected',next==='board');if(next==='board'&&!iframe!.getAttribute('src'))iframe!.src='/guts-four.html?stage=1';if(next==='compare'&&iframe!.getAttribute('src')){childReady=false;iframe!.removeAttribute('src');}paint(time)}
 byId('compare').onclick=()=>{sequence=false;byId('sequence').classList.remove('selected');switchView('compare')};byId('board').onclick=()=>switchView('board');
 document.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>{configure({variant:Number(b.dataset.variant) as Variant});if(view==='board'){paint(0);play()}});
 document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.onclick=()=>{configure({variant:Number(b.dataset.focus) as Variant});switchView('board');paint(0);play()});
 byId('replay').onclick=()=>{paint(0);play()};byId('play').onclick=()=>playing?pause():play();byId('reset').onclick=reset;
 byId<HTMLInputElement>('seek').oninput=e=>seek(Number((e.target as HTMLInputElement).value));
 byId<HTMLSelectElement>('speed').onchange=e=>{speed=Number((e.target as HTMLSelectElement).value)};
 byId<HTMLInputElement>('loop').onchange=e=>{loop=(e.target as HTMLInputElement).checked};
 byId('sequence').onclick=()=>{sequence=!sequence;byId('sequence').classList.toggle('selected',sequence);if(sequence){switchView('board');configure({variant:0});paint(0);play()}};
 byId<HTMLSelectElement>('card').onchange=e=>configure({cardId:(e.target as HTMLSelectElement).value});
 byId<HTMLSelectElement>('count').onchange=e=>configure({count:Number((e.target as HTMLSelectElement).value)});
 byId<HTMLSelectElement>('side').onchange=e=>configure({side:Number((e.target as HTMLSelectElement).value)});
 for(const key of ['dark','reduced','concurrent'] as const)byId<HTMLInputElement>(key).onchange=e=>{configure({[key]:(e.target as HTMLInputElement).checked});if(key==='concurrent')switchView('board')};
 void Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))).then(()=>{if(disposed)return;ready=true;paint(0);if(!config.reduced)play()});
}
