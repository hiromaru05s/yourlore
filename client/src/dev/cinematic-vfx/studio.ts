import './studio.css';
import {DURATIONS,type Kind} from './direction';
type API={set(o:object):Promise<void>;play():void;pause():void;replay():void;seek(t:number):void;info():{ready:boolean;kind:Kind;time:number;playing:boolean}};
const frame=document.querySelector('iframe')!;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const api=()=>((frame.contentWindow as unknown as {vfx:API}).vfx);
const descriptions:Record<Kind,[string,string,string]>={draw:['01 / DRAW','銀光のドロー','束から引き抜いた一枚が、銀の光を引いて手札へ。'],summon:['02 / SUMMON','蒼銀の実体化','記録の輪郭から魔力が立ち上がり、重さを伴って着地する。'],attack:['03 / STRIKE','閃刃の一撃','引き絞る溜め、鋭い踏み込み。命中の一瞬に、重さを。'],spell:['04 / CAST','焔の解放','カードの表面が燃えほどけ、ひとつの火球になって相手へ。']};
let current:Kind='draw',playing=false,ready=false;
function caption(){const d=descriptions[current];$('eyebrow').textContent=d[0];$('effect-title').textContent=d[1];$('description').textContent=d[2];document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===current)));}
function guard(fn:()=>void){if(ready)fn();}
document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.onclick=()=>guard(()=>{current=b.dataset.kind as Kind;$<HTMLInputElement>('playlist').checked=false;caption();void api().set({kind:current});}));
$('replay').onclick=()=>guard(()=>api().replay());$('pause').onclick=()=>guard(()=>playing?api().pause():api().play());
$<HTMLInputElement>('loop').onchange=()=>guard(()=>void api().set({loop:$<HTMLInputElement>('loop').checked}));
for(const id of['speed','mode','side'])$<HTMLSelectElement>(id).onchange=()=>guard(()=>void api().set({[id]:id==='mode'?$<HTMLSelectElement>(id).value:Number($<HTMLSelectElement>(id).value)}));
$('sound').onclick=()=>guard(()=>{const on=$('sound').getAttribute('aria-pressed')!=='true';$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent='音 '+(on?'ON':'OFF');void api().set({sound:on});});
$<HTMLInputElement>('seek').oninput=()=>guard(()=>api().seek(Number($<HTMLInputElement>('seek').value)/1000*DURATIONS[current]));
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='cinematic-vfx')return;const d=event.data;if(d.fallback){document.querySelector('.edition b')!.textContent='軽量表示 · GPU演出は省略';}if(d.cycle&&$<HTMLInputElement>('playlist').checked){const order:Kind[]=['draw','summon','attack','spell'];current=order[(order.indexOf(current)+1)%4];caption();void api().set({kind:current});}if(d.error){$('loading').textContent='準備に失敗しました。再読み込みしてください。';return;}if(d.ready!==undefined){ready=d.ready;$('loading').hidden=ready;document.body.dataset.ready=String(ready);}if(d.time!==undefined){playing=d.playing;$('pause').textContent=playing?'一時停止':'再開';$<HTMLInputElement>('seek').value=String(d.time/d.duration*1000);$('time').textContent=d.time.toFixed(2)+' / '+d.duration.toFixed(2)+'s';$('phase').textContent=d.phase;}});
window.addEventListener('keydown',event=>{if((event.target as HTMLElement).matches('input,select'))return;if(event.code==='Space'){event.preventDefault();$('pause').click();}if(event.key==='r')$('replay').click();});
caption();
