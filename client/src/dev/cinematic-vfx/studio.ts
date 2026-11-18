import './studio.css';
import {DURATIONS,type Kind} from './direction';
type API={set(o:object):Promise<void>;play():void;pause():void;replay():void;seek(t:number):void;info():{ready:boolean;kind:Kind;time:number;playing:boolean}};
type Native={run(o:object):Promise<void>;cancel():Promise<void>;info():{ready:boolean}};
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const trial=$<HTMLIFrameElement>('study-frame'),native=$<HTMLIFrameElement>('current-frame');
const api=()=>((trial.contentWindow as unknown as {vfx:API}).vfx);
const adopted=()=>((native.contentWindow as unknown as {currentVfx:Native}).currentVfx);
const descriptions:Record<Kind,[string,string,string]>={draw:['01 / DRAW','マナ光のドロー','カードのめくれと軌跡に、広がる光と余韻を。'],summon:['02 / SUMMON','マナによる具現化','マナが輪郭と表面を形作り、裏面全体が盤面に着地。'],attack:['03 / ATTACK','基本攻撃','引き・踏み込み・接触・戻り。属性を持たない共通動作。'],spell:['04 / CAST','基本魔法発動','カードを提示し、発光して墓地へ。固有の効果演出は含みません。']};
let current:Kind='summon',active:'current'|'study'='current',ready=false,playing=false,preparing=false,started=false,runId=0,ended=false,timer=0;
const options=()=>({kind:current,side:Number($<HTMLSelectElement>('side').value),spell:$<HTMLSelectElement>('spell-card').value});
function caption(){const d=descriptions[current];$('eyebrow').textContent=d[0];$('effect-title').textContent=active==='current'?'現行の'+({draw:'ドロー',summon:'召喚',attack:'攻撃',spell:'魔法発動'}[current]):d[1];$('description').textContent=active==='current'?'採用中のアニメーションを、そのまま再生。':d[2];$('version-badge').textContent=active==='current'?'A · 現行':'B · 試作';$('viewport').dataset.active=active;
 document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===current)));
 $('spell-label').hidden=current!=='spell';const manualStudy=$<HTMLSelectElement>('compare').value==='study';for(const id of['mode','speed','seek','sound'])($<HTMLInputElement>(id)).disabled=!manualStudy;$('pause').textContent=active==='current'?(playing?'停止':'再生'):(playing?'一時停止':'再開');
}
async function start(version:'current'|'study'=($<HTMLSelectElement>('compare').value==='study'?'study':'current')){
 if(!ready)return;const id=++runId;clearTimeout(timer);ended=true;api().pause();await adopted().cancel();if(id!==runId)return;
 active=version;playing=true;preparing=true;caption();$('phase').textContent='準備中';$('time').textContent='';
 const manual=$<HTMLSelectElement>('compare').value==='study';
 if(active==='current'){preparing=false;ended=false;void adopted().run(options());}
 else{await api().set({...options(),loop:false,mode:manual?$<HTMLSelectElement>('mode').value:'board',speed:manual?Number($<HTMLSelectElement>('speed').value):1});if(id!==runId)return;preparing=false;ended=false;api().replay();}
}
function finish(){if(ended)return;ended=true;playing=false;caption();const compare=$<HTMLSelectElement>('compare').value;const pairNext=compare==='alternate'&&active==='current';if(!pairNext&&!$<HTMLInputElement>('loop').checked)return;const id=runId;timer=window.setTimeout(()=>{if(id!==runId)return;if(!pairNext&&$<HTMLInputElement>('playlist').checked){const order:Kind[]=['draw','summon','attack','spell'];current=order[(order.indexOf(current)+1)%4];}void start(pairNext?'study':compare==='study'?'study':'current');},850);}
function guard(fn:()=>void){if(ready)fn();}
document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.onclick=()=>guard(()=>{current=b.dataset.kind as Kind;$<HTMLInputElement>('playlist').checked=false;void start();}));
$('replay').onclick=()=>void start();
$('pause').onclick=()=>guard(()=>{clearTimeout(timer);if(active==='current'){if(playing){++runId;ended=true;playing=false;void adopted().cancel();caption();$('phase').textContent='停止・先頭に戻る';}else void start('current');}else{if(playing){api().pause();playing=false;}else{ended=false;api().play();playing=true;}caption();}});
$<HTMLInputElement>('loop').onchange=()=>{if(!$<HTMLInputElement>('loop').checked)clearTimeout(timer);else if(ended)void start();};
for(const id of['compare','mode','speed','side','spell-card'])$(id).onchange=()=>void start();
$('sound').onclick=()=>guard(()=>{const on=$('sound').getAttribute('aria-pressed')!=='true';$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent='試作音 '+(on?'ON':'OFF');void api().set({sound:on});});
$<HTMLInputElement>('seek').oninput=()=>guard(()=>{clearTimeout(timer);ended=true;api().seek(Number($<HTMLInputElement>('seek').value)/1000*DURATIONS[current]);});
window.addEventListener('message',event=>{if(event.origin!==location.origin)return;const d=event.data;if(!d||!['cinematic-vfx','cinematic-current'].includes(d.type))return;const fromTrial=event.source===trial.contentWindow,fromNative=event.source===native.contentWindow;if(!fromTrial&&!fromNative)return;if(d.fallback)document.querySelector('.edition b')!.textContent='軽量表示 · GPUの表面演出は省略';if(d.error){$('loading').hidden=false;$('loading').textContent='準備エラー: '+d.error;return;}
 if(!started&&api()?.info().ready&&adopted()?.info().ready){ready=true;started=true;$('loading').hidden=true;document.body.dataset.ready='true';if(!matchMedia('(prefers-reduced-motion:reduce)').matches)void start();else caption();}
 if(fromTrial&&active==='study'&&!preparing&&d.time!==undefined){playing=d.playing;$<HTMLInputElement>('seek').value=String(d.time/d.duration*1000);$('time').textContent=d.time.toFixed(2)+' / '+d.duration.toFixed(2)+'s';$('phase').textContent=d.phase;caption();if(d.time>=d.duration&&!d.playing)finish();}
 if(fromNative&&active==='current'){if(d.playing!==undefined){playing=d.playing;caption();$('phase').textContent=d.playing?'現行・通常速度':'完了';$('time').textContent=d.elapsed?d.elapsed.toFixed(2)+'s':'通常速度';$<HTMLInputElement>('seek').value=d.playing?'0':'1000';}if(d.ended)finish();}
});
window.addEventListener('keydown',event=>{if((event.target as HTMLElement).matches('input,select'))return;if(event.code==='Space'){event.preventDefault();$('pause').click();}if(event.key==='r')$('replay').click();});
Object.assign(window,{comparison:{info:()=>({ready,active,kind:current,playing,preparing,mode:$<HTMLSelectElement>('compare').value}),replay:()=>start()}});
caption();
