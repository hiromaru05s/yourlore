import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const engine=process.env.LORE_QA_ENGINE||'chromium',origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5577',out=process.env.LORE_TEST_OUT||'/tmp/lore-persistent-continuity';await fs.mkdir(out,{recursive:true});
const b=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{channel:'chrome',headless:true}),results=[];
try{for(const width of [1280,390]){
 const ctx=await b.newContext({viewport:{width,height:900},deviceScaleFactor:width<500?3:2,recordVideo:{dir:out+'/video',size:{width,height:900}}}),p=await ctx.newPage(),errors=[];p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/Native capture fallback|\[persistent-flight\] Native fallback|\[quest-pact\] Native fallback/.test(m.text()))errors.push(m.text());});
 await p.goto(origin+'/quest-play-lab.html');await p.waitForFunction(()=>window.questPlay&&document.querySelector('[data-scene-ready=true]'));
 for(const side of [0,1])for(const id of ['E3','WORLD_SEED','Q_RIFT']){
  const result=await p.evaluate(async({side,id})=>{
   questPlay.reset(side,id);await new Promise(r=>setTimeout(r,300));let running=true,seen=false,max=0;const sample=()=>{for(const c of document.querySelectorAll('.persistent-flight-canvas,.quest-fold-canvas')){seen=true;max=Math.max(max,c.width,c.height);}if(running)requestAnimationFrame(sample);};sample();questPlay.play();await questPlay.controller.queue;running=false;
   const row=document.querySelector(side?'#oppRow':'#meRow'),tile=row.querySelector('.buff-icon'),frame=tile?.querySelector('.buff-frame');return{id,side,seen,max,painted:!!frame&&getComputedStyle(frame).backgroundImage.includes('-print.webp'),idAtRest:tile?.dataset.cardId,left:document.querySelectorAll('.quest-fold-host,.persistent-flight-canvas,.quest-fold-canvas').length};
  },{side,id});assert(result.seen&&result.painted,JSON.stringify(result));assert(result.max<=2048);assert.equal(result.left,0);results.push({engine,width,...result});await p.screenshot({path:`${out}/${width}-${side}-${id}.png`});console.log('PASS',engine,width,result);
 }
 const concurrent=await p.evaluate(async()=>{await Promise.all([questPlay.direct('me'),questPlay.direct('opp','Q_WINTER')]);return document.querySelectorAll('.quest-fold-host,.quest-fold-canvas').length;});assert.equal(concurrent,0);assert.deepEqual(errors,[]);await ctx.close();await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,boundary:'Real local reducer/controller and normal clock; emulated viewport, not authenticated PvP or physical device.'},null,2));
}}finally{await b.close();}
