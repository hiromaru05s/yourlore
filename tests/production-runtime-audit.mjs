import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5461',out=process.env.LORE_TEST_OUTPUT||'docs/audits/2026-09-30-production/evidence/runtime';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/audit-runtime',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div></body></html>'}));await page.goto(origin+'/audit-runtime');
 const result=await page.evaluate(async()=>{
  const {LocalController}=await import('/src/game/controller.ts');const {createGame}=await import('/src/shared/engine.ts');const {DB}=await import('/src/shared/cards.ts');
  const g=createGame({mode:'bot',seed:8,starting:1,p0:{id:'a',name:'A'},p1:{id:'b',name:'B',isBot:true}}).state;g.turn=3;g.cur=1;
  const mon=(uid)=>({...DB.ELF,uid,atk:3,def:20,dmg:0,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0,exhausted:false});g.players[1].field=[mon('attacker')];g.players[0].field=[mon('defender')];g.players[0].dew=5;
  g.pending={kind:'cardChoice',reason:'WORLD_TREE_DEFEND',owner:0,allowCancel:false,hint:'',data:{attackerUid:'attacker',targetUid:'defender'}};
  let applied;const fake={state:g,you:0,openingLocked:false,applyResult:r=>{applied=r}};LocalController.prototype.submit.call(fake,{type:'pick',uid:'grow'});
  if(!applied)throw Error('Human defending choice rejected during BOT turn');if(applied.state.pending)throw Error('Choice did not complete');
  applied=undefined;g.pending=null;LocalController.prototype.submit.call(fake,{type:'endTurn'});if(applied)throw Error('Out-of-turn action accepted');
  return {checks:['human owns defending choice during BOT turn','ordinary out-of-turn human actions rejected']};
 });
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({...result,errors},null,2));console.log('PASS',result);
}finally{await browser.close()}
