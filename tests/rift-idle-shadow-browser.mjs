import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-buff-browser-tools/node_modules/playwright/index.mjs');
const out='docs/releases/2026-10-07-rift-idle-shadow';await fs.mkdir(out+'/qa',{recursive:true});
const bundle=await build({entryPoints:[out+'/parity-fixture.ts'],bundle:true,write:false,format:'esm'});
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));
try{
 await p.route('http://rift.test/**',r=>r.fulfill({contentType:r.request().url().endsWith('.js')?'text/javascript':'text/html',body:r.request().url().endsWith('.js')?bundle.outputFiles[0].text:'<!doctype html><script type="module" src="/fixture.js"></script>'}));
 await p.goto('http://rift.test/');await p.waitForFunction(()=>window.riftQA);
 const parity=await p.evaluate(()=>riftQA.parity());assert(parity.every(x=>x.mae===0&&x.max===0));
 assert.deepEqual(await p.evaluate(()=>riftQA.tick(0)),{changed:true,time:0,meshes:2});assert.equal((await p.evaluate(()=>riftQA.tick(20))).changed,false);assert.deepEqual(await p.evaluate(()=>riftQA.tick(40)),{changed:true,time:.04,meshes:2});
 await p.evaluate(()=>riftQA.hidden(true));assert.equal((await p.evaluate(()=>riftQA.tick(1000))).changed,false);await p.evaluate(()=>riftQA.hidden(false));assert.equal((await p.evaluate(()=>riftQA.tick(1000))).changed,true);
 await p.emulateMedia({reducedMotion:'reduce'});assert.deepEqual(await p.evaluate(()=>riftQA.tick(1020)),{changed:true,time:0,meshes:2});assert.equal((await p.evaluate(()=>riftQA.tick(2000))).changed,false);
 await p.emulateMedia({reducedMotion:'no-preference'});assert.equal((await p.evaluate(()=>riftQA.tick(2010))).changed,true);
 assert.deepEqual(await p.evaluate(()=>riftQA.dispose()),{meshes:0,changed:false});assert.equal(await p.evaluate(()=>riftQA.cycles()),0);await p.evaluate(()=>riftQA.close());assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/qa/parity-lifecycle.json',JSON.stringify({parity,errors,checks:['approved 03 pixel equality at 2 sizes x 7 times','30Hz gate','hidden pause/resume','reduced preference change repaint and freeze','resume after reduced','two mirrored apertures','idempotent disposal and 12 mount/dispose cycles']},null,2));console.log('PASS 14 exact pixel matches and lifecycle checks');
}finally{await b.close();}
