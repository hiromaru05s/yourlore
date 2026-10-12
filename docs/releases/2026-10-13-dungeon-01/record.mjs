import {chromium} from '/tmp/lore-dungeon-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome',headless:true}),context=await b.newContext({viewport:{width:1360,height:900},recordVideo:{dir:'/tmp/lore-dungeon-video',size:{width:1360,height:900}}}),p=await context.newPage();
try{
 await p.goto('http://127.0.0.1:5459/dungeon-runtime.html');await p.waitForFunction(()=>window.dungeonQA?.ready);
 await p.evaluate(()=>window.dungeonQA.run('DUNGEON'));
 await p.evaluate(()=>{window.done=false;window.dungeonQA.run('DUNGEON',0,'hand').then(()=>window.done=true);});
 await p.waitForFunction(()=>window.done);await p.waitForTimeout(250);
}finally{await context.close();await fs.copyFile(await p.video().path(),out+'runtime-continuous.webm');await b.close();}
