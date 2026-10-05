/** Optional continuous-playback evidence. Requires Chrome, Playwright and ffmpeg. */
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out=process.env.STUDIO_QA_OUT||'/tmp/lore-atelier-qa',browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const set of ['silverflow','emberheart'])for(const side of ['self','opponent']){
 const context=await browser.newContext({viewport:{width:1440,height:810},recordVideo:{dir:out+'/raw-video',size:{width:1440,height:810}}});const p=await context.newPage();
 await p.goto(`${process.env.STUDIO_ORIGIN||'http://127.0.0.1:5336'}/cosmetic-studio.html?board=1&set=${set}&side=${side}`);await p.waitForSelector('[data-scene-ready=true]',{timeout:90000});await p.waitForTimeout(800);
 await p.evaluate(()=>atelier.apply({...atelier.state(),motion:true,time:0}));await p.waitForTimeout(9500);
 const phase=await p.evaluate(()=>atelier.info().phase);const raw=await p.video().path();await context.close();
 execFileSync('ffmpeg',['-y','-sseof','-8','-i',raw,'-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${set}-${side}.mp4`],{stdio:'ignore'});console.log(set,side,{phase});
}}finally{await browser.close()}
