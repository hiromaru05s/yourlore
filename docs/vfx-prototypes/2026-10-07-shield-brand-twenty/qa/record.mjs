import {chromium} from '/tmp/lore-buff-browser-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import path from 'node:path';
const dir=path.dirname(new URL(import.meta.url).pathname),lock='/tmp/lore-series-vfx-heavy-qa.lock';await fs.mkdir(lock);await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,task:'shield-brand-record'}));let browser;
const results=[];
try{browser=await chromium.launch({headless:true,channel:'chrome'});const p=await browser.newPage({viewport:{width:1280,height:1000}});await p.goto('http://127.0.0.1:5326/shield-brand-twenty.html?paused=1');await p.waitForFunction(()=>window.shieldBrand?.state.boardReady);
 for(const group of ['SF','SA','BF','BA']){
  const result=await p.evaluate(async(group)=>{
   const {studies}=await import('/src/dev/shield-brand-twenty/catalog.ts'),{Renderer,loadAssets}=await import('/src/dev/shield-brand-twenty/renderer.ts');const list=studies.filter(s=>s.id.startsWith(group)),renderer=new Renderer(await loadAssets()),out=document.createElement('canvas');out.width=1280;out.height=820;const c=out.getContext('2d'),surfaces=list.map(()=>Object.assign(document.createElement('canvas'),{width:640,height:370}));
   list.forEach((s,i)=>renderer.draw(surfaces[i],s,s.duration*.45,false,0));await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
   const stream=out.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:7000000}),chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const done=new Promise(ok=>recorder.onstop=ok);recorder.start();let frames=0,maxGap=0,last=performance.now();const duration=Math.max(...list.map(s=>s.duration))+750,start=performance.now();
   await new Promise(ok=>{function draw(now){const t=now-start;maxGap=Math.max(maxGap,now-last);last=now;c.fillStyle='#111721';c.fillRect(0,0,1280,820);c.font='22px sans-serif';c.fillStyle='#e6d4aa';c.fillText((group[0]==='S'?'シールド':'烙印')+' / '+(group[1]==='F'?'初回付与':'追加付与'),25,39);
    list.forEach((s,i)=>{const x=(i%3)*420+10,y=Math.floor(i/3)*363+66;renderer.draw(surfaces[i],s,Math.min(s.duration,t),false,0);c.drawImage(surfaces[i],x,y,410,237);c.font='18px sans-serif';c.fillStyle='#eee6d4';c.fillText(s.id+'  '+s.name,x+9,y+266);c.font='13px sans-serif';c.fillStyle='#a4b0bd';c.fillText(s.material,x+9,y+291)});frames++;if(t<duration)requestAnimationFrame(draw);else ok();}requestAnimationFrame(draw)});
   recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());renderer.dispose();const blob=new Blob(chunks,{type:'video/webm'});const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return{base64:btoa(text),frames,maxGap,duration};
  },group);await fs.writeFile(path.join(dir,`${group}-continuous.webm`),Buffer.from(result.base64,'base64'));delete result.base64;results.push({group,...result});console.log(group+' recorded');
 }
 await fs.writeFile(path.join(dir,'recording.json'),JSON.stringify(results,null,2));
}finally{await browser?.close();const owner=JSON.parse(await fs.readFile(path.join(lock,'owner.json'),'utf8'));if(owner.pid===process.pid)await fs.rm(lock,{recursive:true});}
