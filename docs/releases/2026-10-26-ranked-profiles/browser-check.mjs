import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const origin=process.env.ORIGIN||'http://127.0.0.1:5568',out=process.env.OUT||'tmp/ranking-profile';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const purchases={sampleGames:10,cards:['MASSACRE','EXILE_NUKE1','EXILE_NUKE2','RIFT_MATTER','RIFT_METALIGHT'].map((id,i)=>({id,games:10-i,rate:(10-i)/10}))};
const cards=['STARTER_MANA',...Array(6).fill('STARTER_TRASH'),'STARTER_CHEST','STARTER_CHEST'];
let profileMode='full',delay=0;
const profile=()=>({id:'a',display:'PYAP',avatar:null,badge:null,created_at:Date.now()-86400000,self:profileMode==='self',tier:'bronze',mmr:1036,rank:1,private:profileMode==='private',ranked:profileMode==='empty'?{games:0,wins:0,losses:0,draws:0,winRate:null,recentDecks:[],purchases:{sampleGames:0,cards:[]}}:{games:10,wins:6,losses:3,draws:1,winRate:.6,recentDecks:(profileMode==='missing'?[0,1]:[0,1,2]).map(i=>({matchId:`game-${i}`,at:Date.now()-i*86400000,cards:profileMode==='missing'||(profileMode==='mixed'&&i>0)?null:cards})),purchases}});
await apiFixture(p,async req=>{const path=new URL(req.url).pathname;
if(path==='/api/auth/me')return {user:{id:'qa',display:'SEEKER',credits:100,wins:1,losses:2}};
if(path==='/api/geo')return {country:'JP'};
if(path==='/api/rank/leaderboard')return {season:'2026-10',entries:[{rank:1,userId:'a',display:'PYAP',tier:'bronze',mmr:1036,wins:6,losses:3,purchases},{rank:2,userId:'qa',display:'hiromaru',tier:'iron',mmr:986,wins:1,losses:2,purchases:{sampleGames:0,cards:[]}}]};
if(path==='/api/rank/me')return {rating:{rank:2,tier:'iron',mmr:986,wins:1,losses:2}};
if(path==='/api/social/profile'){if(delay)await new Promise(r=>setTimeout(r,delay));return {profile:profile()};}
if(path==='/api/social/friends')return {friends:[{id:'a',display:'PYAP',avatar:null,badge:null,online:true,state:'menu'}],incoming:[],outgoing:[],challenges:[]};
if(path==='/api/rewards/tutorial')return {keys:[],offered:true};
if(path==='/api/rewards/progression')return {credits:100,resetsAt:Date.now()+86400000,online:0,ranked:0,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{}};
return {ok:true,keys:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
const ready=async()=>{await p.waitForFunction(()=>![...document.querySelectorAll('.game-loading')].some(e=>e.getBoundingClientRect().width>0),{},{timeout:90000});await p.evaluate(async()=>{const i=new Image();i.src='/art/ui/lore-panel-azure-cut.png';await i.decode();await document.fonts.ready;});};
const checkHero=async()=>{
 const bounds=await p.locator('.pf-rank-header').evaluate(el=>{
  const identity=el.querySelector('.pf-identity').getBoundingClientRect(),rank=el.querySelector('.rp-rank').getBoundingClientRect();
  return {identityRight:identity.right,rankLeft:rank.left,overflow:el.scrollWidth>el.clientWidth,emblem:el.querySelector('.rank-emblem').getBoundingClientRect().width,score:parseFloat(getComputedStyle(el.querySelector('.rp-rating strong')).fontSize)};
 });
 assert(bounds.rankLeft>=bounds.identityRight,'rank to right of identity');assert.equal(bounds.overflow,false);assert(bounds.emblem>=100&&bounds.score>=38,'prominent emblem and MMR');
 assert.equal(await p.locator('.rp-rank').count(),1,'rank only appears in header');
};
try{
await p.goto(origin);await p.locator('#startup').waitFor({state:'hidden',timeout:90000});await ready();await p.locator('[data-nav=leaderboard]').evaluate(e=>e.click());await p.locator('.lb-profile-trigger').first().waitFor();await ready();
assert.equal(await p.locator('.lb-deck-trigger,.ranked-deck-note').count(),0);assert(!(await p.locator('.menu-records').innerText()).includes('TOP 100の使用デッキ'));
assert.equal(await p.locator('.lb-row .purchase-card-icon.is-empty').count(),5);
for(const width of [1440,1070,820,390,320]){
 await p.setViewportSize({width,height:1000});await p.waitForTimeout(400);
 const layout=await p.evaluate(()=>{const head=document.querySelector('.lb-columns'),row=document.querySelector('#lbList .lb-row');const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,width:r.width,display:s.display}};return{head:[...head.children].map(rect),row:[...row.children].map(rect),overflow:document.documentElement.scrollWidth>innerWidth};});
 for(let i=0;i<6;i++){if(layout.head[i].display==='none')continue;assert(Math.abs(layout.head[i].x-layout.row[i].x)<1,`aligned column ${i} at ${width}: ${JSON.stringify(layout)}`);}assert.equal(layout.overflow,false);if(width>650){const gap=await p.locator('#lbList .lb-row').first().evaluate(row=>row.querySelector('.purchase-card-icon').getBoundingClientRect().left-row.querySelector('.lb-wl').getBoundingClientRect().right);assert(gap>=28,`purchase column gap at ${width}: ${gap}`);}await p.screenshot({path:`${out}/ranking-${width}.png`});
}
await p.setViewportSize({width:1440,height:1000});const trigger=p.locator('.lb-profile-trigger').first();assert.equal(await trigger.evaluate(e=>getComputedStyle(e).borderImageSource),'none');await trigger.hover();assert.equal(await trigger.evaluate(e=>getComputedStyle(e).textDecorationLine),'underline');
const icon=p.locator('.lb-purchases .purchase-card-icon').first();await icon.hover();await p.waitForTimeout(180);assert.equal(await icon.locator('[role=tooltip]').evaluate(e=>getComputedStyle(e).opacity),'1');await p.screenshot({path:out+'/tooltip.png'});await icon.focus();assert.equal(await icon.locator('[role=tooltip]').evaluate(e=>getComputedStyle(e).visibility),'visible');
await trigger.click();await p.locator('.ranked-profile .rp-deck-cards').first().waitFor();assert.equal(await p.locator('.rp-deck').count(),3);assert.equal(await p.locator('.rp-deck-cards .card').count(),27);assert.equal(await p.locator('.rp-stats').innerText(),'10\nランク試合数\n6\nランク勝利数\n3\nランク敗北数\n60%\n勝率');
assert((await p.locator('.rp-rank').innerText()).includes('1036'));await checkHero();await p.evaluate(async()=>{
 const urls=new Set();for(const el of document.querySelectorAll('.ranked-profile-modal,.ranked-profile-modal *')){
  if(el instanceof HTMLImageElement&&el.src)urls.add(el.src);
  for(const pseudo of [null,'::before','::after']){const style=getComputedStyle(el,pseudo);for(const prop of ['backgroundImage','borderImageSource','maskImage'])for(const match of style[prop].matchAll(/url\(["']?([^"')]+)["']?\)/g))urls.add(match[1]);}
 }
 await Promise.all([...urls].map(async url=>{const img=new Image();img.src=url;await img.decode();}));
});await p.waitForTimeout(400);await p.screenshot({path:out+'/profile-full.png'});
await p.locator('.rp-deck-cards .card').first().click();await p.locator('.zoom-wrap').waitFor();await p.keyboard.press('Escape');
await p.locator('#pfClose').click();assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
await p.locator('[data-nav=friends]').evaluate(e=>e.click());await p.locator('[data-pf=a]').waitFor();await ready();await p.locator('[data-pf=a]').click();await p.locator('.rp-deck-cards').first().waitFor();assert.equal(await p.locator('.rp-deck-cards .card').count(),27,'friends opens same profile');await p.locator('#pfClose').click();
for(const mode of ['missing','mixed']){
 profileMode=mode;await p.locator('[data-pf=a]').click();await p.locator('.rp-empty').first().waitFor();
 assert.equal(await p.locator('.rp-deck-heading small').count(),mode==='missing'?0:1,'dates only for recorded decks');
 for(const width of [1440,1070,820]){
  await p.setViewportSize({width,height:1000});await p.waitForTimeout(200);
  const tops=await p.locator('.rp-deck').evaluateAll(els=>els.map(e=>e.lastElementChild.getBoundingClientRect().top));
  assert(Math.max(...tops)-Math.min(...tops)<1,`deck content aligned for ${mode} at ${width}: ${tops}`);
 }
 await p.setViewportSize({width:1070,height:1000});await p.screenshot({path:`${out}/profile-${mode}.png`});await p.locator('#pfClose').click();
}
for(const mode of ['empty','private']){profileMode=mode;await p.locator('[data-pf=a]').click();await p.locator('.ranked-profile').waitFor();await p.waitForTimeout(100);assert.equal(await p.locator('.rp-deck-cards').count(),0);if(mode==='empty'){assert.equal(await p.locator('.rp-deck').count(),3);assert.equal(await p.locator('.purchase-card-icon.is-empty').count(),5);}else assert.equal(await p.locator('.rp-stats').count(),0);await p.screenshot({path:`${out}/profile-${mode}.png`});await p.locator('#pfClose').click();}
profileMode='full';await p.locator('[data-pf=a]').click();await p.locator('.rp-deck-cards').first().waitFor();
for(const width of [1440,390,320]){
 await p.setViewportSize({width,height:844});await p.waitForTimeout(400);assert.equal(await p.locator('.ranked-profile-modal').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 assert.equal(await p.locator('#pfClose').evaluate(e=>getComputedStyle(e).fontSize),'26px');await checkHero();await p.screenshot({path:`${out}/profile-header-${width}.png`});const before=await p.locator('#pfClose').boundingBox();assert(before.width>=44&&before.height>=44);
 await p.locator('.profile-content').evaluate(e=>e.scrollTop=e.scrollHeight);await p.waitForTimeout(100);
 const after=await p.locator('#pfClose').boundingBox();assert(Math.abs(after.y-before.y)<1,'close stays fixed while profile scrolls');
 const x=after.x+after.width/2,y=after.y+after.height/2;
 assert(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('#pfClose')!=null,{x,y}),'close receives pointer after scroll');
 await p.screenshot({path:`${out}/profile-${width}.png`});await p.mouse.click(x,y);assert.equal(await p.locator('.ranked-profile-modal').count(),0);
 await p.locator('[data-pf=a]').click();await p.locator('.rp-deck-cards').first().waitFor();
}await p.locator('#pfClose').click();
delay=500;await p.locator('[data-pf=a]').click();await p.locator('#pfClose').click();await p.waitForTimeout(650);assert.equal(await p.locator('.ranked-profile-modal').count(),0,'late response cannot resurrect modal');profileMode='self';delay=0;
for(const width of [1440,390,320]){
 await p.setViewportSize({width,height:1000});await p.locator('.lounge-user').click();await p.locator('.profile-page-close').waitFor();await ready();await p.waitForTimeout(700);
 await checkHero();const btn=p.locator('.profile-page-close'),rect=await btn.boundingBox(),panel=await p.locator('.lounge-profile .tut').boundingBox();
 assert(rect.width>=44&&rect.height>=44);assert(rect.x>panel.x+panel.width/2&&rect.y<panel.y+70,'page close in upper right');
 await p.screenshot({path:`${out}/profile-page-${width}.png`});await btn.click();await p.locator('.lounge-home').waitFor();
}
assert.deepEqual(errors,[]);
await fs.writeFile(out+'/checks.json',JSON.stringify({origin,api:'synthetic fixtures',widths:[1440,1070,820,390,320],checks:['aligned columns','purchase column spacing','missing deck dates hidden','mixed deck contents aligned','plain name hover','tooltip hover and keyboard','ranked stats include draws','three repeated decks','card inspection','shared friends profile','empty and private data','mobile modal overflow','focus restore','closed modal late response','large rank and MMR right of identity','fixed close after scroll','profile page close returns home'],errors},null,2));console.log('PASS ranking/profile browser checks');
}catch(e){await p.screenshot({path:out+'/failure.png'});console.log(errors);throw e;}finally{await b.close()}
