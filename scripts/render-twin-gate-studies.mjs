/** Export the actual browser frames at a deterministic 24fps. Dev server required. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5197';
const out=path.resolve(process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-27-twin-gate-atelier');
const ffmpeg=process.env.FFMPEG||'ffmpeg';
const studies=[['gate-astral',2480],['gate-tidal',2380],['gate-fulgur',2180],['gate-crystal',2620],['gate-corona',2520]];
await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-twin-gate-export-'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/shelf-return-lab.html?gates=rich');await page.waitForFunction(()=>window.loreShelfPreview?.ready,null,{timeout:120000});
 for(const [id,duration] of studies){
   const folder=path.join(temp,id);await fs.mkdir(folder);
   await page.evaluate(id=>{void loreShelfPreview.play(id);},id);await page.waitForSelector('.is-shuffling');
   const frames=Math.ceil(duration/1000*24);
   for(let i=0;i<=frames+12;i++){
     await page.evaluate(ms=>loreShelfPreview.seek(ms),Math.min(duration,i*1000/24));
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
     await page.screenshot({path:path.join(folder,`${String(i).padStart(4,'0')}.png`)});
   }
   await page.evaluate(()=>loreShelfPreview.cancel());
   execFileSync(ffmpeg,['-y','-loglevel','error','-framerate','24','-i',path.join(folder,'%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,id+'.mp4')]);
   console.log('Rendered',id);
 }
 if(errors.length)throw new Error(errors.join('\n'));
 const concat=path.join(temp,'concat.txt');
 await fs.writeFile(concat,studies.map(([id])=>`file '${path.join(out,id+'.mp4').replaceAll("'","'\\''")}'`).join('\n'));
 execFileSync(ffmpeg,['-y','-loglevel','error','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',path.join(out,'five-twin-gates.mp4')]);
 console.log('Saved five-twin-gates.mp4');
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
