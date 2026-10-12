import type {Renderer} from './renderer';import {CARDS,designs,DURATION,motion} from './catalog';
const save=async(name:string,body:Blob|string)=>{const r=await fetch('/__void-evidence/'+name.replaceAll('_','-'),{method:'POST',body});if(!r.ok)throw Error('Evidence save '+r.status+' '+name);};
const nap=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function verify(renderer:Renderer,status:HTMLElement){
 const report:{checks:{name:string;ok:boolean;detail?:unknown}[];errors:string[];timing:unknown[];capture:unknown[]}={checks:[],errors:[],timing:[],capture:[]};
 const check=(name:string,ok:boolean,detail?:unknown)=>{report.checks.push({name,ok,detail});if(!ok)report.errors.push(name);};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const c=canvas.getContext('2d')!;const snapshots:number[]=[];
 const stamps=[0,100,350,700,1100,1450,1700,1850,2200,2800,3200];
 const before=renderer.resources;
 for(const id of CARDS)for(let v=0;v<4;v++){
  const samples:number[]=[];for(const ms of stamps){const start=performance.now();renderer.render(canvas,id,v,ms);samples.push(performance.now()-start);const pixels=c.getImageData(0,0,400,400).data;let count=0,sum=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>20)count++;sum+=(pixels[i-1]+pixels[i-2]+pixels[i-3])*(i%31);}check(`${id}/${v}/visible-${ms}`,count>100);if(ms===1100)snapshots.push(sum);}
  renderer.render(canvas,id,v,0);const a=c.getImageData(0,0,400,400).data;renderer.render(canvas,id,v,DURATION);const b=c.getImageData(0,0,400,400).data;let diff=0;for(let i=0;i<a.length;i++)diff+=Math.abs(a[i]-b[i]);check(`${id}/${v}/returns-to-card`,diff/a.length<1,{pixelMeanDifference:diff/a.length});
  renderer.render(canvas,id,v,1100,{reduced:true});const r=c.getImageData(0,0,400,400).data;let rd=0;for(let i=0;i<r.length;i++)rd+=Math.abs(r[i]-b[i]);check(`${id}/${v}/reduced-motion-final`,rd===0);
  check(`${id}/${v}/no-premature-contact`,motion(v,designs[v].hit-1).contact===0);report.timing.push({id,v,meanSubmissionMs:samples.reduce((a,b)=>a+b,0)/samples.length,maxSubmissionMs:Math.max(...samples)});
 }
 check('four-distinct-surfaces',new Set(snapshots.slice(0,4)).size===4);
 const warm=renderer.resources;for(let i=0;i<60;i++)renderer.render(canvas,CARDS[i%2],i%4,(i*173)%3200);check('stable-gpu-resources',JSON.stringify(renderer.resources)===JSON.stringify(warm),{before,warm,after:renderer.resources});
 status.textContent=`描画検証 ${report.checks.filter(c=>c.ok).length}/${report.checks.length}。実盤面を確認中…`;
 const frame=document.createElement('iframe');frame.style.cssText='width:1180px;height:720px;position:fixed;left:0;top:0;z-index:10000';document.body.append(frame);frame.src='/void-four.html?board';
 const end=performance.now()+120000;while(!(frame.contentWindow as any)?.voidBoard?.state.ready&&performance.now()<end)await nap(200);
 const board=(frame.contentWindow as any)?.voidBoard;check('board-ready',!!board?.state.ready);
 if(board?.state.ready){
  for(const id of CARDS)for(let side=0;side<2;side++)for(let v=0;v<4;v++)for(const multi of [false,true]){
   const label=`board/${id}/${side}/${v}/${multi?3:1}`;const send=async(ms:number,reduced=false)=>{frame.contentWindow!.postMessage({kind:'void-control',id,v,side,ms,multi,reduced},location.origin);await nap(65);};
   await send(0);check(label+'/initial',board.state.rigs===0&&board.state.hidden===(multi?3:1));
   await send(1000);check(label+'/active',board.state.rigs===(multi?3:1)&&board.state.hidden===(multi?3:1));
   await send(designs[v].hit-1);await send(designs[v].hit+1);await send(designs[v].hit+60);check(label+'/single-contact',board.state.contact===1,board.state.contact);
   await send(DURATION);check(label+'/complete',board.state.rigs===0&&board.state.hidden===0);
   await send(800);frame.contentWindow!.postMessage({kind:'void-suspend'},location.origin);await nap(65);check(label+'/cancel',board.state.rigs===0&&board.state.ms===0);
   await send(700,true);check(label+'/reduced',board.state.rigs===0&&board.state.hidden===0);
  }
 }
 frame.remove();await save('report.json',JSON.stringify(report,null,2));status.textContent='連続再生を記録中…';
 for(const id of CARDS){
  const video=document.createElement('canvas');video.width=1280;video.height=880;const ctx=video.getContext('2d')!,tiles=Array.from({length:4},()=>{const a=document.createElement('canvas');a.width=a.height=560;return a;});const stream=video.captureStream(30);const chunks:Blob[]=[];const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};let frames=0;const gaps:number[]=[];let prev=0;
  const stopped=new Promise<void>(resolve=>recorder.onstop=()=>resolve());recorder.start();const start=performance.now();
  await new Promise<void>(resolve=>{function render(now:number){const elapsed=now-start;if(elapsed>6400){recorder.stop();resolve();return;}if(prev)gaps.push(now-prev);prev=now;frames++;ctx.fillStyle='#eee9e1';ctx.fillRect(0,0,1280,880);ctx.fillStyle='#2e2538';ctx.font='20px sans-serif';ctx.fillText('LORE / '+id+' / 1× CONTINUOUS',30,35);for(let v=0;v<4;v++){renderer.render(tiles[v],id,v,elapsed%3200);const x=v%2*640,y=Math.floor(v/2)*410;ctx.drawImage(tiles[v],x+110,y+30,410,410);ctx.fillStyle='#493d55';ctx.font='18px sans-serif';ctx.fillText(`0${v+1}  ${designs[v].name}`,x+28,y+70);}requestAnimationFrame(render);}requestAnimationFrame(render);});await stopped;stream.getTracks().forEach(t=>t.stop());await save(id.toLowerCase()+'-continuous.webm',new Blob(chunks,{type:mime}));for(let f=0;f<=96;f++){ctx.fillStyle='#eee9e1';ctx.fillRect(0,0,1280,880);ctx.fillStyle='#2e2538';ctx.font='20px sans-serif';ctx.fillText('LORE / '+id+' / 30 FPS TIMELINE',30,35);for(let v=0;v<4;v++){renderer.render(tiles[v],id,v,f*1000/30);const x=v%2*640,y=Math.floor(v/2)*410;ctx.drawImage(tiles[v],x+110,y+30,410,410);ctx.fillStyle='#493d55';ctx.font='18px sans-serif';ctx.fillText(`0${v+1}  ${designs[v].name}`,x+28,y+70);}const blob=await new Promise<Blob>(resolve=>video.toBlob(b=>resolve(b!)));await save(id.toLowerCase()+'-frame-'+String(f).padStart(3,'0')+'.png',blob);}
  report.capture.push({id,frames,meanFrameIntervalMs:gaps.reduce((a,b)=>a+b,0)/gaps.length,maxFrameIntervalMs:Math.max(...gaps)});
 }
 await save('report.json',JSON.stringify(report,null,2));status.textContent=`検証完了: ${report.checks.filter(c=>c.ok).length}/${report.checks.length} · ${report.errors.length?'要確認 '+report.errors.join(', '):'描画・実盤面・復元を確認'}。連続動画２本を保存。`;document.documentElement.dataset.qa=report.errors.length?'failed':'passed';
}
