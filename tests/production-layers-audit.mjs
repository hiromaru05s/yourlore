import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const out='docs/audits/2026-09-30-production/evidence/layers';await fs.mkdir(out,{recursive:true});
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'audit-fixture',resolveId(id){if(id==='/@audit.js')return '\0audit.js'},load(id){if(id==='\0audit.js')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/audit'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@audit.js"></script></body></html>')}else next()})}}],server:{host:'127.0.0.1',port:5462,strictPort:true,hmr:false}});await server.listen();
const b=await chromium.launch({channel:'chrome',headless:true}),context=await b.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}}),p=await context.newPage();p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>errors.push(e.message));const checks=[];
try{
 await p.goto('http://127.0.0.1:5462/audit');await p.waitForSelector('[data-scene-ready=true]');
 await p.evaluate(()=>Promise.all([monsterQA.A.monsterActivation('mon-0'),monsterQA.A.monsterActivation('mon-1')]));checks.push('simultaneous two-side activation completes');
 for(let i=0;i<3;i++)await p.evaluate(async()=>{monsterQA.reset();await monsterQA.A.attackStrike('mon-0','mon-1','opp',()=>{},false)});checks.push('three consecutive attacks complete without transient residue');
 const policy=await p.evaluate(async()=>{
  monsterQA.reset();const {confirmDialog}=await import('/src/ui/modal.ts');window.confirmed=confirmDialog({title:'Layer audit',body:'Confirm dialog during VFX',confirm:'OK',cancel:'Cancel'});
  window.playing=monsterQA.A.monsterActivation('mon-0');await new Promise(r=>setTimeout(r,500));const transient=document.querySelector('[data-layer-policy=foreground]'),dialog=document.querySelector('.overlay');
  return {foreground:Number(getComputedStyle(transient).zIndex),dialog:Number(getComputedStyle(dialog).zIndex),pointerEvents:getComputedStyle(transient).pointerEvents,overlayCount:document.querySelectorAll('.overlay').length};
 });await p.screenshot({path:out+'/dialog-during-vfx.png'});assert.equal(policy.pointerEvents,'none');await p.locator('.modal .btn-ghost').click();await p.evaluate(()=>Promise.all([window.playing,window.confirmed]));checks.push('dialog remains clickable while visual compositor is above it');
 for(const [width,height] of [[1280,900],[390,844],[844,390]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>monsterQA.reset());await p.waitForTimeout(150);
  const flags=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,field:getComputedStyle(document.querySelector('[data-layer-policy=field]')).zIndex,portrait:getComputedStyle(document.querySelector('#portraitMe .pt-ring')).zIndex}));assert.equal(flags.overflow,false);assert(Number(flags.field)<Number(flags.portrait));await p.screenshot({path:out+`/board-${width}.png`});checks.push({width,...flags});
 }
 await p.evaluate(()=>monsterQA.ctl.destroy());assert.equal(await p.locator('.monster-animation-layer').count(),0);assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,policy,errors},null,2));console.log('PASS',checks,policy);
}finally{await context.close();await fs.rename(await p.video().path(),out+'/continuous.webm');await b.close();await server.close()}
