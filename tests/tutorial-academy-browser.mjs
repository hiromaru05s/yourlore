import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {tutorialTranscripts} from './fixtures/tutorialCurriculum.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.TUTORIAL_QA_OUT||'docs/releases/2026-10-19-tutorial-play-flow/qa';await fs.mkdir(out,{recursive:true});
const fixture=`
import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/card.css';import '/src/styles/passives.css';import '/src/styles/game-overlays.css';import '/src/styles/game.css';import '/src/styles/screens.css';import '/src/styles/mobile.css';import '/src/styles/reading-board.css';import '/src/styles/presentation.css';import '/src/styles/lounge.css';import '/src/styles/loungeStage.css';
import {mountTutorial,openRuleNotebook} from '/src/screens/tutorial.ts';import {mountTutorialWelcome} from '/src/screens/tutorialWelcome.ts';import {TutorialController} from '/src/game/tutorial.ts';import {mountDuelSpiritGuide} from '/src/ui/duelSpiritGuide.ts';import {startBoardLayout} from '/src/ui/layout.ts';import {setLang} from '/src/i18n.ts';import {api} from '/src/net/api.ts';import {replayLesson,currentScene} from '/src/shared/tutorialLesson.ts';import {TUT_STEPS} from '/src/shared/tutorialSteps.ts';
setLang('ja');localStorage.setItem('lore:tutorial:pace','full');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
const root=document.querySelector('#app');let screen,layout,ctrl,guide,keys=[],credits=0,failed=false;
api.tutorialStatus=async()=>({keys,credits,awarded:credits,legacyPaid:0,amounts:Object.fromEntries(TUT_STEPS.map(s=>[s.id,s.reward])),offered:keys.length>0});api.tutorialDecision=async decision=>{keys.push('tutorial:v3:intro:'+decision);return{ok:true};};api.completeTutorial=async(id,actions)=>{if(failed){failed=false;throw Error('temporary failure');}if(!replayLesson(id,actions))throw Error('INVALID REPLAY');const key=TUT_STEPS.find(s=>s.id===id).key;const amount=keys.includes(key)?0:TUT_STEPS.find(s=>s.id===id).reward;if(amount)keys.push(key);credits+=amount;return{amount,credits,granted:amount>0};};
const clear=()=>{screen?.destroy?.();screen=null;layout?.();layout=null;guide?.();guide=null;ctrl?.destroy();ctrl=null;root.innerHTML='';root.className='';};
const app={root,user:{id:'qa',credits:0},home(){clear();root.innerHTML='<p id="home">HOME</p>';},botGame(){},tutorial(){clear();root.className='lounge-shell selected-menu lounge-tutorial';screen=mountTutorial(app);},tutorialGame(lesson=0){clear();ctrl=new TutorialController(root,{onHome:()=>app.tutorial(),onRematch:()=>app.tutorialGame(lesson)},'SEEKER',{lesson,accountId:'qa',onNext:i=>app.tutorialGame(i),onCredits:c=>app.user.credits=c});layout=startBoardLayout();}};
window.academyQA={app,lesson(id){app.tutorialGame(TUT_STEPS.findIndex(s=>s.id===id));},get ctrl(){return ctrl;},answer(){return currentScene(ctrl.run).question?.correct;},get credits(){return credits;},get keys(){return keys;},clear,welcome(){clear();screen=mountTutorialWelcome(app);},language(lang){setLang(lang);},fail(){failed=true;},guide(){root.querySelector(".academy-coach").style.display="none";guide=mountDuelSpiritGuide(root,()=>ctrl.guideContext());}};app.tutorial();
`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'academy-fixture',resolveId(id){if(id==='/@academy-fixture.js')return '\0academy';},load(id){if(id==='\0academy')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/academy-qa'){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#102333"><div id="app"></div><script type="module" src="/@academy-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5298,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out+'/video',size:{width:1280,height:800}}});
const p=await context.newPage();p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
const settle=async()=>{await p.waitForFunction(()=>{const c=academyQA.ctrl;return c&&!c.presenting&&document.querySelector('[data-scene-ready="true"]')&&!document.querySelector('.asset-loading-cover');});await p.waitForTimeout(300);};
const drag=async(id)=>{
 await p.waitForFunction(id=>!!document.querySelector('#hand .card[data-card-id="'+id+'"]'),id);
 // A press expands the compact hand; playing is genuinely drag-only.
 
 if(!await p.evaluate(()=>academyQA.ctrl.view.handOpen)) {await p.locator('#hand .card').first().click();await p.waitForTimeout(250);}
 const card=p.locator('#hand .card[data-card-id="'+id+'"]').first();const b=await card.boundingBox();assert(b,'hand bounds');
 const size=p.viewportSize();const target={x:0,y:size.height*.55,width:size.width,height:40};
 await p.mouse.move(b.x+b.width*.5,b.y+b.height*.48);await p.mouse.down();await p.mouse.move(target.x+target.width*.5,target.y+target.height*.55,{steps:12});await p.mouse.up();
 await p.waitForTimeout(350);
};
const transcripts=await tutorialTranscripts();
const ready=()=>p.waitForFunction(()=>academyQA.ctrl&&!academyQA.ctrl.presenting);
const start=async()=>{await ready();await p.locator('[data-start]').click();assert.equal(await p.locator('.tutorial-dialog[open]').count(),0);};
const answer=async()=>{await ready();const choice=await p.evaluate(()=>academyQA.answer());await p.locator('[data-answer="'+choice+'"]').click();};
const finish=async(id)=>{
 for(let n=0;n<260;n++){
  await ready();const s=await p.evaluate(()=>({id:academyQA.ctrl.run.id,done:academyQA.ctrl.run.done,n:academyQA.ctrl.run.actions.length,turn:academyQA.ctrl.state.cur,phase:academyQA.ctrl.run.phase,popup:academyQA.ctrl.coach.open}));
  if(s.done)break;assert.equal(s.id,id,'no surprise automatic lesson handoff');
  if(s.popup&&s.phase==='play'){await start();continue;}
  if(s.turn===1&&s.phase==='play'){await p.waitForTimeout(100);continue;}
  const a=transcripts[id][s.n];assert(a,id+' missing action '+s.n);
  if(a.type==='answer')await p.locator('[data-answer="'+a.choice+'"]').click();
  else if(a.type==='continueLesson')await p.locator('[data-continue]').click();
  else await p.evaluate(a=>academyQA.ctrl.submit(a),a);
 }
 await p.waitForSelector('[data-next]');assert(await p.evaluate(()=>academyQA.ctrl.run.done&&academyQA.ctrl.settled));
};
try{
 await p.goto('http://127.0.0.1:5298/academy-qa');await p.waitForSelector('#startInter:not([disabled])');await p.screenshot({path:out+'/menu-desktop.png',fullPage:true});
 await p.locator('#ruleNotebook').click();await p.locator('.notebook-search input').fill('リフト');assert(await p.locator('.tut-sec:visible').count()>0);await p.locator('.rule-notebook [data-close]').click();
 await p.locator('#startInter').click();await settle();assert(await p.locator('.tutorial-dialog').isVisible());assert.equal(await p.locator('.tut-coach').count(),0,'no corner coach');
 await p.screenshot({path:out+'/first-move.png'});
 // Instructions pause gameplay and trap keyboard focus; Escape resumes the same task.
 const before=await p.evaluate(()=>academyQA.ctrl.run.actions.length);await p.evaluate(()=>academyQA.ctrl.submit({type:'endTurn'}));assert.equal(await p.evaluate(()=>academyQA.ctrl.run.actions.length),before);
 await p.keyboard.press('Escape');assert.equal(await p.locator('.tutorial-dialog[open]').count(),0);await p.locator('[data-guide]').click();await start();
 await p.locator('#endBtn').click();assert(await p.locator('.tutorial-dialog').isVisible());assert(await p.locator('.coach-redirect').isVisible());await start();
 await drag('M4');await p.waitForSelector('[data-answer]');await ready();assert((await p.locator('#tutorial-message').innerText()).includes('召喚成功'));await p.screenshot({path:out+'/summon-result.png'});
 await p.locator('[data-answer="'+(1-await p.evaluate(()=>academyQA.answer()))+'"]').click();assert(await p.locator('.coach-redirect').isVisible());assert.equal(await p.evaluate(()=>academyQA.ctrl.run.done),false);await answer();
 await p.waitForSelector('[data-next]');assert.equal(await p.evaluate(()=>academyQA.credits),100);await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>academyQA.ctrl.run.id),'summon','clear stays visible');
 await p.evaluate(()=>{window.originalController=academyQA.ctrl;window.originalSpirit=document.querySelector('.coach-spirit canvas');});
 await p.locator('[data-next]').click();await ready();assert.equal(await p.evaluate(()=>academyQA.ctrl.run.id),'attack');await start();await p.locator('#meRow .zone-mon .card').first().click();await p.waitForSelector('[data-answer]');await p.screenshot({path:out+'/attack-result.png'});await answer();await p.waitForSelector('[data-next]');
 // Remaining curriculum: actual engine/controller actions and UI popup handoffs.
 await p.locator('.tutorial-tools>summary').click();await p.locator('[data-pace]').click();assert.equal(await p.evaluate(()=>academyQA.ctrl.fast),true);
 await p.locator('[data-next]').click();await ready();await start();await p.locator('#meRow .zone-mon .card').first().click();await p.waitForFunction(()=>!!academyQA.ctrl.state.pending);assert.equal(await p.locator('.tutorial-dialog[open]').count(),0,'target remains clickable');await p.locator('#oppRow .zone-mon .card').first().click();await p.waitForSelector('[data-continue]');await p.locator('[data-continue]').click();await start();await p.locator('#meRow .zone-mon .card').first().click();await p.waitForFunction(()=>!!academyQA.ctrl.state.pending);await p.locator('#oppRow .zone-mon .card').first().click();await p.waitForSelector('[data-answer]');await answer();await p.waitForSelector('[data-next]');
 const lessons=['summon','attack','combat'];
 for(const id of Object.keys(transcripts).slice(3)){
  await p.locator('[data-next]').click();await ready();assert.equal(await p.evaluate(()=>academyQA.ctrl.run.id),id);await finish(id);lessons.push(id);console.log('FLOW',id);
  assert(await p.evaluate(()=>academyQA.ctrl===window.originalController&&document.querySelector('.coach-spirit canvas')===window.originalSpirit));
 }
 assert.equal(lessons.length,36);assert.equal(await p.evaluate(()=>academyQA.credits),5000);await p.screenshot({path:out+'/all-complete.png'});
 // Resume, wrong action, target cancellation and reward retry.
 await p.evaluate(()=>{localStorage.removeItem('lore:tutorial:v3:run:qa:mana');academyQA.lesson('mana');});await settle();await start();await drag('STARTER_MANA');await p.waitForFunction(()=>!academyQA.ctrl.presenting&&academyQA.ctrl.run.step===1);assert(await p.locator('.tutorial-dialog').isVisible());await p.screenshot({path:out+'/mana-next-move.png'});
 await p.evaluate(()=>academyQA.lesson('mana'));await settle();assert.equal(await p.evaluate(()=>academyQA.ctrl.run.step),1);await start();await p.locator('#endBtn').click();await p.waitForSelector('[data-answer]');await answer();await p.waitForSelector('[data-next]');assert.equal(await p.evaluate(()=>academyQA.credits),5000,'no duplicate rewards');
 await p.evaluate(()=>{academyQA.fail();academyQA.lesson('attack');});await settle();await start();await p.locator('#meRow .zone-mon .card').first().click();await p.waitForSelector('[data-answer]');await answer();await p.waitForSelector('[data-retry]');await p.locator('[data-retry]').click();await p.waitForSelector('[data-next]');
 await p.evaluate(actions=>{localStorage.setItem('lore:tutorial:v3:run:qa:rift',JSON.stringify(actions));academyQA.lesson('rift');},transcripts.rift.slice(0,2));await settle();await start();await p.evaluate(a=>academyQA.ctrl.submit(a),transcripts.rift[2]);await ready();await p.locator('.picker-modal .btn-ghost').click();await p.waitForSelector('.picker-modal');assert.equal(await p.locator('.tutorial-dialog[open]').count(),0);await p.locator('.picker-modal .card[data-card-id="M1"]').click();await p.waitForSelector('[data-continue]');
 for(const [width,height] of [[1280,720],[1024,768],[390,844],[844,390]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>academyQA.app.tutorial());await p.waitForSelector('#startInter:not([disabled])');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/menu-'+width+'.png',fullPage:true});
  await p.evaluate(()=>academyQA.lesson('dew'));await settle();const b=await p.locator('.tutorial-dialog').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1);await p.screenshot({path:out+'/popup-'+width+'.png'});await start();const g=await p.locator('.tutorial-goal').boundingBox();assert(g.x>=0&&g.y>=0&&g.x+g.width<=width+1);await p.screenshot({path:out+'/play-'+width+'.png'});
 }
 for(const lang of ['en','ko']){await p.evaluate(lang=>{academyQA.language(lang);academyQA.lesson('summon');},lang);await settle();assert(!(await p.locator('.tutorial-dialog').innerText()).includes('undefined'));await p.screenshot({path:out+'/popup-'+lang+'.png'});}
 await p.evaluate(()=>academyQA.clear());assert.equal(await p.locator('.tutorial-dialog,.tutorial-goal,.tut-glow').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser.json',JSON.stringify({lessons,reward:5000,physicalActions:['summon drag','direct attack','combat target selection','Attune drag','end turn','required picker cancellation'],controllerCoverage:'All 36 lessons / 66 scenes using validated transcripts with visible popup handoffs',checks:['modal blocks gameplay','Escape resumes task','wrong-action recovery','wrong-answer recovery','explicit lesson completion','same controller and guide','mid-lesson reload','reward dedupe and retry','four window sizes','three languages','teardown'],errors},null,2));console.log('PASS tutorial play flow');
}catch(e){console.error(e,errors);await p.screenshot({path:out+'/failure.png',fullPage:true});console.error(await p.evaluate(()=>({run:academyQA.ctrl?.run&&{id:academyQA.ctrl.run.id,phase:academyQA.ctrl.run.phase,step:academyQA.ctrl.run.step,scene:academyQA.ctrl.run.scene,actions:academyQA.ctrl.run.actions},text:document.body.innerText.slice(-3500)})));throw e;}finally{await context.close();await browser.close();await server.close();}
