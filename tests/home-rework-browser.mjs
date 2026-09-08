import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5178';
const output='docs/ui-rework/2026-09-08-home-and-drop';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/home-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
await page.goto(origin+'/home-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game','screens','mobile'])await import('/src/styles/'+css+'.css');
 const i18n=await import('/src/i18n.ts');i18n.setLang('ja');
 const {api}=await import('/src/net/api.ts');
 api.me=async()=>({id:'qa',display:'Hiromaru',email:'qa@example.test',wins:48,losses:22,credits:1180,avatar:'SEEKER_BLUE'});
 api.rankMe=async()=>({tier:'gold',mmr:1260,season:'2026-09',wins:48,losses:22});
 api.inviteMe=async()=>({code:'fixture',limit:3,invites:[]});
 const {mountHome}=await import('/src/screens/home.ts');
 const calls=[];const app=new Proxy({root:document.getElementById('app'),user:{id:'qa',display:'Hiromaru',wins:47,losses:22,credits:1000,avatar:'SEEKER_BLUE'},home:()=>{window.qa.screen.destroy();app.root.innerHTML='';window.qa.screen=mountHome(app);}}, {get:(t,k)=>t[k]||((...args)=>calls.push({method:k,args}))});
 window.qa={app,calls,i18n,screen:mountHome(app),level:(await import('/src/ui/seekerLevel.ts')).seekerLevel};
});
await page.waitForFunction(()=>document.getElementById('seekerLevel').textContent==='15');
assert.equal(await page.locator('#shardBalance').innerText(),'1,180');
assert.equal(await page.locator('.lobby-xp').getAttribute('aria-valuenow'),'0');
const levels=await page.evaluate(()=>[qa.level(0,0),qa.level(2,2),qa.level(3,2),qa.level(-5,NaN),qa.level(47,19)]);
assert.deepEqual(levels.map(x=>[x.level,x.progress]),[[1,0],[1,4],[2,0],[1,0],[14,1]]);
const layouts=[];
for(const vp of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844},{width:844,height:390}]){
 await page.setViewportSize(vp);await page.waitForTimeout(250);
 const bounds=await page.locator('.lobby-home button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {id:n.id,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
 for(const b of bounds)assert(b.left>=-1&&b.right<=vp.width+1&&b.top>=-1&&b.bottom<=vp.height+1,`${b.id} out of bounds ${JSON.stringify(b)}`);
 // Every visible button must receive its own pointer hit, not an overlapping layer.
 for(const b of bounds)assert(await page.evaluate(b=>document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2)?.closest('button')?.id===b.id,b),`occluded button ${b.id}`);
 assert(await page.locator('.lobby-nav-item span').evaluateAll(ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)),'nav labels fit');
 layouts.push({viewport:vp,bounds});await page.screenshot({path:`${output}/home-${vp.width}x${vp.height}.png`});
}
await page.setViewportSize({width:1280,height:720});
for(const [id,method] of [['ranked','rankedLobby'],['online','onlineLobby'],['deck','deck'],['cards','cards'],['shop','shop'],['lb','leaderboard'],['tutorial','tutorial'],['friends','friends'],['profile','profile'],['settings','settings'],['credits','shop']]){
 await page.locator('#'+id).click();assert.equal(await page.evaluate(()=>qa.calls.at(-1).method),method);
}
await page.locator('#bot').click();await page.locator('[data-diff="hard"]').click();assert.deepEqual(await page.evaluate(()=>qa.calls.at(-1)),{method:'botGame',args:['hard']});
await page.locator('#inquiry').click();await page.locator('#inqTitle').fill('Test draft');await page.locator('#inqCancel').click();assert.equal(await page.locator('.overlay').count(),0);
await page.locator('#invite').click();await page.waitForSelector('#invLink');assert((await page.locator('#invLink').inputValue()).endsWith('?ref=fixture'));await page.locator('#invClose').click();
for(const lang of ['en','ko','ja']) { await page.evaluate(lang=>qa.i18n.setLang(lang),lang);assert(!/home\.|inquiry\.|invite\./.test(await page.locator('.lobby-home').innerText()),'all home strings localized'); }
await page.evaluate(()=>qa.screen.destroy());assert.deepEqual(errors,[]);
await fs.writeFile(output+'/home-checks.json',JSON.stringify({levels,layouts,errors,checks:['server refresh and level boundaries','all existing destinations','inquiry draft and invite dialog','all buttons hit-testable','three languages','four responsive sizes']},null,2));
await browser.close();console.log('PASS: HOME progression, navigation, dialogs, localization, and responsive hit testing');
