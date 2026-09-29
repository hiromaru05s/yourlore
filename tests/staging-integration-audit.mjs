/** Live staging regression: isolated QA users, real APIs/audio/assets; no API fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-09-30-integrated/live';
await fs.mkdir(out,{recursive:true});
const users=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));
assert.equal(users.length,2);assert(users.every(u=>u.id.startsWith('qa-release-')&&u.email.endsWith('@example.test')));
const hashes=[];
const paths=['index.html',...(await fs.readdir('client/dist/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
for(const dir of ['music','ui/passives/v2','sfx/lore-v4','sfx/opening-v1','art/biblion/modular']){
 for(const f of await fs.readdir('client/dist/'+dir))if(/\.(mp3|svg|png|webp)$/.test(f))paths.push(dir+'/'+f);
}
const hash=b=>createHash('sha256').update(b).digest('hex');
for(let i=0;i<paths.length;i+=6)await Promise.all(paths.slice(i,i+6).map(async file=>{
 const r=await fetch(origin+'/'+file,{signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,file);
 const remote=hash(Buffer.from(await r.arrayBuffer())),local=hash(await fs.readFile('client/dist/'+file));assert.equal(remote,local,file);hashes.push({file,sha256:local});
}));
await fs.writeFile(out+'/hashes.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),hashes},null,2));
console.log('PASS public hashes',hashes.length);
for(const u of users){
 const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:u.email,password:u.password})});
 assert.equal(r.status,200,'real password login');const body=await r.json();assert.equal(body.user.id,u.id);
 const token=r.headers.get('set-cookie')?.match(/lore_session=([^;]+)/)?.[1];assert(token);u.token=token;
 const me=await fetch(origin+'/api/auth/me',{headers:{cookie:'lore_session='+token}});assert.equal((await me.json()).user.id,u.id);
}
await fs.writeFile(process.env.LORE_QA_AUTH_FILE,JSON.stringify(users),{mode:0o600});
console.log('PASS both real password logins');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addCookies([{name:'lore_session',value:users[0].token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
const page=await context.newPage();page.setDefaultTimeout(180000);
const errors=[],failed=[],checks=[],routes=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failed.push({path:new URL(r.url()).pathname,status:r.status()});});
await page.addInitScript(()=>{
 localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_sfx','.7');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 window.qaPendingDecoded=new Set();const nativeDecode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){const src=this.src;qaPendingDecoded.add(src);return nativeDecode.call(this).finally(()=>qaPendingDecoded.delete(src));};window.qaTracks=[];const Native=window.Audio;
 window.Audio=class extends Native{constructor(...args){super(...args);this.originalUrl=String(args[0]);this.qaEvents=[];qaTracks.push(this);for(const name of ['playing','ended'])this.addEventListener(name,()=>this.qaEvents.push({name,at:performance.now()}));}};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});console.log('Opened staging');await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.locator('[data-nav="home"]').click();
 await page.waitForFunction(()=>qaTracks.some(t=>t.originalUrl.includes('yohaku-to-zankyo')&&!t.paused&&t.currentTime>.1));
 const nav=async(name)=>{await page.locator(`[data-nav="${name}"]`).click();await page.waitForSelector('.lounge-'+name);await page.waitForTimeout(250);};
 for(const name of ['deck','cards','leaderboard','friends','shop','tutorial','home']){
  await nav(name);
  const tracks=await page.evaluate(()=>qaTracks.filter(t=>t.originalUrl.includes('yohaku-to-zankyo')).map(t=>({paused:t.paused,time:t.currentTime,loop:t.loop,src:t.getAttribute('src')})));
  assert.equal(tracks.length,1,`one HOME track across ${name}`);assert.equal(tracks[0].paused,false);assert.equal(tracks[0].loop,true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' overflow');routes.push({name,tracks});console.log('Menu passed',name);
 }
 checks.push('all seven menus retain one playing BGM instance with native loop');
 await page.waitForFunction(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('yohaku-to-zankyo'));return a.readyState>=2&&Number.isFinite(a.duration);});console.log('Seeking HOME loop');await page.evaluate(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('yohaku-to-zankyo'));a.currentTime=a.duration-.8;});await page.waitForFunction(()=>!qaTracks.find(t=>t.originalUrl.includes('yohaku-to-zankyo')).seeking);
 await page.waitForFunction(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('yohaku-to-zankyo'));return !a.paused&&a.currentTime<4;});checks.push('real HOME audio crosses track end and loops');console.log('HOME loop passed');
 for(const [width,height] of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});
  for(const name of ['home','deck','cards','leaderboard','friends','shop','tutorial']){await nav(name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' '+width);await page.screenshot({path:`${out}/${name}-${width}.png`});}
 }
 checks.push('all menus fit desktop and 390px mobile');
 await page.setViewportSize({width:1280,height:900});await nav('home');await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('[data-diff="easy"]').click();
 await page.waitForFunction(()=>qaTracks.some(t=>t.originalUrl.includes('clash-of-blades')&&!t.paused));
 assert.equal(await page.evaluate(()=>qaTracks.filter(t=>t.originalUrl.includes('yohaku-to-zankyo')&&!t.paused).length),0);
 await page.waitForFunction(()=>qaTracks.some(t=>t.originalUrl.includes('poised-opening')&&!t.paused&&t.currentTime>.05));await page.waitForSelector('.duel-opening',{state:'detached'});
 const battle=await page.evaluate(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('poised-opening'));return {volume:a.volume,active:qaTracks.filter(t=>!t.paused).map(t=>t.originalUrl)};});
 assert(Math.abs(battle.volume-.147)<.00001);assert.equal(battle.active.length,1);assert.equal(await page.locator('.game').evaluate(n=>n.inert),false);assert(await page.locator('#hand .card').count()>=3);
 console.log('Seeking battle loop');await page.evaluate(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('poised-opening'));a.currentTime=a.duration-.5;});await page.waitForFunction(()=>!qaTracks.find(t=>t.originalUrl.includes('poised-opening')).seeking);
 await page.waitForFunction(()=>qaTracks.find(t=>t.originalUrl.includes('poised-opening')).qaEvents.some(e=>e.name==='ended'));
 await page.waitForFunction(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('poised-opening'));return a.qaEvents.filter(e=>e.name==='playing').length>=2&&!a.paused&&a.currentTime<5;});
 battle.loopGapMs=await page.evaluate(()=>{const a=qaTracks.find(t=>t.originalUrl.includes('poised-opening')),end=a.qaEvents.find(e=>e.name==='ended');return a.qaEvents.find(e=>e.name==='playing'&&e.at>end.at).at-end.at;});assert(battle.loopGapMs>=2950&&battle.loopGapMs<5000);
 checks.push('real BOT opening, HOME release, intro to battle, relative gain and three-second battle loop gap');
 await page.screenshot({path:out+'/bot.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.rm(out+'/failure.json',{force:true});await fs.rm(out+'/failure.png',{force:true});
 await fs.writeFile(out+'/browser.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),authenticated:true,apiFixtures:false,checks,routes,battle,errors,failed},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify({message:e.message,checks,errors,failed,loading:await page.evaluate(()=>({pending:[...qaPendingDecoded],text:document.querySelector('.loading-progress')?.textContent,audio:qaTracks.map(a=>({url:a.originalUrl,paused:a.paused,seeking:a.seeking,time:a.currentTime,duration:a.duration,ready:a.readyState,network:a.networkState,error:a.error?.message}))}))},null,2));throw e;}
finally{await context.close();await browser.close();}
