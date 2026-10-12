import {chromium} from '/tmp/lore-decay-counter-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',e=>console.error('page error',String(e)));
try{
 await p.goto('http://127.0.0.1:55264/decay-counter-four.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.decayCounterLab?.state.ready,{},{timeout:60000});await p.evaluate(()=>decayCounterLab.seek(0));await p.waitForFunction(()=>decayCounterLab.state.boardReady,{},{timeout:60000});
 console.log('Board ready; capturing native card');
 const box=await p.locator('.study-card').first().boundingBox();const pad=20;const png=await p.screenshot({clip:{x:box.x-pad,y:box.y-pad,width:box.width+pad*2,height:box.height+pad*2}});const faceData='data:image/png;base64,'+png.toString('base64');
 console.log('Card captured; recording material');
 const result=await p.evaluate(async({faceData,pad,box})=>{
  const {Material,TILE_W,TILE_H}=await import('/src/dev/decay-counter-four/material.ts');const {studies}=await import('/src/dev/decay-counter-four/catalog.ts');
  decayCounterLab.seek(0);const nodes=[...document.querySelectorAll('.study-card')];await Promise.all(nodes.map(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})))));
  const face=new Image();face.src=faceData;await face.decode();
  const anchors=nodes.map(n=>{const badge=n.querySelector('.ec-decay-state');let x=0,y=0,o=badge;while(o&&o!==n){x+=o.offsetLeft;y+=o.offsetTop;o=o.offsetParent}return[(x+badge.offsetWidth/2)/n.offsetWidth,(y+badge.offsetHeight/2)/n.offsetHeight]});
  const mat=new Material(),canvas=document.createElement('canvas');canvas.width=1440;canvas.height=840;const c=canvas.getContext('2d'),chunks=[],stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const done=new Promise(r=>recorder.onstop=r);const warm=mat.drawBatch(studies.map((s,i)=>({variant:i,phase:.5,anchor:anchors[i]})));c.drawImage(warm,0,0);c.clearRect(0,0,canvas.width,canvas.height);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));recorder.start();const start=performance.now();let frames=0;const frameTimes=[];
  await new Promise((resolve,reject)=>{window.addEventListener('error',e=>reject(e.error),{once:true});setTimeout(()=>reject(Error('Playback capture timeout')),20000);let last=start;function tick(now){frames++;frameTimes.push(now-last);last=now;const elapsed=now-start,cycle=Math.floor(elapsed/2500),ms=Math.max(0,Math.min(1600,(elapsed%2500)-350));
   c.fillStyle='#f3f1e9';c.fillRect(0,0,1440,840);c.fillStyle='#283222';c.font='20px serif';c.fillText('LORE / DECAY COUNTER',45,52);c.font='14px sans-serif';c.fillText('腐敗カウンター付与 / 4つの異なる素材と動き',45,86);
   const requests=studies.map((s,i)=>({variant:i,phase:Math.max(0,Math.min(1,ms/s.duration)),anchor:anchors[i]}));const atlas=mat.drawBatch(requests);
   for(let i=0;i<4;i++){const x=70+i*355,y=230,w=230,h=w/.64;const scale=w/box.width;c.font='15px sans-serif';c.fillStyle='#6d755f';c.fillText(`0${i+1}  ${studies[i].name}`,x-9,168);c.save();c.shadowColor='#25321f44';c.shadowBlur=20;c.shadowOffsetY=10;c.drawImage(face,x-pad*scale,y-pad*scale,(box.width+pad*2)*scale,(box.height+pad*2)*scale);c.restore();c.drawImage(atlas,i*TILE_W,0,TILE_W,TILE_H,x,y,w,h);
    if(ms>=studies[i].contact){const ax=x+anchors[i][0]*w,ay=y+anchors[i][1]*h;c.fillStyle='#243324';c.fillRect(ax-31,ay-11,62,22);c.fillStyle='#f7f2dd';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('腐敗 1/3',ax,ay+4);c.textAlign='left';}
    c.font='11px sans-serif';c.fillStyle='#7c866e';c.fillText(studies[i].en,x-9,680);
   }
   c.fillStyle='#7c866e';c.font='13px monospace';c.fillText(`${(ms/1000).toFixed(2)} s / 1.60 s    ${cycle===0?'NORMAL PLAYBACK':'REPEAT'}`,45,795);
   if(elapsed<7500)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick)});
  recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());mat.dispose();const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());return{bytes:Array.from(bytes),frames,frameTimes};
 },{faceData,pad,box});
 await fs.writeFile(out+'continuous.webm',Buffer.from(result.bytes));await fs.writeFile(out+'playback.json',JSON.stringify({frames:result.frames,frameTimes:result.frameTimes,description:'Real-clock continuous drawing using the final material renderer. Native card capture; comparison-only plaque text.'},null,2));console.log('Continuous recording saved',result.frames);
}finally{await b.close();}
