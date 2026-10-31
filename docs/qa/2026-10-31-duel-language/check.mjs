import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5249',out='docs/qa/2026-10-31-duel-language';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(30000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/duel-language-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/duel-language-fixture.html');
 await page.evaluate(async()=>{
  for(const name of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${name}.css`);
  const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),{DB,STARTERS}=await import('/src/shared/cards.ts'),I=await import('/src/i18n.ts'),M=await import('/src/ui/modal.ts'),{GameLog}=await import('/src/ui/log.ts');
  class Harness extends BaseController{submit(a){const r=E.reduce(this.state,a);this.load(r.state);this.events=r.events;}maybeBot(){}load(g){M.closeOverlay();this.state=g;this.view.render(g);this.afterApply({state:g,events:[]});}}
  let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'browser-'+(++seq)}),mon=id=>({...card(id),dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
  const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;g.turnTotalMs=g.turnLeftMs=1800000;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:20,shield:0});return g;};
  window.qa={E,I,M,DB,card,mon,fresh,GameLog,lang(lang){this.c?.destroy();document.querySelector('#app').innerHTML='';I.setLang(lang);this.c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.c.introShown=true;},load(id){let g=fresh();g.players[0].field=[mon('M1')];g.players[1].field=[{...mon('M1'),atk:9}];g.players[0].hand=[card(id)];g=E.reduce(g,{type:'play',idx:0}).state;this.c.load(g);}};
 });
 const assertLocale=async(lang,selector)=>{const text=await page.locator(selector).innerText();assert(!(lang==='en'?/[가-힣ぁ-んァ-ヶ一-龯]/:lang==='ko'?/[ぁ-んァ-ヶ一-龯]/:/[가-힣]/).test(text),`${lang}: ${text}`);return text;};
 for(const lang of ['en','ja','ko']){
  await page.evaluate(lang=>qa.lang(lang),lang);
  for(const width of [1280,390]){await page.setViewportSize({width,height:800});await page.evaluate(()=>qa.load('APPRENTICE_ARMORER'));await page.locator('.picker-modal').waitFor();await page.locator('.fx-turn-sigil').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready);const text=await assertLocale(lang,'.picker-modal');assert(text.includes('4'));await page.screenshot({path:`${out}/armorer-${lang}-${width}.png`});const bounds=await page.locator('.picker-modal').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth}));assert(bounds.left>=-1&&bounds.right<=bounds.width+1);await page.locator('[data-uid="shield"]').click();await page.locator('.picker-modal .btn-gold').click();assert.equal(await page.evaluate(()=>qa.c.state.players[0].shield),4);checks.push(`${lang}/${width}: Armorer localized dialog, shield applied`);}
  await page.evaluate(()=>qa.load('APPRENTICE_ARMORER'));await page.locator('[data-uid="buff"]').click();await page.locator('.picker-modal .btn-gold').click();assert.equal(await page.evaluate(()=>qa.c.state.pending.reason),'ARMORER_TARGET');await assertLocale(lang,'.picker-modal');
  await page.evaluate(()=>qa.load('ELF'));const elf=await assertLocale(lang,'.picker-modal');assert.match(elf,{en:/destroy/i,ja:/破壊/,ko:/파괴/}[lang]);assert(!/return|되돌|戻/.test(elf));await page.screenshot({path:`${out}/elf-${lang}.png`});
  await page.evaluate(()=>{const g=qa.fresh(),c=qa.card('M1');g.players[0].discard=[c];g.pending={kind:'recall',reason:'recall',allowCancel:true,hint:'誤訳',hintJa:'오역',data:{}};qa.c.load(g);});await assertLocale(lang,'.picker-modal');
  await page.evaluate(()=>{qa.M.closeOverlay();const el=document.createElement('div');el.id='qa-log';document.body.appendChild(el);const log=new qa.GameLog(el);log.line('부호의 습관: 최대 마나를 3으로 변경','富豪の習慣: 最大マナを3にする','Habit of the Rich: set your max mana to 3');qa.log=log;});await assertLocale(lang,'#qa-log');await page.evaluate(()=>{qa.log.dispose();document.querySelector('#qa-log').remove();});
  checks.push(`${lang}: destruction vs recall and English log event rendered`);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors},null,2)+'\n');console.log('PASS',checks);
}finally{await page.evaluate(()=>qa?.c?.destroy()).catch(()=>{});await browser.close();}
