import type {Renderer} from './renderer';
import {cards,designs} from './catalog';
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn:()=>boolean){const start=performance.now();while(!fn()){if(performance.now()-start>90000)throw Error('QA timed out');await wait(25);}}
export function install(lab:any,renderer:Renderer,faces:Map<string,HTMLCanvasElement>){
 const panel=document.createElement('div');panel.style.cssText='position:fixed;top:3px;right:3px;z-index:9999;font:10px monospace;background:#102420;color:white;padding:5px;max-width:55vw';
 panel.innerHTML='<button id="run-qa">機能検証を実行</button><button id="record-qa">比較動画を記録</button><output id="qa-status">待機</output><pre id="qa-report" style="max-height:35vh;overflow:auto" hidden></pre><a id="qa-download" hidden>検証記録</a><a id="video-download" hidden>比較動画</a>';
 document.body.append(panel);const status=panel.querySelector('output')!,pre=panel.querySelector('pre')!;
 const rows:Array<{name:string;passed:boolean}>=[];
 const check=(name:string,ok:boolean)=>{rows.push({name,passed:ok});if(!ok)throw Error(name);};
 const report=(data:unknown)=>{const json=JSON.stringify(data,null,2);pre.textContent=json;pre.hidden=false;const a=panel.querySelector<HTMLAnchorElement>('#qa-download')!;a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download='report.json';a.hidden=false;};
 panel.querySelector('#run-qa')!.addEventListener('click',()=>{void(async()=>{
  rows.length=0;pre.hidden=true;
  try{
   lab.setMode('grid');lab.pause();
   for(const id of cards){lab.setCard(id);lab.seek(280);await wait(20);const cs=[...document.querySelectorAll<HTMLCanvasElement>('[data-v]')];
    const hashes=cs.map(c=>c.toDataURL());check(id+': four different rendered outputs',new Set(hashes).size===4);
    for(const cv of cs){const data=cv.getContext('2d')!.getImageData(0,0,cv.width,cv.height).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>200)count++;check(id+': variant '+cv.dataset.v+' opaque source exists',count>100);}
    lab.seek(700);const ends=cs.map(c=>c.toDataURL());check(id+': all four settle on identical source',new Set(ends).size===1);
   }
   lab.setMode('board');lab.pause();
   const frame=document.querySelector<HTMLIFrameElement>('iframe')!;await until(()=>!!(frame.contentWindow as any)?.evadeBoard?.state.ready);
   const state=()=>(frame.contentWindow as any).evadeBoard.state;
   for(const id of cards)for(const side of [0,1])for(let v=0;v<4;v++){
    status.textContent=` ${id} / ${side} / ${v+1}`;lab.setCard(id);lab.setSide(side);lab.setSuccess(true);lab.seek(280,v);
    await until(()=>state().ms===280&&state().variant===v&&state().side===side&&state().id===id);
    const s=state();check(`${id}/${side}/${v}: one actor, one hidden source, no attack`,s.actors===1&&s.hidden===1&&!s.attackVisible);
    lab.seek(700);await until(()=>state().ms===700);check(`${id}/${side}/${v}: source restored at 700ms`,state().actors===0&&state().hidden===0&&!state().attackVisible);
   }
   lab.setMulti(true);lab.seek(280,2);await until(()=>state().multi&&state().ms===280);check('Three simultaneous targets',state().actors===3&&state().hidden===3);
   lab.stop();await until(()=>state().actors===0);check('Cancel restores all targets',state().hidden===0);
   lab.setMulti(false);lab.setSuccess(false);lab.seek(699);await until(()=>state().ms===699);check('Failed roll does not start attack before 700ms',!state().attackVisible);
   lab.seek(700);await until(()=>state().ms===700);check('Failed roll starts attack at 700ms',state().attackVisible&&state().actors===0&&state().hidden===0);
   lab.seek(1040);await until(()=>state().ms===1040);check('Failed roll reaches normal attack contact',state().attackVisible);
   lab.stop();await until(()=>!state().attackVisible);check('Stopping failed branch restores attack',state().hidden===0);
   lab.setSuccess(true);lab.reduce(true);lab.seek(280);await until(()=>state().reduced);check('Reduced motion retains target and never launches attack',state().actors===1&&!state().attackVisible);
   lab.stop();await until(()=>state().actors===0);lab.reduce(false);
   lab.setMode('grid');lab.pause();await wait(50);check('Leaving board unloads its scene',frame.getAttribute('src')==='about:blank');
   const resources=lab.state.resources;for(let i=0;i<16;i++){lab.seek(i%2?210:530,i%4);}check('Repetition does not allocate GPU resources',JSON.stringify(resources)===JSON.stringify(lab.state.resources));
   lab.setCard(cards[0]);lab.seek(280);status.textContent=` PASS ${rows.length}`;
   report({passed:true,checks:rows,resources,scope:'Local GameView fixture; functional checks are not visual approval, live match proof, or staging.'});
  }catch(e){status.textContent=' FAILED';report({passed:false,checks:rows,error:String(e)});console.error(e);}
 })();});
 panel.querySelector('#record-qa')!.addEventListener('click',()=>{void(async()=>{
  lab.pause();status.textContent=' 記録中';
  const cv=document.createElement('canvas');cv.width=1120;cv.height=760;const c=cv.getContext('2d')!;cv.style.cssText='position:fixed;left:4vw;top:8vh;width:92vw;height:auto;max-height:80vh;object-fit:contain;z-index:9998;background:#141e21';document.body.append(cv);c.fillStyle='#141e21';c.fillRect(0,0,cv.width,cv.height);
  const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const stream=cv.captureStream(0),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7000000}),chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const stopped=new Promise<void>(resolve=>recorder.onstop=()=>resolve());let frames=0,last=0;const gaps:number[]=[];const start=performance.now();
  recorder.start(200);await new Promise<void>(resolve=>{
   function frame(now:number){
    const elapsed=now-start,clock=(elapsed%1500);c.fillStyle='#141e21';c.fillRect(0,0,1120,760);c.fillStyle='#d9e4d9';c.font='22px sans-serif';c.fillText('LORE / 回避4案 / 700ms / 通常速度',30,36);
    for(let i=0;i<4;i++){const x=(i%2)*560,y=Math.floor(i/2)*340+65;c.fillStyle='#e6e6dc';c.fillRect(x+16,y,528,280);renderer.draw(c,faces.get(cards[0])!,i,Math.min(700,clock),x+265,y+145,145);c.fillStyle='#c7d7cd';c.font='17px sans-serif';c.fillText(`0${i+1}  ${designs[i].name}`,x+20,y+308);}
    (stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack).requestFrame();if(last)gaps.push(now-last);last=now;frames++;if(elapsed>=6000){resolve();return;}requestAnimationFrame(frame);
   }requestAnimationFrame(frame);
  });
  await wait(300);recorder.stop();await stopped;cv.remove();stream.getTracks().forEach(t=>t.stop());const a=panel.querySelector<HTMLAnchorElement>('#video-download')!;a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download='four-real-time.webm';a.hidden=false;
  gaps.sort((a,b)=>a-b);status.textContent=` 記録完了 ${chunks.reduce((sum,b)=>sum+(b as Blob).size,0)}bytes / ${frames}frames / p95 ${gaps[Math.floor(gaps.length*.95)]?.toFixed(1)}ms`;
 })();});
}
