import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-startup-browser';await fs.mkdir(out,{recursive:true});
const root=path.resolve('client/dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(name==='/api/auth/me'?{user:null}:{country:'JP'}));return;}const file=path.join(root,name==='/'?'index.html':name),data=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');if(/\.(html|js|css|json)$/.test(file)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(data));}else res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const old=process.env.LORE_EXPECT_OLD==='1';const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:120000});
async function run(name,width,configure,check){const context=await browser.newContext({viewport:{width,height:900},locale:'ja-JP'}),p=await context.newPage(),errors=[];p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));try{await configure?.(p);const start=Date.now();await p.goto(base+'/',{waitUntil:'domcontentloaded'});await check(p);const result={name,width,ms:Date.now()-start,errors,state:await p.evaluate(()=>({startup:!!document.querySelector('#startup'),error:document.querySelector('#startup')?.hasAttribute('data-startup-error'),login:!!document.querySelector('.lounge-login'),home:!!document.querySelector('.lounge-home-main'),cover:!!document.querySelector('.screen-loader'),atmosphere:document.querySelector('[data-atmosphere]')?.getAttribute('data-atmosphere')}))};await p.screenshot({path:`${out}/${name}-${width}.png`});results.push(result);console.log(JSON.stringify(result));assert.deepEqual(errors,[]);}finally{await context.close();}}
const login=async p=>{await p.waitForSelector('.lounge-login');await p.waitForSelector('.screen-loader',{state:'detached'});await p.waitForSelector('#startup',{state:'detached'});await p.locator('#email').fill('test@example.invalid');await p.locator('#helpLink').click();assert(await p.locator('#helpPanel').isVisible());};
try{
 if(!old){for(const width of [1280,390])await run('unmodified-login',width,null,async p=>{await login(p);await p.reload({waitUntil:'domcontentloaded'});await login(p);});}
 await run('stalled-geo',1280,p=>p.route('**/api/geo',()=>{}),old?async p=>{await p.waitForTimeout(5000);assert.equal(await p.locator('#app').textContent(),'');}:login);
 if(!old){
 await run('saved-language',390,async p=>{await p.addInitScript(()=>localStorage.setItem('lore_lang','ja'));await p.route('**/api/geo',()=>{throw Error('saved language must skip geo');});},login);
 await run('failed-auth',1280,p=>p.route('**/api/auth/me',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'})),async p=>{await p.waitForSelector('#startup[data-startup-error]');assert(await p.locator('#startup-reload').isVisible());await p.unroute('**/api/auth/me');await p.locator('#startup-reload').click();await login(p);});
 await run('stalled-auth',390,p=>p.route('**/api/auth/me',()=>{}),async p=>{await p.waitForSelector('#startup[data-startup-error]');assert(await p.locator('#startup-reload').isVisible());});
 await run('failed-module',1280,p=>p.route('**/assets/*.js',r=>new URL(r.request().url()).pathname.includes('/main-')||new URL(r.request().url()).pathname.includes('/preload-helper-')||new URL(r.request().url()).pathname.includes('/modulepreload-polyfill-')?r.continue():r.abort()),async p=>{await p.waitForSelector('#startup[data-startup-error]');assert(await p.locator('#startup-reload').isVisible());});
 await run('no-javascript',390,p=>p.route('**/assets/*.js',r=>r.abort()),async p=>{await p.waitForSelector('#startup');assert(await p.locator('#startup-reload').isVisible());});
 }
 await run('stalled-background',1280,async p=>{
 await apiFixture(p,r=>{const n=new URL(r.url).pathname;if(n==='/api/auth/me')return{user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:0,losses:0}};if(n==='/api/rewards/tutorial')return{offered:true};return{ok:true,country:'JP',gifts:[],unread:0,entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[]};});
 await p.route(/\/atmosphere-v2\/ivy\.(png|webp)(\?|$)/,()=>{});
 },async p=>{await p.waitForSelector('.lounge-home-main');if(old){await p.waitForTimeout(20000);assert(await p.locator('.screen-loader').isVisible());assert.equal(await p.locator('[data-atmosphere]').getAttribute('data-atmosphere'),'loading');}else{await p.waitForSelector('.screen-loader',{state:'detached'});assert.equal(await p.locator('[data-atmosphere]').getAttribute('data-atmosphere'),'fallback');assert.equal(await p.locator('.home-atmosphere-canvas').count(),0);assert.equal(await p.locator('#app').evaluate(e=>e.inert),false);}});
}finally{await fs.writeFile(out+'/report.json',JSON.stringify({base,old,normalApi:process.env.LORE_TEST_ORIGIN?'real deployed API, unauthenticated':'local unauthenticated fixture',failureTests:'explicit request failure injection; background test uses account fixture',results},null,2));await browser.close();await new Promise(r=>server.close(r));}
