import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const out=process.env.STUDIO_QA_OUT||'/tmp/lore-cosmetic-audit',origin=process.env.STUDIO_ORIGIN||'http://127.0.0.1:5336';const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[];
try{for(const set of ['silverflow','emberheart'])for(const side of ['self','opponent']){
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:out+'/raw',size:{width:1280,height:720}}}),p=await context.newPage();
 await p.goto(`${origin}/cosmetic-studio.html?board=1&set=${set}&side=${side}&thickness=1`);await p.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 const initial=await p.evaluate(()=>atelier.info());await p.waitForTimeout(9000);const idle=await p.evaluate(()=>atelier.info());
 await p.evaluate(()=>atelier.replay('draw'));await p.waitForTimeout(400);
 const raw=await p.video().path();await context.close();execFileSync('ffmpeg',['-y','-i',raw,'-an','-c:v','libx264','-crf','22','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${set}-${side}-continuous.mp4`],{stdio:'ignore'});rows.push({set,side,initial,idle});console.log(set,side,idle.phase-initial.phase);
}await fs.writeFile(out+'/continuous-results.json',JSON.stringify(rows,null,2));}finally{await browser.close()}
