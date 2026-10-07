import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-buff-browser-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-07-rift-idle-shadow/staging',dist=process.env.LORE_STAGING_BUILD||'client/dist';await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),files=['index.html',...(await fs.readdir(path.join(dist,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)],assets=[];
for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async file=>{const local=await fs.readFile(path.join(dist,file)),r=await fetch(origin+'/'+file);assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(local),file);assets.push({file,sha256:hash(local)});}));
console.log('PASS',assets.length,'served asset hashes');
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.stack));
await p.addInitScript(()=>{window.riftIdleProbe={compiled:0,times:[]};for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]){
 const shaders=new WeakSet(),programs=new WeakSet(),locations=new WeakSet();const source=proto.shaderSource,attach=proto.attachShader,location=proto.getUniformLocation,uniform=proto.uniform1f;
 proto.shaderSource=function(s,text){if(text.includes('float flow=p.x*16.')&&text.includes('p.y*2.-t*.48')){shaders.add(s);riftIdleProbe.compiled++;}return source.call(this,s,text);};
 proto.attachShader=function(p,s){if(shaders.has(s))programs.add(p);return attach.call(this,p,s);};
 proto.getUniformLocation=function(p,name){const l=location.call(this,p,name);if(l&&programs.has(p)&&name==='time')locations.add(l);return l;};
 proto.uniform1f=function(l,v){if(l&&locations.has(l)){riftIdleProbe.times.push({at:performance.now(),time:v});if(riftIdleProbe.times.length>500)riftIdleProbe.times.shift();}return uniform.call(this,l,v);};
 }});
await apiFixture(p,r=>{const u=new URL(r.url).pathname;return u==='/api/auth/me'?{user:{id:'rift-idle-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default',furniture:'default'}}:u==='/api/geo'?{country:'JP'}:u==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:u==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
try{
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForSelector('.screen-loader',{state:'detached'});await p.locator('#bot').click();await p.locator('#ranked').click();await p.locator('[data-diff=easy]').click();await p.locator('#diffStart').click();await p.waitForSelector('[data-scene-ready=true]');await p.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await p.waitForSelector('#hand .card');console.log('BOT board ready');
 assert((await p.evaluate(()=>riftIdleProbe.compiled))>0);
 const sample=async()=>{await p.evaluate(()=>riftIdleProbe.times=[]);await p.waitForTimeout(1000);return p.evaluate(()=>riftIdleProbe.times);};
 const motion=await sample();assert(new Set(motion.map(v=>v.time)).size>5);await p.screenshot({path:out+'/board-desktop.png'});
 const bounds=await p.locator('#rift-me,#rift-opp').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,w:r.width,h:r.height};}));assert.equal(bounds.length,2);assert(bounds.every(r=>r.x>=0&&r.x+r.w<=1281));
 for(const side of ['me','opp']){await p.locator('#rift-'+side).screenshot({path:out+'/rift-'+side+'-a.png'});await p.waitForTimeout(700);await p.locator('#rift-'+side).screenshot({path:out+'/rift-'+side+'-b.png'});}
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(250);const reduced=await sample();assert(new Set(reduced.map(v=>v.time)).size<=1);assert(reduced.every(v=>v.time===0));
 await p.emulateMedia({reducedMotion:'no-preference'});const resumed=await sample();assert(new Set(resumed.map(v=>v.time)).size>5);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/board-mobile.png'});const mobile=await sample();assert(new Set(mobile.map(v=>v.time)).size>2);
 await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(300);await p.screenshot({path:out+'/board-desktop.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/verification.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),assets,bounds,motion,reduced,resumed,mobile,errors,boundary:'Actual built or deployed assets on a BOT board; account/API responses are fixtures. No authenticated online match. Approved visual selection is 03 shadow veil.'},null,2));console.log('PASS deployed shader, both Rift positions, idle motion, reduced motion/resume, desktop/mobile');
}catch(e){await p.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:e.stack,errors},null,2));throw e;}finally{await b.close();}
