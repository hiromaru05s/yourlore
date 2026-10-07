import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'docs/audits/2026-10-08-target-choice/staging',origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz';await fs.mkdir(out,{recursive:true});
const {build}=await import('esbuild'),tmp=await fs.mkdtemp('/tmp/lore-staging-target-');
await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/e.mjs'});
const E=await import(tmp+'/e.mjs');await fs.rm(tmp,{recursive:true,force:true});
const fixture=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'自分'},p1:{id:'b',name:'相手'}}).state;
fixture.turn=3;fixture.pending=null;for(const p of fixture.players)Object.assign(p,{openingDrawReady:false,hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:0,shield:0});
fixture.players[0].hand=[{...E.DB.SELECTED_SWORD,uid:'stage-sword'}];fixture.players[0].removed=Array.from({length:4},(_,i)=>({...E.STARTERS.STARTER_TRASH,uid:'stage-cull-'+i}));
fixture.players[1].field=[{...E.DB.M1,uid:'stage-enemy',dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0}];
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});page.setDefaultTimeout(120000);const errors=[],frames=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/\/modular\/base-.*\.png$/.test(r.url()))frames.push({url:r.url(),status:r.status()});});
try{
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.removeItem('lore_help_callout_seen');localStorage.setItem('lore_lang','ja');});
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'duel-regression-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default'}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:p==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
 await page.goto(origin);await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();if(await page.locator('#ranked').isVisible())await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();await page.locator('#diffStart').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');
 assert.equal(await page.locator('.help-callout').count(),0);assert.equal(await page.locator('.turn-toast').count(),0);for(const type of ['mon','spell','quest','trap'])assert(frames.some(f=>f.url.endsWith('base-'+type+'.png')&&f.status===200),type+' frame loaded before play');
 const chest=page.locator('#hand .card[data-card-id=STARTER_CHEST]').first();await chest.waitFor();
 const uid=await chest.getAttribute('data-uid'),count=await page.locator('#hand > .card').count();
 const box=await chest.boundingBox();assert(box);await page.mouse.move(box.x+box.width/2,Math.min(880,box.y+box.height/2));await page.mouse.down();await page.mouse.move(640,440,{steps:18});await page.mouse.up();
 await page.locator('.cast-review').waitFor();assert((await page.locator('.cast-review-note').textContent()).includes('確定するまで'));
 await page.screenshot({path:out+'/staging-cast-review.png'});await page.locator('.cast-review .btn-ghost').click();await page.locator('.cast-review').waitFor({state:'detached'});
 assert.equal(await page.locator('#hand > .card').count(),count);assert.equal(await page.locator(`#hand .card[data-uid="${uid}"]`).count(),1);
 await page.screenshot({path:out+'/staging-board.png'});assert.deepEqual(errors,[]);await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(g=>{const c=atelier.controller;c.show(g);c.introShown=true;window.submitted=[];c.submit=a=>submitted.push(a);},fixture);
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>{atelier.controller.onPlay('stage-sword');});await page.locator('.cast-review').waitFor();assert(await page.locator('.cast-review .btn-gold').isDisabled());
  await page.locator('[data-choice=stage-enemy]').click();assert((await page.locator('.cast-review-caution').textContent()).includes('相手のモンスターを強化'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+`/staging-sword-${viewport.width}.png`});
  await page.locator('.cast-review .btn-ghost').click();assert.equal(await page.evaluate(()=>submitted.length),0);assert.equal(await page.evaluate(()=>atelier.controller.state.players[0].mana),30);
 }
 await page.evaluate(()=>{atelier.controller.onPlay('stage-sword');});await page.locator('[data-choice=stage-enemy]').click();await page.locator('.cast-review .btn-gold').click();
 const submitted=await page.evaluate(()=>window.submitted);assert.deepEqual(submitted,[{type:'play',idx:0,sourceUid:'stage-sword',targets:['stage-enemy']}]);
 const result=E.reduce(fixture,submitted[0]);assert.equal(result.state.players[1].field[0].tempAtk,4);assert.equal(result.state.players[0].mana,29);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/staging-browser.json',JSON.stringify({origin,frames,errors,checks:['Risky card dragged from hand opens pre-cast review','Cancel keeps source card and hand count unchanged','Deployed controller: enemy-only Sword selection, warning, zero-action cancel, atomic commit, desktop/mobile no overflow'],boundary:'Deployed BOT board startup, actual network frames, no help/countdown overlays. Authentication/API responses and Sword board are fixtures. Deployed controller submission is captured and evaluated with the matching source engine; no authenticated online match.'},null,2));console.log('PASS deployed BOT startup and real drag-to-cast review cancellation');
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
