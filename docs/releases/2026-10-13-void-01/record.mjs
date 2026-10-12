import {chromium} from '/tmp/lore-aura-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.goto('http://127.0.0.1:55217/void-runtime.html',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.voidQA?.ready,null,{timeout:120000});
 for(const id of ['VOID_APOSTLE','GM6_1']){
  const result=await page.evaluate(async id=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),chunks=[],times=[];const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:2500000});
   let started=false;const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   const observer=new MutationObserver(()=>{const host=document.querySelector('.void-summon');if(!host)return;ctx.fillStyle='#eee9e1';ctx.fillRect(0,0,512,512);ctx.drawImage(host.querySelector('canvas'),0,0);times.push(Number(host.dataset.time));if(!started){started=true;recorder.start();}});
   observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-time']});
   await window.voidQA.run(id,id==='GM6_1'?1:0,'hand');observer.disconnect();if(!started)throw Error('No summon was captured');recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
   const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});return{data,times};
  },id);
  await fs.writeFile(out+id.toLowerCase()+'-runtime.webm',Buffer.from(result.data.split(',')[1],'base64'));await fs.writeFile(out+id.toLowerCase()+'-timing.json',JSON.stringify({source:'Actual summon runtime canvas, neutral background; not a full-screen recording',times:result.times},null,2));console.log('Recorded',id,result.times.length);
 }
}finally{await browser.close();}
