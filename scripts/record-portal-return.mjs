/** Normal-speed browser capture: includes real frame pacing, independent of deterministic exports. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5208',out=path.resolve('docs/ui-rework/2026-09-29-portal-return');
const variants=[['portal-seam',2220],['portal-fold',2360],['portal-echo',2060],['portal-ivory',2520],['portal-cadence',2580]];
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-portal-live-'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/shelf-return-lab.html?portal=1');await page.waitForFunction(()=>window.loreShelfPreview?.ready);
 // Compile all five material layouts before measuring presentation playback.
 for(const [id,duration]of variants){console.log('Inspecting',id);await page.evaluate(id=>loreShelfPreview.sample(id,100),id);for(const [phase,t]of [['vanish',.27],['arrival',.68]]){await page.evaluate(t=>loreShelfPreview.seek(t),duration*t);await page.waitForTimeout(100);await page.screenshot({path:path.join(out,id+'-'+phase+'.png')});}await page.evaluate(()=>loreShelfPreview.cancel());}
 const cdp=await context.newCDPSession(page);let frame=0,active='',writes=[],timings=[];
 cdp.on('Page.screencastFrame',e=>{void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});if(!active)return;const num=frame++;writes.push(fs.writeFile(path.join(temp,active,`${String(num).padStart(5,'0')}.jpg`),Buffer.from(e.data,'base64')));timings.push(e.metadata.timestamp);});
 const report=[];
 for(const [id,duration]of variants){
  await fs.mkdir(path.join(temp,id));frame=0;writes=[];timings=[];active=id;
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1280,maxHeight:900,everyNthFrame:1});
  const started=Date.now();await page.evaluate(id=>loreShelfPreview.play(id),id);assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'14');assert.equal(await page.locator('.is-shuffling').count(),0);await page.waitForTimeout(350);await cdp.send('Page.stopScreencast');active='';await Promise.all(writes);
  const elapsed=(Date.now()-started)/1000;
  if(frame<3)throw new Error('Too few captured frames: '+id);
  const list=path.join(temp,id,'frames.txt');await fs.writeFile(list,timings.map((stamp,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${i+1<timings.length?Math.max(.005,timings[i+1]-stamp):.04}`).join('\n'));
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-vf','fps=30','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,id+'.mp4')]);
  report.push({id,nominalMs:duration,elapsedSeconds:elapsed,capturedFrames:frame,finalDeck:14,cleanup:true});console.log('Captured',id,frame,'frames');
 }
 const list=path.join(temp,'all.txt');await fs.writeFile(list,variants.map(([id])=>`file '${path.join(out,id+'.mp4')}'`).join('\n'));
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(out,'five-portal-returns.mp4')]);
 await fs.writeFile(path.join(out,'normal-speed-report.json'),JSON.stringify({report,errors},null,2));if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
