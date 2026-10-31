import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5251',out='docs/qa/2026-10-31-vfx-popup-language';
const css=[...(await fs.readFile('client/src/main.ts','utf8')).matchAll(/import ['"](\.\/styles\/[^'"]+\.css)['"]/g)].map(m=>'/src/'+m[1].slice(2));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(30000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const foreign=(lang,text)=> (lang==='en'?/[가-힣ぁ-んァ-ヶ一-龯]/:lang==='ko'?/[ぁ-んァ-ヶ一-龯]/:/[가-힣]/).test(text);
const pure=async(lang,selector)=>{const text=await page.locator(selector).innerText();assert(!foreign(lang,text),`${lang}: ${text}`);return text;};
try{
 await page.route('**/popup-language-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/popup-language-fixture.html');
 await page.evaluate(async(css)=>{
  for(const url of css)await import(url);
  const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),I=await import('/src/i18n.ts'),M=await import('/src/ui/modal.ts'),D=await import('/src/ui/dice.ts'),F=await import('/src/ui/fateWheel.ts'),A=await import('/src/ui/anim.ts'),T=await import('/src/ui/turnBanner.ts');
  class Harness extends BaseController{submit(action){this.applyResult(E.reduce(this.state,action));}maybeBot(){}load(g){M.closeOverlay();this.state=g;this.view.render(g);this.afterApply({state:g,events:[]});}play(action){this.applyResult(E.reduce(this.state,action));return this.queue;}}
  let seq=0;const card=id=>({...structuredClone(C.DB[id]??C.STARTERS[id]),uid:'browser-'+(++seq)});
  const fresh=(side=0)=>{const g=E.createGame({mode:'online',seed:4,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=9;g.pending=null;g.turnTotalMs=g.turnLeftMs=1800000;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:20,shield:0});return g;};
  window.qa={E,C,I,M,D,F,A,T,card,fresh,lang(lang){this.c?.destroy();document.querySelector('#app').innerHTML='';I.setLang(lang);this.c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.c.introShown=true;this.c.load(fresh());},async play(id,side=0){const g=fresh(side);g.players[side].hand=[card(id)];this.c.load(g);await new Promise(r=>setTimeout(r,2500));this.played=this.c.play({type:'play',idx:0});}};
 },css);
 for(const lang of ['en','ja','ko']){
  await page.evaluate(lang=>qa.lang(lang),lang);
  await page.waitForTimeout(1800);
  for(const mine of [true,false]){await page.evaluate(mine=>{const g=qa.fresh(mine?0:1);qa.c.load(g);},mine);await page.waitForTimeout(800);const label=await page.locator('.end-turn-label').innerText();assert.equal(label,await page.evaluate(mine=>qa.I.t(mine?'duel.endLabel':'duel.enemyLabel'),mine));checks.push({lang,turn:mine,label});}
  for(const side of [0,1]){await page.evaluate(side=>qa.play('GAMBLE',side),side);await page.locator('.fx-result').waitFor();const result=await pure(lang,'.fx-result');assert(result.includes(await page.evaluate(()=>qa.I.cardName(qa.C.DB.GAMBLE))));await page.screenshot({path:`${out}/result-${lang}-${side}.png`});await page.evaluate(()=>qa.played);checks.push({lang,side,result});}
  for(const won of [true,false,null]){await page.evaluate(won=>qa.M.winModal(won,'',()=>{},()=>{},()=>{}),won);const text=await pure(lang,'.outcome-result');assert.equal(await page.locator('.finale-title h2').textContent(),await page.evaluate(won=>qa.I.t(won==null?'modal.draw':won?'modal.win':'modal.lose'),won));if(won===true)await page.waitForTimeout(1500);if(won===true)await page.screenshot({path:`${out}/victory-${lang}.png`});checks.push({lang,won,text});await page.evaluate(()=>qa.M.closeOverlay());}
  await page.evaluate(()=>{qa.wheel=qa.F.openWheelDice({type:'dice',player:0,source:{id:'AJIN',player:0},rolls:[4],sum:4,need:4,success:true},true,()=>{},true);});await page.locator('.wheel-choice:not([hidden])').waitFor();await pure(lang,'.wheel-decision');await page.screenshot({path:`${out}/wheel-${lang}.png`});await page.evaluate(()=>qa.wheel.close());
  await page.waitForFunction(()=>!document.querySelector('.fx-turn-sigil'));await page.evaluate(()=>{qa.T.mountTurnBanner(true,9);});await page.waitForTimeout(600);const aria=await page.locator('.fx-turn-sigil').getAttribute('aria-label');assert(!foreign(lang,aria));if(lang!=='en')assert(!/YOUR TURN|OPPONENT/.test(aria));checks.push({lang,banner:aria});await page.evaluate(()=>qa.T.cancelTurnBanner());
 }
 // Normal-motion dice must remain a single locale during the asynchronous reveal.
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const target of ['ja','ko','en']){
  await page.evaluate(target=>{qa.I.setLang(target==='en'?'ja':'en');qa.roll=qa.D.diceRollAnim([4],{mine:false,need:4,success:true,source:{status:'brand',player:1},viewer:0});},target);await page.locator('.d3-overlay').waitFor();await page.evaluate(target=>qa.I.setLang(target),target);await page.locator('.d3-verdict').waitFor();const text=await pure(target,'.d3-overlay');await page.screenshot({path:`${out}/dice-${target}.png`});await page.evaluate(()=>qa.roll);checks.push({switchTo:target,dice:text});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{qa.I.setLang('ja');qa.wheel=qa.F.openWheelDice({type:'dice',player:0,source:{id:'AJIN',player:0},rolls:[4],sum:4,need:4,success:true},true,()=>{},true);});await page.locator('.wheel-choice:not([hidden])').waitFor();await page.evaluate(()=>qa.I.setLang('en'));await pure('en','.wheel-decision');await page.screenshot({path:`${out}/wheel-mobile-en.png`});await page.evaluate(()=>qa.wheel.close());
 await page.evaluate(()=>{qa.I.setLang('en');qa.popup=qa.A.resultPopup('',[],true,3000,()=>({title:qa.I.t('duel.dice'),lines:[qa.I.t('fx.yourturn'),'<player-name>']}));});await page.locator('.fx-result').waitFor();await page.evaluate(()=>qa.I.setLang('ko'));const switched=await pure('ko','.fx-result');assert(switched.includes('<player-name>'));await page.locator('.fx-result').click();await page.evaluate(()=>qa.popup);checks.push({switchResult:switched,literalName:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,css,checks,errors,scope:'Actual BaseController.applyResult, engine events, VFX and popups; isolated fixture, no live account'},null,2)+'\n');console.log('PASS',checks.length,'browser checks');
}finally{await page.evaluate(()=>qa?.c?.destroy()).catch(()=>{});await browser.close();}
