import './studio.css';
import './transferStudio.css';
type Version='current'|'study';
type API={run(options:object):Promise<void>;cancel():Promise<void>;info():{ready:boolean;playing:boolean;phase:string}};
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const frames={current:$<HTMLIFrameElement>('current-frame'),study:$<HTMLIFrameElement>('study-frame')};
const api=(version:Version)=>((frames[version].contentWindow as unknown as {currentVfx:API}).currentVfx);
let ready=false,active:Version='study',generation=0,timer=0,playing=false;
function caption(){
 $('viewport').dataset.active=active;$('version-badge').textContent=active==='study'?'B · 今回の試作':'A · 現行';
 $('effect-title').textContent=active==='study'?'青い枠と光の粒':'現行の通常召喚';
 $('description').textContent=active==='study'?'中央拡大と着地は現行。光の粒が着地直前で枠を作り直す。':'採用中の中央拡大・移動・落下・接地を再生。';
}
async function stop(){++generation;clearTimeout(timer);playing=false;await Promise.all([api('current')?.cancel(),api('study')?.cancel()]);$('phase').textContent='停止';}
async function start(version:Version=$<HTMLSelectElement>('compare').value==='study'?'study':'current'){
 if(!ready)return;const id=++generation;clearTimeout(timer);playing=false;await Promise.all([api('current').cancel(),api('study').cancel()]);if(id!==generation)return;active=version;caption();playing=true;$('time').textContent='';
 await api(active).run({kind:'summon',side:Number($<HTMLSelectElement>('side').value),spell:'S4'});
 if(id!==generation)return;playing=false;
 const mode=$<HTMLSelectElement>('compare').value,next=mode==='alternate'&&active==='current'?'study':null;
 if(next||$<HTMLInputElement>('loop').checked)timer=window.setTimeout(()=>void start(next??(mode==='study'?'study':'current')),850);
}
$('replay').onclick=()=>void start();$('stop').onclick=()=>void stop();
for(const id of ['compare','side'])$(id).onchange=()=>void start();
$<HTMLInputElement>('loop').onchange=()=>{if(!$<HTMLInputElement>('loop').checked)clearTimeout(timer);else if(!playing)void start();};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='cinematic-current')return;
 if(!Object.values(frames).some(f=>f.contentWindow===event.source))return;
 const data=event.data;
 if(!ready&&api('study')?.info().ready&&api('current')?.info().ready){ready=true;$('loading').hidden=true;if(!matchMedia('(prefers-reduced-motion:reduce)').matches)void start();}
 if(event.source!==frames[active].contentWindow)return;
 if(data.error){$('loading').hidden=false;$('loading').textContent=data.error;}
 if(data.phase)$('phase').textContent=data.phase;
 if(data.ended){$('time').textContent=`${data.elapsed.toFixed(2)}s`;$('phase').textContent='定着';}
});
Object.assign(window,{comparison:{info:()=>({ready,active,playing}),replay:()=>start(),stop}});
caption();
