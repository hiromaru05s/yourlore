/** Normal-speed browser capture: includes real frame pacing, independent of deterministic exports. */
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5198',out=path.resolve('docs/ui-rework/2026-09-29-connected-return');
const variants=[['linked-silver',2820],['linked-tidal',2920],['linked-fulgur',2360],['linked-petal',3080],['linked-crown',3020]];
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-connected-live-'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/shelf-return-lab.html?connected=1');await page.waitForFunction(()=>window.loreShelfPreview?.ready);
 // Compile all five material layouts before measuring presentation playback.
 for(const [id]of variants){await page.evaluate(id=>{void loreShelfPreview.play(id)},id);await page.waitForSelector('.is-shuffling');await page.evaluate(()=>loreShelfPreview.seek(1000));await page.waitForTimeout(100);await page.evaluate(()=>loreShelfPreview.cancel());}
 const cdp=await context.newCDPSession(page);let frame=0,active='',writes=[],timings=[];
 cdp.on('Page.screencastFrame',e=>{void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});if(!active)return;const num=frame++;writes.push(fs.writeFile(path.join(temp,active,`${String(num).padStart(5,'0')}.jpg`),Buffer.from(e.data,'base64')));timings.push(e.metadata.timestamp);});
 const report=[];
 for(const [id,duration]of variants){
  await fs.mkdir(path.join(temp,id));frame=0;writes=[];timings=[];active=id;
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1280,maxHeight:900,everyNthFrame:1});
  const started=Date.now();await page.evaluate(id=>loreShelfPreview.play(id),id);await page.waitForTimeout(350);await cdp.send('Page.stopScreencast');active='';await Promise.all(writes);
  const elapsed=(Date.now()-started)/1000;
  if(frame<3)throw new Error('Too few captured frames: '+id);
  const list=path.join(temp,id,'frames.txt');await fs.writeFile(list,timings.map((stamp,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${i+1<timings.length?Math.max(.005,timings[i+1]-stamp):.04}`).join('\n'));
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-vf','fps=30','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,id+'.mp4')]);
  report.push({id,nominalMs:duration,elapsedSeconds:elapsed,capturedFrames:frame});console.log('Captured',id,frame,'frames');
 }
 const list=path.join(temp,'all.txt');await fs.writeFile(list,variants.map(([id])=>`file '${path.join(out,id+'.mp4')}'`).join('\n'));
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(out,'five-connected-returns.mp4')]);
 await fs.writeFile(path.join(out,'normal-speed-report.json'),JSON.stringify({report,errors},null,2));if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
