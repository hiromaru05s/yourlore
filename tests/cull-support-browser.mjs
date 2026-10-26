import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:57482';
const out='docs/releases/2026-10-26-cull-support/browser-local';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/target-choice-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/target-choice-fixture.html');
 await page.evaluate(async()=>{
  for(const name of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board','defaultUI','defaultButtons'])await import(`/src/styles/${name}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB,STARTERS}=await import('/src/shared/cards.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {actions=[];submit(a){this.actions.push(a);const r=E.reduce(this.state,a);this.state=r.state;this.view.render(r.state);this.afterApply(r);}maybeBot(){}load(g){this.state=g;this.view.render(g);this.afterApply({state:g,events:[]});}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'browser-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
  const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;g.turnTotalMs=1800000;g.turnLeftMs=1800000;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:0,shield:0});g.players[0].removed=Array.from({length:4},()=>card('STARTER_TRASH'));g.players[1].field=[mon('M1')];g.players[0].hand=[card('SELECTED_SWORD')];return g;};
  window.qa={c,E,DB,card,mon,fresh};c.load(fresh());
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});
 const open=()=>page.evaluate(()=>{qa.c.onPlay(qa.c.state.players[0].hand[0].uid);});

 for(const width of [1280,390]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>{const g=qa.fresh();g.players[0].maxMana=20;g.players[0].mana=20;g.players[0].hand=[qa.card('SCRAPPER'),qa.card('M1'),qa.card('M1'),qa.card('STARTER_TRASH')];qa.c.load(g);});
  await open();await page.locator('.cast-review').waitFor();
  assert.equal(await page.locator('.cast-review [data-choice]').count(),2);
  assert(await page.locator('.cast-review .btn-gold').isDisabled());
  await page.locator('.cast-review [data-choice]').nth(0).click();assert(await page.locator('.cast-review .btn-gold').isDisabled());
  await page.locator('.cast-review [data-choice]').nth(1).click();assert(await page.locator('.cast-review .btn-gold').isEnabled());
  await page.screenshot({path:out+'/scrapper-'+width+'.png'});
  await page.locator('.cast-review .btn-gold').click();
  await page.waitForFunction(()=>qa.c.state.players[0].maxMana===21);
  assert.equal(await page.evaluate(()=>qa.c.state.players[0].removed.filter(c=>c.id==='M1').length),2);
  assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.filter(c=>c.id==='STARTER_TRASH').length),1);
  assert.equal(await page.evaluate(()=>qa.c.state.pending),null);
 }
 await page.evaluate(()=>{const g=qa.fresh();g.players[0].hand=[qa.card('FOCUS')];g.players[0].deck=[qa.card('M1')];g.players[0].discard=[qa.card('M2')];qa.c.load(g);});
 await open();await page.locator('.cast-review').waitFor();await page.locator('.cast-review [data-choice]').nth(0).click();await page.locator('.cast-review [data-choice]').nth(1).click();
 await page.screenshot({path:out+'/focus-390.png'});await page.locator('.cast-review .btn-gold').click();await page.waitForSelector('.cast-review',{state:'detached'});
 assert.equal(await page.evaluate(()=>qa.c.state.players[0].removed.filter(c=>c.id!=='STARTER_TRASH').length),1);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),worktree:process.cwd(),checks:['Scrapper exact two materials on 1280px and 390px','Cost-zero Cull excluded from material picker','One atomic cast pays 2 mana and gains 1 max mana','Focus accepts only one target','No JavaScript errors'],errors},null,2));
 console.log('PASS Cull support real-controller browser checks');
}finally{await page.evaluate(()=>qa?.c.destroy()).catch(()=>{});await browser.close();}
