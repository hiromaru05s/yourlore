import fs from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_PATH||'playwright');
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const frames=await fs.mkdtemp(path.join(os.tmpdir(),'lore-elemental-frames-'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:650},deviceScaleFactor:1});
const kinds=['cannon','lightning','berserk','arrow','meteor','ball','zone'];
try{
 await page.goto('http://127.0.0.1:5268/elemental-seven.html?stage=1');await page.waitForFunction(()=>window.elementStage?.ready);
 for(const kind of kinds.filter(k=>!process.env.LORE_RECORD_KINDS||process.env.LORE_RECORD_KINDS.split(',').includes(k))){await page.evaluate(k=>elementStage.load(k),kind);const duration=await page.evaluate(()=>elementStage.current.duration);const dir=path.join(frames,kind);await fs.mkdir(dir);
  for(let i=0;i<=Math.ceil(duration/1000*30);i++){await page.evaluate(t=>elementStage.seek(t),i*1000/30);await page.screenshot({path:path.join(dir,String(i).padStart(4,'0')+'.png')})}
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','30','-i',path.join(dir,'%04d.png'),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',out+kind+'.mp4'],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);console.log('recorded',kind,duration);
 }
 const list=path.join(frames,'sequence.txt');await fs.writeFile(list,kinds.map(k=>`file '${out+k}.mp4'`).join('\n'));const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',out+'seven-effects.mp4'],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);
 await fs.writeFile(out+'recording.json',JSON.stringify({fps:30,resolution:[1000,650],method:'Deterministic seek frames at 30 fps, encoded to H.264. Not a real-time performance recording.',kinds},null,2));
}finally{await browser.close();await fs.rm(frames,{recursive:true,force:true})}
