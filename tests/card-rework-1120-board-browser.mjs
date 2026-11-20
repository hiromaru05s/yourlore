import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5473',out=process.env.LORE_TEST_OUT||'/tmp/lore-1120-board';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.goto(origin+'/nameplate-board.html',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('[data-preloaded-images][data-scene-ready=true]').waitFor();await page.locator('#app.duel-preparing').waitFor({state:'hidden'});
 await page.evaluate(async()=>{
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts');const ctl=window.nameplateBoard.controller;let seq=0;
  const card=id=>({...C.DB[id],uid:'visual-'+ ++seq});const mon=id=>({...card(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,exhausted:false,summonedTurn:0});
  ctl.submit=function(a){this.applyResult(E.reduce(this.state,a));};
  window.reworkQA={ctl,E,C,card,mon,reset(id){A.setFxSkip(true);const g=structuredClone(ctl.state);delete g.mulligan;g.over=false;g.winner=null;g.cur=0;g.turn=5;g.phase='main';g.pending=null;g.expansionChoices=[];for(const [s,p]of g.players.entries()){Object.assign(p,{hp:100,mana:20,maxMana:20,hand:[],deck:[],discard:[],removed:[],field:[mon('MINI_SPIRIT'),mon('M2')],enchants:[],quests:[],traps:[],shield:0,brand:0,dew:0,uses:{},usesTurn:{},runePlays:[],runeGuidanceUses:0});p.field[1].def=30;}g.players[0].hand=[card(id)];ctl.state=g;ctl.view.render(g);A.setFxSkip(false);return g;}};
 });
 const report=[];
 // Existing adopted board, both counters and all seven icon slots.
 await page.evaluate(()=>{const {reset,ctl,card}=reworkQA,g=reset('RUNE_PEBBLE');for(const [s,p]of g.players.entries()){p.enchants=['BREWING','EROSION','GEM_RAIN','FARM','SUPPLY_LINE','RUNE_BARRIER'].map(id=>({card:card(id),turns:4,bornTurn:1}));p.quests=[{card:card('Q_RUNE_SECRET'),progress:7,runeProgress:1,startedTurn:1}];}ctl.view.render(g);});
 await page.waitForTimeout(500);
 const counters=await page.locator('.quest-progress--rune').evaluateAll(ns=>ns.map(n=>({text:n.textContent,width:n.clientWidth,scrollWidth:n.scrollWidth,height:n.clientHeight,scrollHeight:n.scrollHeight,title:n.closest('.buff-icon').title})));
 assert.equal(counters.length,2);for(const c of counters){assert.equal(c.text,'7/18\n1/2');assert(c.scrollWidth<=c.width+1);assert(c.scrollHeight<=c.height+1);assert(c.title.includes('ルーン魔法 1/2'));}report.push({counters});await page.screenshot({path:out+'/seven-slots-dual-progress.png'});
 for(const id of ['ARCANE_DISMANTLER','RUNE_PEBBLE','SHIELD_STRIKE']){
  const state=await page.evaluate(async id=>{const {reset,ctl,card,mon}=reworkQA,g=reset(id);g.players[0].field[0]=mon('GOLEM_TEST');if(id==='ARCANE_DISMANTLER'){g.players[0].enchants=[{card:card('BREWING'),turns:4}];g.players[1].enchants=[{card:card('EROSION'),turns:99}];}if(id==='RUNE_PEBBLE')g.players[0].deck=[card('RUNE1'),card('M1'),card('RUNE_GUIDANCE')];if(id==='SHIELD_STRIKE')g.players[0].shield=7;ctl.view.render(g);ctl.submit({type:'play',idx:0});await ctl.queue;return {reason:ctl.state.pending?.reason,choice: id==='ARCANE_DISMANTLER'?g.players[0].enchants[0].card.uid:id==='RUNE_PEBBLE'?'player-1':g.players[0].field[1].uid};},id);
  assert.equal(state.reason,id);await page.locator('.picker-modal').waitFor();await page.screenshot({path:out+'/'+id+'-choice.png'});
  await page.locator(`.picker-modal .card[data-uid="${state.choice}"]`).click();await page.locator('.picker-modal .btn-gold').click();
  const result=await page.evaluate(async()=>{await reworkQA.ctl.queue;return reworkQA.ctl.state;});
  assert.equal(result.pending,null);if(id==='ARCANE_DISMANTLER'){assert.equal(result.players[0].enchants.length,0);assert.equal(result.players[1].enchants.length,1);assert(result.players[0].field.some(m=>m.id==='GOLEM1'));}if(id==='RUNE_PEBBLE')assert.equal(result.players[1].hp,86);if(id==='SHIELD_STRIKE'){assert.equal(result.players[0].shield,0);assert.equal(result.players[0].field[1].dmg,7);}report.push({id,reason:state.reason,selected:state.choice});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,cwd:process.cwd(),viewport:{width:1920,height:1080},report,errors,scope:'Current adopted GameView fixture, actual choice modal clicks and confirmations. No authenticated PvP.'},null,2));console.log('PASS dual quest counters on both fields and three real choice/confirmation flows');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw e;}finally{await browser.close();}
