import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='docs/releases/2026-10-07-verdant-02/qa';
const b=await chromium.launch({channel:'chrome',headless:true}),ctx=await b.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/normal-speed',size:{width:1280,height:900}}}),p=await ctx.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{await p.goto('http://127.0.0.1:5395/verdant-qa.html');await p.waitForFunction(()=>window.verdantQA?.ready,null,{timeout:90000});for(const id of ['ELF','DARK_ELF','HIGH_ELF','ELDER_ELF_KING','WORLD_TREE']){await p.evaluate(id=>window.verdantQA.run(id),id);console.log('Normal playback',id);}await fs.writeFile(out+'/normal-speed.json',JSON.stringify({errors,clock:'native performance.now, no clock emulation'}));}finally{await ctx.close();await b.close();}
