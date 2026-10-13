import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/vfx-prototypes/2026-10-13-silence-purple-r3/qa';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1320,height:1160}});page.setDefaultTimeout(120000);await page.goto('http://127.0.0.1:5496/silence-four.html',{waitUntil:'commit'});await page.waitForFunction(()=>window.silenceQA?.state.ready);
 const data=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=710;const c=canvas.getContext('2d');const sources=[...document.querySelectorAll('[data-v]')];const labels=['01 紫紋の圧封','02 六鎖の禁陣','03 双扉の閉呪','04 紫淵の封刻'];
  const stream=canvas.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:4500000});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise(r=>recorder.onstop=r);let running=true,frame=0;
  const paint=()=>{c.fillStyle='#eeeee8';c.fillRect(0,0,1100,710);sources.forEach((s,i)=>{const x=(i%2)*550,y=Math.floor(i/2)*355;c.drawImage(s,x,y+25,550,300);c.fillStyle='#263a4f';c.font='16px sans-serif';c.fillText(labels[i],x+23,y+28)});c.fillStyle='#7b796c';c.font='12px sans-serif';c.fillText('LORE / SILENCE SUMMON STUDIES — '+document.querySelector('#time').textContent,24,697);if(running)frame=requestAnimationFrame(paint);};
  silenceQA.seek(0);paint();recorder.start();silenceQA.play();await new Promise(r=>setTimeout(r,7600));silenceQA.stop();running=false;cancelAnimationFrame(frame);recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
  return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));});
 });await fs.writeFile(out+'/continuous-four.webm',Buffer.from(data.split(',')[1],'base64'));console.log('recorded',out+'/continuous-four.webm');}finally{await browser.close();}
