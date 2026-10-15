import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.TUTORIAL_QA_OUT||'docs/releases/2026-10-15-tutorial-curriculum/menu-qa';await fs.mkdir(out+'/video',{recursive:true});
const fixture=`
import '/src/styles/reading-board.css';import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/card.css';import '/src/styles/game-overlays.css';import '/src/styles/game.css';import '/src/styles/dice.css';import '/src/styles/screens.css';import '/src/styles/mobile.css';import '/src/styles/duel-opening.css';import '/src/styles/lounge.css';import '/src/styles/loungeGame.css';import '/src/styles/loungeStage.css';import '/src/styles/presentation.css';import '/src/styles/deckWorkspace.css';import '/src/styles/cardsWorkspace.css';import '/src/styles/menuApproved.css';import '/src/styles/menuWorkspace.css';
import {mountHome} from '/src/screens/home.ts';import {mountTutorial} from '/src/screens/tutorial.ts';import {mountLounge} from '/src/ui/lounge.ts';import {setLang} from '/src/i18n.ts';import {api} from '/src/net/api.ts';import {TUT_STEPS} from '/src/shared/tutorialSteps.ts';
setLang('ja');const root=document.querySelector('#app');let screen,chrome,keys=[],fail=false,delayed=false,resolveStatus;const calls=[];
api.rankMe=async()=>({season:'2026-10',mmr:1080,tier:'bronze',rank:27,wins:8,losses:4,draws:0});api.me=async()=>null;
api.tutorialStatus=async()=>{if(fail)throw Error('offline');if(delayed)return new Promise(r=>resolveStatus=r);return{keys,credits:keys.length*100,awarded:keys.length*100,legacyPaid:0,amounts:{},offered:true}};
const clear=()=>{screen?.destroy();chrome?.();screen=null;chrome=null;root.replaceChildren();};
const app={root,user:{id:'qa',display:'SEEKER',wins:8,losses:4,credits:0,avatar:'M1'},home(){clear();screen=mountHome(app);chrome=mountLounge(app,'home')},tutorial(){clear();screen=mountTutorial(app);chrome=mountLounge(app,'tutorial')},tutorialGame(i=0){calls.push(i)},deck(){calls.push('deck')},rankedLobby(){calls.push('ranked')},onlineLobby(){calls.push('online')},botGame(){calls.push('bot')},leaderboard(){},cards(){},friends(){},shop(){},settings(){},profile(){}};
window.menuQA={app,calls,clear,progress(n){keys=TUT_STEPS.slice(0,n).map(s=>s.key);app.tutorial()},fail(value){fail=value},delayed(value){delayed=value},resolve(){resolveStatus?.({keys:TUT_STEPS.map(s=>s.key),credits:5000,awarded:5000,legacyPaid:0,amounts:{},offered:true})},language(l){setLang(l)}};app.home();
if(new URLSearchParams(location.search).has('spiritQA')){
 const nativeMedia=window.matchMedia.bind(window);let reduce=false,hidden=false;
 const media=new EventTarget();Object.defineProperty(media,'matches',{get:()=>reduce});media.media='(prefers-reduced-motion: reduce)';
 window.matchMedia=query=>query===media.media?media:nativeMedia(query);
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;right:8px;top:72px;z-index:9999;display:flex;gap:4px;padding:6px;background:#102535;color:white;font:11px sans-serif';
 for(const [label,action] of [
  ['通常',()=>app.home()],
  ['羽ばたき優先',()=>{const r=Math.random;Math.random=()=>.1;app.home();Math.random=r}],
  ['眠気優先',()=>{const r=Math.random;Math.random=()=>.9;app.home();Math.random=r}],
  ['動き低減',()=>{reduce=!reduce;media.dispatchEvent(new Event('change'))}],
  ['非表示テスト',()=>{hidden=!hidden;Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'))}],
  ['WebGLなし',()=>{Object.defineProperty(window,'WebGL2RenderingContext',{configurable:true,value:undefined});app.home()}],
  ['破棄',()=>clear()],
 ]){const b=document.createElement('button');b.textContent=label;b.onclick=action;panel.append(b)}
 document.body.append(panel);app.home();
}

`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'menu-fixture',resolveId(id){if(id==='/@menu-fixture.js')return '\0menu';},load(id){if(id==='\0menu')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.split('?')[0]==='/menu-qa'){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@menu-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5299,strictPort:true,hmr:false}});await server.listen();
if(process.env.LORE_MENU_PREVIEW){console.log('Preview: http://127.0.0.1:5299/menu-qa');await new Promise(()=>{});}
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out+'/video',size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5299/menu-qa');await page.locator('.home-spirit-host canvas').waitFor();await page.waitForTimeout(1500);
 assert.equal(await page.locator('[data-nav=tutorial]').innerText(),'チュートリアル');
 await page.screenshot({path:out+'/home-desktop.png'});
 const first=await page.locator('.home-spirit-host').screenshot();await page.waitForTimeout(1200);const next=await page.locator('.home-spirit-host').screenshot();assert(!first.equals(next),'3D idle must change frames');
 await page.locator('.home-spirit-touch').click();assert.equal(await page.locator('#spiritGreeting, #spiritTutorial, .home-companion-caption').count(),0);await page.waitForTimeout(1500);
 checks.push('Same 3D guide renders, idles, and greets on click');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const still=await page.locator('.home-spirit-host').screenshot();await page.locator('.home-spirit-touch').click();await page.waitForTimeout(900);assert(still.equals(await page.locator('.home-spirit-host').screenshot()),'Reduced motion stays still after greeting');checks.push('Reduced-motion guide remains static, including tap');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(100);const hidden=await page.locator('.home-spirit-host').screenshot();await page.waitForTimeout(600);assert(hidden.equals(await page.locator('.home-spirit-host').screenshot()));await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});checks.push('Hidden document pauses guide rendering');
 await page.locator('[data-nav=tutorial]').click();await page.locator('[data-lesson="0"]:enabled').waitFor();assert.equal(await page.locator('.lesson-tile').count(),36);await page.waitForTimeout(350);const initialStage=await page.locator('#startInter').boundingBox();await page.screenshot({path:out+'/entry-check.png'});assert(initialStage.y+initialStage.height<680,'Start action must be visible on entry');assert.equal(await page.locator('.claimed').count(),0);await page.locator('#startInter').click();assert.equal(await page.evaluate(()=>menuQA.calls.at(-1)),0);
 await page.evaluate(()=>menuQA.progress(4));await page.locator('.claimed').first().waitFor({state:'attached'});assert.equal(await page.locator('.claimed').count(),4);assert.equal(await page.locator('.claimed .lesson-state').first().innerText(),'クリア済み');assert.equal(await page.locator('.is-next [data-lesson]').getAttribute('data-lesson'),'4');await page.locator('#startInter').click();assert.equal(await page.evaluate(()=>menuQA.calls.at(-1)),4);await page.locator('[data-chapter="0"]').click();await page.locator('[data-lesson="1"]').click();assert.equal(await page.evaluate(()=>menuQA.calls.at(-1)),1);await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(400);await page.screenshot({path:out+'/tutorial-desktop.png'});await page.locator('.lounge-content').evaluate(e=>e.scrollTop=300);await page.screenshot({path:out+'/tutorial-stages.png'});checks.push('36 lessons, next incomplete launch, replay, persistent cleared badges');
 for(const [width,height] of [[1280,720],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>menuQA.app.home());await page.waitForTimeout(300);await page.screenshot({path:out+'/home-'+width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);const nav=await page.locator('[data-nav=tutorial]').boundingBox();assert(nav.x>=0&&nav.x+nav.width<=width&&nav.y+nav.height<=height);
  await page.evaluate(()=>menuQA.progress(4));await page.locator('.claimed').first().waitFor({state:'attached'});await page.waitForTimeout(400);await page.screenshot({path:out+'/tutorial-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  for(const b of await page.locator('.lesson-tile:visible').all()){const r=await b.boundingBox();assert(r.x>=0&&r.x+r.width<=width);}
 }
 checks.push('1280/390/320/844 layouts without horizontal overflow or navigation clipping');
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>menuQA.progress(36));await page.locator('.all-cleared').waitFor();assert.equal(await page.locator('.claimed').count(),36);assert.equal(await page.locator('.is-next').count(),0);await page.locator('#startInter').click();assert.equal(await page.evaluate(()=>menuQA.calls.at(-1)),0);await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(400);await page.screenshot({path:out+'/tutorial-all-cleared.png'});
 await page.locator('#ruleNotebook').click();assert(await page.locator('.rule-notebook').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('.rule-notebook').count(),0);checks.push('All-clear state, replay and rules notebook');
 for(const lang of ['en','ko','ja']){await page.evaluate(l=>menuQA.language(l),lang);await page.locator('.claimed').first().waitFor({state:'attached'});assert.equal(await page.locator('.claimed').count(),36);await page.waitForTimeout(400);await page.screenshot({path:out+'/tutorial-'+lang+'.png'});}
 await page.evaluate(()=>{menuQA.fail(true);menuQA.app.tutorial()});await page.getByText('進捗を読み込めませんでした。').waitFor();assert(await page.locator('#startInter').isDisabled());assert.equal(await page.locator('.claimed').count(),0);await page.evaluate(()=>menuQA.fail(false));await page.getByRole('button',{name:'再試行'}).click();await page.locator('.all-cleared').waitFor();checks.push('Three languages and failed progress retry');
 await page.evaluate(()=>{menuQA.delayed(true);menuQA.app.tutorial();menuQA.app.home();menuQA.resolve();menuQA.delayed(false)});await page.waitForTimeout(200);assert.equal(await page.locator('.academy').count(),0);assert.equal(await page.locator('.mana-spirit canvas').count(),1);await page.evaluate(()=>menuQA.clear());assert.equal(await page.locator('canvas').count(),0);checks.push('Late status cannot paint destroyed route; all guide canvases removed');
 await page.addInitScript(()=>Object.defineProperty(window,'WebGL2RenderingContext',{configurable:true,value:undefined}));await page.goto('http://127.0.0.1:5299/menu-qa');await page.locator('.home-spirit-host svg').waitFor();await page.locator('.home-spirit-touch').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#spiritGreeting, #spiritTutorial, .home-companion-caption').count(),0);await page.locator('[data-nav=tutorial]').focus();await page.keyboard.press('Enter');await page.locator('.academy').waitFor();checks.push('No-WebGL fallback and keyboard greeting/tutorial navigation');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks);
}finally{await context.close();await browser.close();await server.close()}
