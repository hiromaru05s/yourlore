import './style.css';
import {RiftRenderer,variants,DURATION,state,clamp,type Variant} from './renderer';
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('#scene'),ctx=canvas.getContext('2d')!,stage=$('#stage'),board=$<HTMLIFrameElement>('#board');
const scrub=$<HTMLInputElement>('#scrub'),play=$<HTMLButtonElement>('#play'),loop=$<HTMLInputElement>('#loop'),speed=$<HTMLSelectElement>('#speed'),side=$<HTMLSelectElement>('#side');
const renderers=variants.map(()=>new RiftRenderer()),renderer=new RiftRenderer();
let choice:Variant='lens',mode='studio',light=false,playing=false,ms=0,last=0,raf=0,face:HTMLCanvasElement,fixture:any,ready=false,disposed=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(reduced.matches)loop.checked=false;
const phaseNames=['浮上 / LIFT','被覆 / SHROUD','渦化 / COLLAPSE','軌跡 / TRANSFER','余韻 / SETTLE'];
for(const [i,v] of variants.entries()){const b=document.createElement('button');b.className='variant';b.dataset.variant=v.id;b.innerHTML=`<b>0${i+1}</b><span><strong>${v.name}</strong><small>${v.en}</small></span>`;b.onclick=()=>{select(v.id);ms=0;if(ready){if(reduced.matches){ms=1070;pause();}else start();}draw();};$('#variants').append(b);}
function select(id:Variant){choice=id;const v=variants.find(v=>v.id===id)!;$('#name').textContent=v.name;$('#description').textContent=v.description;$('#look').textContent=v.look;$('#stage-name').textContent=`0${variants.indexOf(v)+1} / ${v.en}`;document.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>{b.classList.toggle('active',b.dataset.variant===id);b.setAttribute('aria-pressed',String(b.dataset.variant===id));});}
function size(){const dpr=Math.min(devicePixelRatio||1,2),w=stage.clientWidth,h=stage.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
function draw(){if(!ready||disposed)return;const w=stage.clientWidth,h=stage.clientHeight;ctx.clearRect(0,0,w,h);fixture.restore();const t=Math.min(ms,DURATION);
 if(mode==='board'){
  const s=side.value as 'me'|'opp',p=fixture.sample(s);fixture.hide(s);renderer.draw(ctx,face,choice,p.source,p.sink,p.width,t,{light:true,heightRatio:p.heightRatio});
 }else if(mode==='compare'){
  const cols=w<550?2:3,rows=3,cw=w/cols,ch=h/(cols===2?rows:2);
  for(const [i,v] of variants.entries()){const x=(i%cols)*cw,y=Math.floor(i/cols)*ch;ctx.save();ctx.beginPath();ctx.rect(x,y,cw,ch);ctx.clip();ctx.strokeStyle=light?'#bfb1c9':'#362c42';ctx.strokeRect(x,y,cw,ch);ctx.fillStyle=light?'#51425e':'#a99bb8';ctx.font='10px sans-serif';ctx.fillText(`0${i+1}  ${v.name}`,x+16,y+24);const u=Math.min(cw*.30,ch*.31);renderers[i].draw(ctx,face,v.id,{x:x+cw*.42,y:y+ch*.49},{x:x+cw*.81,y:y+ch*.78},u,t,{light,receiver:true});ctx.restore();}
  const x=(5%cols)*cw,y=Math.floor(5/cols)*ch;ctx.fillStyle=light?'#6a5978':'#84728f';ctx.font='10px sans-serif';ctx.fillText('同じ時刻、異なる質感。',x+20,y+ch*.40);ctx.font='9px sans-serif';ctx.fillText('バーを動かして、形と余韻を比較。',x+20,y+ch*.40+24);
 }else{
  const u=Math.min(w*.29,h*.47,235);const source={x:w*.43,y:h*.51},sink={x:w*.82,y:h*.77};
  // Quiet platform contours provide scale and a light-receiving surface.
  ctx.save();ctx.strokeStyle=light?'#b9abbf55':'#82718d19';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(source.x,source.y+u*.69,u*(.68+i*.27),u*(.13+i*.045),0,0,Math.PI*2);ctx.stroke();}ctx.restore();
  renderer.draw(ctx,face,choice,source,sink,u,t,{light,receiver:true});
  ctx.font='8px sans-serif';ctx.fillStyle=light?'#8c789b':'#796885';ctx.textAlign='center';ctx.fillText('R I F T',sink.x,sink.y+u*.23);ctx.textAlign='left';
 }
 scrub.value=String(Math.min(ms,DURATION));$('#time').textContent=`${(Math.min(ms,DURATION)/1000).toFixed(2)} / 2.20 s`;$('#phase').textContent=phaseNames[state(t).phase];document.querySelectorAll('.phases span').forEach((el,i)=>el.classList.toggle('active',i===state(t).phase));
 canvas.dataset.time=String(Math.round(t));canvas.dataset.variant=choice;canvas.dataset.view=mode;
}
function pause(){playing=false;cancelAnimationFrame(raf);raf=0;play.textContent='再生';last=0;}
function tick(now:number){if(!playing||disposed)return;if(last)ms+=(now-last)*Number(speed.value);last=now;if(ms>DURATION+650){if(loop.checked)ms=0;else {ms=DURATION;pause();}}draw();if(playing)raf=requestAnimationFrame(tick);}
function start(){if(!ready||disposed)return;if(ms>=DURATION)ms=0;if(!playing){playing=true;last=0;play.textContent='一時停止';raf=requestAnimationFrame(tick);}}
play.onclick=()=>playing?pause():start();$('#reset').onclick=()=>{pause();ms=0;draw();};scrub.oninput=()=>{pause();ms=Number(scrub.value);draw();};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.onclick=()=>{mode=b.dataset.view!;stage.classList.toggle('board',mode==='board');stage.classList.toggle('compare',mode==='compare');document.querySelectorAll('[data-view]').forEach(e=>{e.classList.toggle('active',e===b);e.setAttribute('aria-pressed',String(e===b));});size();draw();};
$('#theme').onclick=()=>{light=!light;stage.classList.toggle('light',light);$('#theme').textContent=light?'暗い背景':'白い背景';$('#theme').setAttribute('aria-pressed',String(light));draw();};
side.onchange=()=>draw();
const resize=new ResizeObserver(()=>{size();draw();});resize.observe(stage);
window.addEventListener('resize',()=>{size();draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();fixture?.restore();ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);}else draw();});
reduced.addEventListener('change',()=>{if(reduced.matches){pause();loop.checked=false;ms=1070;draw();}});
window.addEventListener('pagehide',()=>{pause();disposed=true;resize.disconnect();fixture?.restore();},{once:true});
select(choice);size();
async function init(){try{
 const start=performance.now();while(!(board.contentWindow as any)?.riftBoard){if(performance.now()-start>30000)throw new Error('盤面の準備に時間がかかっています。ページを再読み込みしてください。');await new Promise(r=>setTimeout(r,80));}
 fixture=(board.contentWindow as any).riftBoard;face=await fixture.ready;ready=true;$('#loading').hidden=true;$('#loading').style.display='none';play.disabled=false;$<HTMLButtonElement>('#reset').disabled=false;scrub.disabled=false;
 if(reduced.matches){ms=1070;draw();}else startPlayback();
 }catch(e){$('#loading').textContent=String(e);console.error(e);}}
function startPlayback(){draw();start();}
void init();
// Deterministic inspection API: the UI and captures share the exact renderer and clock.
(window as any).riftLab={get ready(){return ready;},get playing(){return playing;},variants:variants.map(v=>v.id),seek(time:number,id?:Variant){pause();if(id)select(id);ms=clamp(time/DURATION)*DURATION;draw();},setView(v:string){document.querySelector<HTMLButtonElement>(`[data-view="${v}"]`)?.click();},setSide(s:string){side.value=s;draw();},pause,play:start,draw,get face(){return face;}};
