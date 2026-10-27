import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/qa/2026-10-27-tutorial';await fs.mkdir(out,{recursive:true});
const fixture=`
import '/src/main.ts';
import {App} from '/src/router.ts';
import {TutorialPartController} from '/src/game/tutorialParts.ts';
import {PART_TOURS,tutorialPartKey} from '/src/shared/tutorialParts.ts';
import {mountTutorial} from '/src/screens/tutorial.ts';
import {mountTutorialHomePart,mountTutorialDeckPart,mountTutorialCardsPart} from '/src/screens/tutorialSurface.ts';
import {startBoardLayout} from '/src/ui/layout.ts';
import {mountLounge} from '/src/ui/lounge.ts';
import {setLang} from '/src/i18n.ts';
import {api} from '/src/net/api.ts';
import {botActions,actionChangesState} from '/src/shared/botActions.ts';
import {tutorialActionAllowed} from '/src/shared/tutorialLesson.ts';
import {reduce} from '/src/shared/engine.ts';
setLang('ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
api.rankMe=async()=>null;api.profile=async()=>({self:true,display:'QA',stats_public:true});
const root=document.querySelector('#app'),app=new App(root);app.user={id:'local-guest-user',display:'QA',credits:0};
let ctrl,screen,layout,lounge,part=-1;
const clear=()=>{screen?.destroy?.();screen=null;layout?.();layout=null;ctrl?.destroy();ctrl=null;lounge?.();lounge=null;root.replaceChildren();root.className='';};
app.tutorial=()=>{clear();part=-1;screen=mountTutorial(app);lounge=mountLounge(app,'tutorial');};
app.tutorialPart=i=>{clear();part=i;if(i<11){const host=document.createElement('div');root.append(host);ctrl=new TutorialPartController(host,{onHome:()=>app.tutorial(),onRematch:()=>app.tutorialPart(i)},i,n=>app.tutorialPart(n),app.user.id);layout=startBoardLayout();}else{screen=i===11?mountTutorialHomePart(app):mountTutorialDeckPart(app);lounge=mountLounge(app,i===11?'home':'deck');}};
app.tutorialCards=()=>{clear();part=13;screen=mountTutorialCardsPart(app);lounge=mountLounge(app,'cards');};
window.partsQA={app,get ctrl(){return ctrl;},get part(){return part;},clear,language:setLang,key:i=>tutorialPartKey(i,app.user.id),info(){const tour=ctrl?.tour;return{part,step:tour?.index,tour:!!tour,selector:tour?.steps[tour.index]?.selector,action:tour?.steps[tour.index]?.action??'next',enable:tour?.steps[tour.index]?.enableOn,satisfied:tour?.steps[tour.index]?.until?.(ctrl.run.state),busy:ctrl?.busy,presenting:ctrl?.presenting,intro:ctrl?.intro,finished:ctrl?.finished,phase:ctrl?.run.phase,scene:ctrl?.run.scene,runStep:ctrl?.run.step,pending:ctrl?.run.state.pending?.reason,hand:ctrl?.run.state.players[0].hand.map(c=>c.id),n:ctrl?.run.actions.length};},action(){const run=ctrl.run;return botActions(run.state).filter(a=>tutorialActionAllowed(run,a)).find(a=>{const next=reduce(run.state,a);return next.state.rng!==run.state.rng||actionChangesState(run.state,next.state);});}};
app.tutorial();
`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'parts-fixture',resolveId(id){if(id==='/@parts-fixture.js')return '\0parts';},load(id){if(id==='\0parts')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/parts-qa'){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@parts-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5299,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}});
const p=await context.newPage();p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>!partsQA.ctrl||(!partsQA.ctrl.busy&&!partsQA.ctrl.presenting&&document.querySelector('[data-scene-ready="true"]')&&!document.querySelector('.asset-loading-cover,.game-loading')));
const clickVisible=async selector=>{const l=p.locator(selector);await l.first().waitFor({state:'visible'});for(let i=0;i<await l.count();i++)if(await l.nth(i).isVisible()){await l.nth(i).click();return;}throw Error('No visible '+selector);};
const act=async action=>{
 if(action.type==='play'){
  const id=await p.evaluate(a=>partsQA.ctrl.run.state.players[0].hand[a.idx].id,action);
  if(!await p.evaluate(()=>!!document.querySelector('.game.hand-open')))await p.locator('#hand .card').first().click();
  await p.waitForTimeout(350);
  const b=await p.locator('#hand .card[data-card-id="'+id+'"]').first().boundingBox();assert(b,'hand bounds');
  const field=await p.locator('#meRow .zone-mon').boundingBox();assert(field);await p.mouse.move(b.x+b.width/2,b.y+b.height*.48);await p.mouse.down();await p.mouse.move(field.x+field.width/2,field.y+field.height/2,{steps:14});await p.mouse.up();
 }else if(action.type==='buyMarket'||action.type==='buySupply'){
  const zone=action.type==='buyMarket'?'#fixedMarket':'#supplyMarket';
  await p.locator(zone+' .card').nth(action.i).dblclick({delay:100});
 }else if(action.type==='refresh')await p.locator('#refreshBtn').click();
 else if(action.type==='endTurn')await p.locator('#endBtn').click();
 else if(action.type==='attack'){
  const attacker=p.locator('#meRow .zone-mon .card[data-uid="'+action.uid+'"]');
  if(await p.locator('#oppRow .zone-mon .card').count()){
   const a=await attacker.boundingBox(),b=await p.locator('#oppRow .zone-mon .card').first().boundingBox();
   await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await p.mouse.up();
  }else await attacker.click();
 }
 else await p.evaluate(a=>partsQA.ctrl.submit(a),action);
};
const findings=[];
try{
 await p.goto('http://127.0.0.1:5299/parts-qa');await p.waitForSelector('[data-part="0"]');await p.screenshot({path:out+'/menu-ja-desktop.png',fullPage:true});
 await p.locator('[data-part="'+(process.env.TUTORIAL_START??0)+'"]').click();await ready();
 for(let n=0;n<350;n++){
  await ready();if(await p.locator('.cast-review .btn-gold').count()){if(await p.locator('.cast-review .btn-gold').isDisabled())await p.locator('.cast-review [data-choice]').first().click();await p.locator('.cast-review .btn-gold').click();await p.waitForTimeout(700);continue;}const s=await p.evaluate(()=>partsQA.info());if(s.part>=11)break;
  console.log(JSON.stringify(s));
  if(s.tour){
   if(s.part===0&&s.step===2){assert(await p.locator('.game.log-open').count());await p.screenshot({path:out+'/log-whole-panel.png'});}
   if(s.part===1&&s.step===2&&s.phase==='play')await p.screenshot({path:out+'/mana-separate-highlights.png'});
   if(s.action==='click')await clickVisible(s.selector);
   else if(s.action==='play'){
    if(!s.satisfied){const action=await p.evaluate(()=>partsQA.action());console.log('ACTION',action);if(action)await act(action);}
   }else{
    if(s.enable)await p.locator(s.enable.selector).evaluate(el=>{el.value='0.3';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await p.locator('.tutorial-tour-next').click();
   }
   await p.waitForTimeout(700);
  }else{
   if(s.intro||s.finished||s.phase==='review')await p.locator('.part-speech footer button').last().click();
   else {const action=await p.evaluate(()=>partsQA.action());console.log('ACTION',action);if(action)await act(action);}
   await p.waitForTimeout(400);
  }
 }
 assert.equal(await p.evaluate(()=>partsQA.part),11,'all board parts finished');
 await p.screenshot({path:out+'/home-tour.png'});
 // Tours do not let a keyboard/programmatic click start a real duel or save a deck.
 await p.locator('#ranked').evaluate(el=>el.click());assert.equal(await p.evaluate(()=>partsQA.part),11);
 for(let n=0;n<20&&await p.locator('.tutorial-tour-next').count();n++){
  console.log('MENU',await p.locator('.tutorial-tour-bubble h2').textContent());await p.locator('.tutorial-tour-next').click();await p.waitForTimeout(350);
 }
 assert.equal(await p.evaluate(()=>partsQA.part),-1);
 if(!process.env.TUTORIAL_START)assert.equal(await p.evaluate(()=>Array.from({length:13},(_,i)=>localStorage.getItem(partsQA.key(i))).filter(Boolean).length),13);
 for(const lang of ['ja','en','ko'])for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await p.setViewportSize(viewport);await p.evaluate(lang=>partsQA.language(lang),lang);await p.evaluate(()=>partsQA.app.tutorial());
  await p.screenshot({path:out+'/menu-'+lang+'-'+viewport.width+'.png',fullPage:true});
  await p.evaluate(()=>partsQA.app.tutorialPart(1));await ready();
  await p.locator('.tutorial-tour-next').click();await clickVisible('#hand');await p.waitForTimeout(500);
  await p.screenshot({path:out+'/mana-'+lang+'-'+viewport.width+'.png'});
  const shade=await p.locator('.tutorial-tour-shade').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,blur:getComputedStyle(el).backdropFilter,clip:getComputedStyle(el).clipPath}));
  assert.equal(shade.bg,'rgba(0, 0, 0, 0.5)');assert.equal(shade.blur,'none');assert(shade.clip.includes('evenodd'));
  const b=await p.locator('.tutorial-tour-bubble').boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1);
  await act({type:'play',idx:0});await p.waitForFunction(()=>partsQA.ctrl.run.state.players[0].mana===2&&!partsQA.ctrl.busy);
  findings.push({lang,width:viewport.width,shade,manaAfter:2});
  await p.locator('.tutorial-tour-skip').click();assert.equal(await p.locator('.tutorial-tour-layer').count(),0);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/'+(process.env.TUTORIAL_START?'browser-focused.json':'browser.json'),JSON.stringify({passed:true,fullRun:!process.env.TUTORIAL_START,startPart:Number(process.env.TUTORIAL_START??0),findings,errors},null,2));console.log('PASS all parts through browser; three languages, desktop/mobile, overlay cleanup and menu isolation');
}catch(e){await p.screenshot({path:out+'/failure.png',fullPage:true});console.error('STATE',await p.evaluate(()=>partsQA.info()).catch(()=>null));console.error('PAGE ERRORS',errors);throw e;}
finally{await context.close();await browser.close();await server.close();}
