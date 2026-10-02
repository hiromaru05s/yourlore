import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {transform} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/performance/2026-10-02';await fs.mkdir(out,{recursive:true});
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const beforeSource=execFileSync('git',['show','7cc9ed17:client/src/ui/monster/actor.ts'],{encoding:'utf8'}).replaceAll("'./catalog'","'/src/ui/monster/catalog'").replaceAll("'./renderer'","'/src/ui/monster/renderer'");
const before=(await transform(beforeSource,{loader:'ts',format:'esm',target:'es2022'})).code;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'perf-regression',resolveId(id){if(id==='/@perf.js')return '\0perf.js';if(id==='/@before.ts')return '\0before.ts'},load(id){if(id==='\0perf.js')return fixture;if(id==='\0before.ts')return before},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/perf'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@perf.js"></script></body></html>')}else next()})}}],server:{host:'127.0.0.1',port:5312,strictPort:true,hmr:false}});await server.listen();
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5312/perf');await p.waitForSelector('[data-scene-ready=true]');await p.waitForTimeout(500);
 const parity=await p.evaluate(async()=>{
  const {options}=await import('/src/ui/monster/catalog.ts');
  const {Actor:Old}=await import('/@before.ts'),{Actor:New}=await import('/src/ui/monster/actor.ts');
  const source=document.querySelector('.zone-mon .card'),host=document.createElement('div');document.body.append(host);
  const r=monsterQA.M.monsterRect(source),target={x:r.x+140,y:r.y-130,w:r.w,h:r.h},dest={x:120,y:180,w:40,h:55};
  const a=new Old(source,host),b=new New(source,host);a.stats=b.stats={atk:{from:5,to:8},def:{from:8,to:12}};
  const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=64;ca.height=cb.height=96;
  const xa=ca.getContext('2d'),xb=cb.getContext('2d');let cases=0,maxMatrixError=0;
  for(const reduced of [false,true])for(const side of [-1,1])for(const k of ['ready','blocked','aura','summon','attack','trigger','atk','hp','both','atkDown','hpDown','bothDown','destroy'])for(const v of options(k))for(const t of [0,.18,.32,.57,.84,1]){
   try{for(const actor of [a,b])actor.paint(k,v,t,r,target,reduced,true,side,dest);}catch(e){throw Error([k,v,t,reduced,side].join('/')+': '+e.message);}
   const ma=a.matrix.toFloat64Array(),mb=b.matrix.toFloat64Array();maxMatrixError=Math.max(maxMatrixError,...ma.map((n,i)=>Math.abs(n-mb[i])));
   for(const selector of [null,'.card-frame','.card-art','.ad-atk','.ad-def']){
    const na=selector?a.el.querySelector(selector):a.el,nb=selector?b.el.querySelector(selector):b.el;if(!na)continue;
    for(const prop of ['filter','display','width','height','boxShadow','opacity'])if(getComputedStyle(na)[prop]!==getComputedStyle(nb)[prop])throw Error([k,v,t,reduced,selector,prop].join('/'));
   }
   xa.clearRect(0,0,64,96);xb.clearRect(0,0,64,96);xa.drawImage(a.surface,0,0,64,96);xb.drawImage(b.surface,0,0,64,96);
   const pa=xa.getImageData(0,0,64,96).data,pb=xb.getImageData(0,0,64,96).data;if(pa.some((n,i)=>n!==pb[i]))throw Error('Surface differs '+[k,v,t,reduced]);
   for(let i=0;i<a.pieces.length;i++)for(const prop of ['transform','clipPath','filter','display']){if(prop==='transform'){const x=new DOMMatrix(a.pieces[i].style.transform).toFloat64Array(),y=new DOMMatrix(b.pieces[i].style.transform).toFloat64Array();maxMatrixError=Math.max(maxMatrixError,...x.map((v,j)=>Math.abs(v-y[j])));}else if(a.pieces[i].style[prop]!==b.pieces[i].style[prop])throw Error('Fragment differs '+[k,v,t,prop]);}
   cases++;
  }
  a.dispose();b.dispose();host.remove();return{cases,maxMatrixError};
 });console.log(parity);assert(parity.maxMatrixError<1e-6);
 await p.evaluate(()=>{const q=monsterQA;for(const f of q.g.players)f.field.forEach(m=>{m.exhausted=true;m.aura=undefined;});q.render();});await p.waitForSelector('[data-layer-policy=foreground]',{state:'detached'});await p.waitForTimeout(250);
 const idle=await p.evaluate(async()=>{let reads=0,clears=0;const old=Element.prototype.getBoundingClientRect,clear=CanvasRenderingContext2D.prototype.clearRect;Element.prototype.getBoundingClientRect=function(){if(this.matches('.zone-mon .card'))reads++;return old.call(this)};CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.closest('.monster-animation-layer'))clears++;return clear.apply(this,a)};await new Promise(r=>setTimeout(r,600));Element.prototype.getBoundingClientRect=old;CanvasRenderingContext2D.prototype.clearRect=clear;return{reads,clears}});assert.deepEqual(idle,{reads:0,clears:0});
 await p.evaluate(()=>document.querySelector('.zone-mon .card').classList.add('is-targetable'));await p.waitForFunction(()=>document.querySelector('[data-layer-policy=field] .duet-card').classList.contains('is-targetable'));
 await p.setViewportSize({width:844,height:390});await p.waitForTimeout(300);
 const alignment=await p.evaluate(async()=>{const {pose}=await import('/src/ui/monster/catalog.ts');const {placement}=await import('/src/ui/monster/actor.ts');const n=document.querySelector('.zone-mon .card'),r=monsterQA.M.monsterRect(n),p=pose('blocked','B',1,r,r,false,true,-1),m=placement(r,p.x,p.y,p.angle,p.scale,p.z,p.rock).toFloat64Array(),actual=new DOMMatrix(document.querySelector('[data-layer-policy=field] .duet-card').style.transform).toFloat64Array();return Math.max(...m.map((n,i)=>Math.abs(n-actual[i])))});assert(alignment<.01);
 await p.screenshot({path:out+'/landscape-states.png'});
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(50);await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(50);
 await p.evaluate(()=>document.querySelector('.zone-mon .card').remove());await p.waitForTimeout(50);assert.equal(await p.locator('[data-layer-policy=field] .duet-card').count(),1);
 await p.evaluate(()=>monsterQA.ctl.destroy());assert.equal(await p.locator('.monster-animation-layer').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/renderer-regression.json',JSON.stringify({parity,idle,resizeMatrixError:alignment,checks:['target highlighting wakes static card','resize recomputes cached projection','hidden/resume','removed source cleans actor','dispose releases layers'],errors},null,2));console.log('PASS',parity,idle);
}finally{await b.close();await server.close();}
