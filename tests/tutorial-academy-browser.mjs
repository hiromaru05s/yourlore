import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.TUTORIAL_QA_OUT||'docs/releases/2026-10-13-tutorial/qa';await fs.mkdir(out,{recursive:true});
const fixture=`
import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/card.css';import '/src/styles/passives.css';import '/src/styles/game-overlays.css';import '/src/styles/game.css';import '/src/styles/screens.css';import '/src/styles/mobile.css';import '/src/styles/reading-board.css';import '/src/styles/presentation.css';import '/src/styles/lounge.css';import '/src/styles/loungeStage.css';
import {mountTutorial,openRuleNotebook} from '/src/screens/tutorial.ts';import {mountTutorialWelcome} from '/src/screens/tutorialWelcome.ts';import {TutorialController} from '/src/game/tutorial.ts';import {mountDuelSpiritGuide} from '/src/ui/duelSpiritGuide.ts';import {startBoardLayout} from '/src/ui/layout.ts';import {setLang} from '/src/i18n.ts';import {api} from '/src/net/api.ts';import {replayLesson} from '/src/shared/tutorialLesson.ts';import {TUT_STEPS} from '/src/shared/tutorialSteps.ts';
setLang('ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
const root=document.querySelector('#app');let screen,layout,ctrl,guide,keys=[],credits=0,failed=false;
api.tutorialStatus=async()=>({keys,credits,offered:keys.length>0});api.tutorialDecision=async decision=>{keys.push('tutorial:v2:intro:'+decision);return{ok:true};};api.completeTutorial=async(id,actions)=>{if(failed){failed=false;throw Error('temporary failure');}if(!replayLesson(id,actions))throw Error('INVALID REPLAY');const key=TUT_STEPS.find(s=>s.id===id).key;const amount=keys.includes(key)?0:250;if(amount)keys.push(key);credits+=amount;return{amount,credits,granted:amount>0};};
const clear=()=>{screen?.destroy?.();screen=null;layout?.();layout=null;guide?.();guide=null;ctrl?.destroy();ctrl=null;root.innerHTML='';root.className='';};
const app={root,user:{id:'qa',credits:0},home(){clear();root.innerHTML='<p id="home">HOME</p>';},botGame(){},tutorial(){clear();screen=mountTutorial(app);},tutorialGame(lesson=0){clear();ctrl=new TutorialController(root,{onHome:()=>app.tutorial(),onRematch:()=>app.tutorialGame(lesson)},'SEEKER',{lesson,onNext:i=>app.tutorialGame(i),onCredits:c=>app.user.credits=c});layout=startBoardLayout();}};
window.academyQA={app,get ctrl(){return ctrl;},get credits(){return credits;},get keys(){return keys;},clear,welcome(){clear();screen=mountTutorialWelcome(app);},language(lang){setLang(lang);},fail(){failed=true;},guide(){root.querySelector(".academy-coach").style.display="none";guide=mountDuelSpiritGuide(root,()=>ctrl.guideContext());}};app.tutorial();
`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'academy-fixture',resolveId(id){if(id==='/@academy-fixture.js')return '\0academy';},load(id){if(id==='\0academy')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/academy-qa'){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#102333"><div id="app"></div><script type="module" src="/@academy-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5298,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const p=await context.newPage();p.setDefaultTimeout(60000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
const settle=async()=>{await p.waitForFunction(()=>{const c=academyQA.ctrl;return c&&document.querySelector('[data-scene-ready="true"]')&&!document.querySelector('.asset-loading-cover');});await p.waitForTimeout(300);};
const drag=async(id)=>{
 await p.waitForFunction(id=>!!document.querySelector('#hand .card[data-card-id="'+id+'"]'),id);
 // A press expands the compact hand; playing is genuinely drag-only.
 
 if(!await p.evaluate(()=>academyQA.ctrl.view.handOpen)) {await p.locator('#hand .card').first().click();await p.waitForTimeout(250);}
 const card=p.locator('#hand .card[data-card-id="'+id+'"]').first();const b=await card.boundingBox();assert(b,'hand bounds');
 const size=p.viewportSize();const target={x:0,y:size.height*.55,width:size.width,height:40};
 await p.mouse.move(b.x+b.width*.5,b.y+b.height*.48);await p.mouse.down();await p.mouse.move(target.x+target.width*.5,target.y+target.height*.55,{steps:12});await p.mouse.up();
 await p.waitForTimeout(350);
};
try {
 await p.goto('http://127.0.0.1:5298/academy-qa');await p.waitForSelector('.academy-lessons li');await p.waitForTimeout(600);
 await p.screenshot({path:out+'/academy-desktop.png',fullPage:true});
 assert.equal(await p.locator('.academy-spirit canvas').count(),1,'real WebGL character');
 await p.locator('#ruleNotebook').click();assert.equal(await p.locator('.rule-notebook b').first().evaluate(el=>getComputedStyle(el).color),'rgb(37, 59, 73)');await p.screenshot({path:out+'/notebook-desktop.png'});await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').count(),0);
 await p.evaluate(()=>academyQA.welcome());await p.locator('[data-no]').click();assert((await p.locator('.welcome-copy').innerText()).includes('受け取れません'));await p.screenshot({path:out+'/skip-confirmation.png'});await p.locator('[data-back]').click();await p.locator('[data-yes]').click();await p.waitForSelector('.academy');
 await p.locator('#startInter').click();await settle();await p.screenshot({path:out+'/lesson-mana-desktop.png'});
 await drag('STARTER_MANA');await p.waitForSelector('[data-next]');assert.equal(await p.evaluate(()=>academyQA.credits),250);await p.screenshot({path:out+'/lesson-cleared.png'});
 // Target selection and attack are exercised through real board clicks.
 await p.evaluate(()=>academyQA.app.tutorialGame(2));await settle();await p.locator('#meRow .zone-mon .card').first().click();await p.waitForFunction(()=>!!academyQA.ctrl.state.pending);await p.locator('#oppRow .zone-mon .card').first().click();await p.waitForSelector('[data-next]');
 // Paid lessons remain replayable and never pay twice.
 await p.evaluate(()=>academyQA.app.tutorialGame(0));await settle();await drag('STARTER_MANA');await p.waitForSelector('[data-next]');assert.equal(await p.evaluate(()=>academyQA.credits),500);
 await p.evaluate(()=>academyQA.app.tutorial());await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.screenshot({path:out+'/academy-mobile.png',fullPage:true});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile horizontal overflow');
 await p.locator('#ruleNotebook').click();await p.screenshot({path:out+'/notebook-mobile.png'});await p.keyboard.press('Escape');
 await p.evaluate(()=>academyQA.app.tutorialGame(0));await settle();await p.screenshot({path:out+'/lesson-mana-mobile.png'});await p.locator('[data-collapse]').click();await drag('STARTER_MANA');await p.waitForSelector('[data-next]');
 await p.evaluate(()=>academyQA.app.tutorialGame(5));await settle();await p.locator('[data-collapse]').click();await p.locator('#refreshBtn').click();await p.waitForSelector('[data-next]');
 for(const lang of ['ko','en']){await p.evaluate(lang=>{academyQA.language(lang);academyQA.app.tutorial();},lang);await p.waitForTimeout(200);assert.equal(await p.locator('.academy-lessons li').count(),12);await p.screenshot({path:out+'/academy-'+lang+'.png',fullPage:true});}
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{academyQA.language('ja');academyQA.app.tutorial();});await p.waitForTimeout(400);await p.screenshot({path:out+'/spirit-reduced.png'});
 await p.setViewportSize({width:1280,height:900});await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>academyQA.app.tutorialGame(1));await settle();await p.evaluate(()=>academyQA.guide());await p.locator('.duel-spirit-help>button').click();await p.screenshot({path:out+'/duel-guide.png'});await p.evaluate(()=>academyQA.clear());assert.equal(await p.locator('.mana-spirit canvas').count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({checks:['desktop/mobile notebook and curriculum','WebGL spirit','two-stage skip confirmation','real drag to play','real attack target selection','reward dedupe','mobile drag and offer refresh','three languages','reduced motion','guide teardown'],errors},null,2));console.log('PASS academy browser',out);
}finally{await context.close();await browser.close();await server.close();}
