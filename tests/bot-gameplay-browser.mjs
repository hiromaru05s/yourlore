import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5276';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for(const difficulty of ['hard','hell']) {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('requestfailed',r=>console.error('requestfailed',new URL(r.url()).pathname,r.failure()?.errorText));
  page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror',e.message);});
  page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[playback]'))errors.push(m.text());});
  await page.route('**/bot-gameplay-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div></body></html>'}));
  await page.goto(origin+'/bot-gameplay-fixture');console.log('fixture loaded',difficulty);
  await page.evaluate(async difficulty=>{
   for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board','duel-opening','lounge','loungeGame','loungeStage','presentation'])await import('/src/styles/'+css+'.css');
   const {LocalController}=await import('/src/game/controller.ts'),{startBoardLayout}=await import('/src/ui/layout.ts'),{actingSide}=await import('/src/shared/engine.ts');
   const {setLang}=await import('/src/i18n.ts');setLang('ja');
   localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
   // Fixed random setup: human first, first legal roster. Worker policy keeps its own RNG.
   const oldRandom=Math.random;Math.random=()=>.1;
   const c=new LocalController(document.getElementById('app'),{onHome:()=>{},onRematch:()=>{}},'QA',undefined,difficulty);Math.random=oldRandom;c.introShown=true; // Opening cinematic is outside this BOT lifecycle test.
   window.qa={c,actingSide,stop:startBoardLayout(),changes:[],ticks:0};
   const apply=c.applyResult.bind(c);c.applyResult=(r,...args)=>{qa.changes.push({turn:r.state.turn,side:actingSide(r.state),pending:r.state.pending?.kind??null});return apply(r,...args);};
   qa.timer=setInterval(()=>qa.ticks++,10);
  },difficulty);console.log('controller ready',difficulty);
  try { await page.waitForFunction(()=>window.qa&&!qa.c.openingLocked&&qa.c.state.cur===0,null,{timeout:60000}); } catch(e) { console.error(await page.evaluate(()=>({cur:qa.c.state.cur,turn:qa.c.state.turn,locked:qa.c.openingLocked,active:qa.c.openingActive,pending:qa.c.state.pending,busy:qa.c.botBusy,html:document.body.innerText.slice(-2000)})),errors);throw e; }
  await page.waitForSelector('.duel-loader',{state:'detached',timeout:60000}).catch(async e=>{console.error('loader stalled',await page.evaluate(()=>[...document.querySelectorAll('[data-board-rendered]')].map(e=>({...e.dataset}))));throw e;});
  for(let round=0;round<2;round++) {
   const turn=await page.evaluate(()=>{const turn=qa.c.state.turn;qa.c.submit({type:'endTurn'});return turn;});
   try { await page.waitForFunction(turn=>qa.c.state.over||qa.c.state.turn>=turn+2&&qa.actingSide(qa.c.state)===0,turn,{timeout:45000}); }
   catch(e){console.error('stalled',await page.evaluate(()=>({turn:qa.c.state.turn,cur:qa.c.state.cur,pending:qa.c.state.pending,busy:qa.c.botBusy,disposed:qa.c.botDisposed,dead:qa.c.dead,changes:qa.changes,body:document.body.innerText.slice(-1500)})));throw e;}
   console.log('round-state',difficulty,round,await page.evaluate(()=>({turn:qa.c.state.turn,pending:qa.c.state.pending,busy:qa.c.botBusy,changes:qa.changes.length})));
   const settled=await page.evaluate(()=>Promise.race([qa.c.queue.then(()=>true),new Promise(r=>setTimeout(()=>r(false),20000))]));assert(settled,'Playback queue did not settle');
  }
  const result=await page.evaluate(()=>{const result={turn:qa.c.state.turn,changes:qa.changes.length,ticks:qa.ticks,botName:qa.c.state.players[1].name,busy:qa.c.botBusy,over:qa.c.state.over};clearInterval(qa.timer);qa.stop();qa.c.destroy();return result;});
  assert(result.turn>=5||result.over);assert(result.changes>=4);assert(result.ticks>10);assert.deepEqual(errors,[]);
  results.push({difficulty,...result,errors});await page.close();
 }
 await fs.writeFile((process.env.BOT_QA_OUT || 'docs/bot-strength/2026-10-13')+'/gameplay-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
