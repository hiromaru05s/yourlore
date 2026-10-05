import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const label=process.argv[2]||'current',out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-10-02';await fs.mkdir(out,{recursive:true});
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const server=await createServer({root:'client',cacheDir:'/tmp/lore-vite-perf-audit-cache',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'baseline-renderer',enforce:'pre',transform(source,id){if(!label.startsWith('before')||!id.includes('/client/src/ui/'))return;const file='client/src/ui/'+id.split('/client/src/ui/')[1].split('?')[0];try{return execFileSync('git',['show',(process.env.LORE_PERF_BASELINE||'7cc9ed17')+':'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{return;}}},{name:'perf-fixture',resolveId(id){if(id==='/@perf-fixture.js')return '\0perf-fixture'},load(id){if(id==='\0perf-fixture')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/perf-fixture'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@perf-fixture.js"></script></body></html>')}else next()})}}],server:{host:'127.0.0.1',port:5311,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'perf',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:0,losses:0}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:{ok:true,friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[]}});
await page.addInitScript(()=>{
 performance.setResourceTimingBufferSize(10000);window.perfCalls={};const count=n=>{window.perfCalls[n]=(window.perfCalls[n]||0)+1};
 const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){count('rect');return rect.call(this)};
 const css=window.getComputedStyle;window.getComputedStyle=function(...a){count('style');return css(...a)};
 for(const method of ['clearRect','drawImage']){const fn=CanvasRenderingContext2D.prototype[method];CanvasRenderingContext2D.prototype[method]=function(...a){count(method+':'+(this.canvas.className||'offscreen'));return fn.apply(this,a)}}
});
const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
async function measure(name,cpu=1){
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});await page.waitForTimeout(700);
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start');const before=await cdp.send('Performance.getMetrics');
 const sample=await page.evaluate(async()=>{window.perfCalls={};const frames=[],long=[],observer=new PerformanceObserver(l=>long.push(...l.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});const start=performance.now();let last=start;await new Promise(resolve=>{const tick=now=>{frames.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});observer.disconnect();frames.sort((a,b)=>a-b);return {frames:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],over50:frames.filter(v=>v>50).length,longTasks:long,counts:window.perfCalls,canvasPixels:[...document.querySelectorAll('canvas')].reduce((s,c)=>s+c.width*c.height,0),nodes:document.querySelectorAll('*').length};});
 const after=await cdp.send('Performance.getMetrics'),{profile}=await cdp.send('Profiler.stop');const metrics={};for(const key of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount']){const get=r=>r.metrics.find(x=>x.name===key)?.value||0;metrics[key]=get(after)-get(before);}
 const top=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,18).map(n=>({fn:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,hits:n.hitCount}));
 await fs.writeFile(`${out}/${label}-${name}.cpuprofile`,JSON.stringify(profile));await page.screenshot({path:`${out}/${label}-${name}.png`});
 const result={name,cpu,...sample,metrics,top};console.log(JSON.stringify({name,cpu,p95:sample.p95,task:metrics.TaskDuration,layout:metrics.LayoutCount,counts:sample.counts,top:top.slice(0,5)}));return result;
}
const samples=[];
try{
 let boot={};if(!process.env.LORE_PERF_BOARD_ONLY){let start=Date.now();await page.goto('http://127.0.0.1:5311/',{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 boot={ms:Date.now()-start,...await page.evaluate(()=>{const rs=performance.getEntriesByType('resource');return{requests:rs.length,bytes:rs.reduce((s,r)=>s+r.encodedBodySize,0),largest:rs.sort((a,b)=>b.encodedBodySize-a.encodedBodySize).slice(0,15).map(r=>({url:r.name,bytes:r.encodedBodySize})),images:rs.filter(r=>/\.webp|\.png/.test(r.name)).length}})};
 samples.push(await measure('home'));
 await page.locator('[data-nav=cards]').click();await page.waitForSelector('.lounge-cards .card');await page.waitForTimeout(1000);samples.push(await measure('cards'));}
 await page.goto('http://127.0.0.1:5311/perf-fixture');await page.waitForSelector('[data-scene-ready=true]');await page.waitForTimeout(1000);
 await page.evaluate(()=>{const q=monsterQA;for(const [side,p] of q.g.players.entries())p.field=Array.from({length:7},(_,i)=>q.mon(`dense-${side}-${i}`,{exhausted:true,aura:undefined}));q.render();});if(!process.env.LORE_PERF_CPU_ONLY)samples.push(await measure('blocked14'));
 await page.evaluate(()=>{const q=monsterQA;q.g.players[0].field.forEach((m,i)=>{m.exhausted=false;m.aura=i%2?'mana1':undefined});q.render();});if(!process.env.LORE_PERF_CPU_ONLY)samples.push(await measure('ready7'));
 samples.push(await measure('ready7-cpu4',4));await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await fs.writeFile(`${out}/${label}.json`,JSON.stringify({boot,samples,errors},null,2));console.log('BOOT',boot.ms,boot.requests,boot.bytes,'errors',errors);
}finally{await browser.close();await server.close();}
