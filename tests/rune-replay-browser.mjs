import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PW_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const out=process.env.RUNE_QA_DIR||'/tmp/rune-adoption-qa';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:850}}),page=await context.newPage(),errors=[],checks=[];
page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(120000);
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(`${r.status()} ${r.url()}`)});
try{
 console.log('browser ready');await page.goto((process.env.RUNE_URL||'http://127.0.0.1:5489')+'/rune-replay-check.html');
 console.log('page ready');await page.evaluate(async()=>{
  for(const f of ['tokens','base','card','game-overlays','game','screens','presentation','reading-board'])await import(`/src/styles/${f}.css`);
  const {BaseController}=await import('/src/game/controller.ts'),{createGame,reduce}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');const A=await import('/src/ui/anim.ts');(await import('/src/i18n.ts')).setLang('ja');
  const {setMyAvatar,setOppAvatar}=await import('/src/ui/boardView.ts');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
  class Harness extends BaseController{submit(){}maybeBot(){}}
  const stop=(await import('/src/ui/layout.ts')).startBoardLayout();
  window.qa={A,stop,async prepare(side=0,count=1,id='S13'){
   this.c?.destroy();document.body.innerHTML='<div id="app"></div>';A.setFxSkip(false);
   const g=createGame({mode:'bot',seed:23,starting:side,p0:{id:'a',name:'あなた'},p1:{id:'b',name:'相手'}}).state;g.turn=5;g.phase='main';g.cur=side;g.pending=null;g.opening=undefined;
   const inst=(id,uid)=>({...DB[id],uid});for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.hp=30;p.maxMana=p.mana=15;p.enchants=i===side?Array.from({length:count},(_,j)=>({card:inst('RUNE3','rune-'+j),turns:99})):[];p.quests=[];p.traps=[];p.field=['M4','M5'].map((id,j)=>({...inst(id,`mon-${i}-${j}`),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0}));p.hand=i===side?[inst(id,'spell')]:[];p.deck=Array.from({length:12},(_,j)=>inst('S10',`deck-${i}-${j}`));p.discard=[];}
   const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.c=c;c.state=g;c.introShown=true;await c.view.render(g);c.view.setHandOpen(true);await (await import('/src/ui/duelReadiness.ts')).waitForDuel(document.querySelector('#app'));
   this.before=structuredClone(g);this.result=reduce(g,{type:'play',idx:0});this.side=side;this.trace=[];this.starts=0;this.done=false;
  },async play(){
   const seen=new WeakSet(),tick=()=>{const layer=document.querySelector('.rune-replay-layer');if(layer&&!seen.has(layer)){seen.add(layer);this.starts++;}this.trace.push({at:performance.now(),layer:!!layer,hp:document.querySelector(`#hp-${this.side?'me':'opp'}`)?.textContent,scale:document.querySelector('.buff-icon[data-uid="rune-0"]')?.style.scale,turn:document.querySelector('.rune-replay-turn')?.style.transform});if(!this.done)requestAnimationFrame(tick)};tick();this.c.state=this.result.state;await this.c.playEvents(this.before,this.result,new Set());this.done=true;
  }};
 });
 console.log('harness ready');const run=async(side,count,width,reduced=false)=>{
  console.log('case',side,count,width,reduced);
  await page.setViewportSize({width,height:850});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.evaluate(([side,count])=>qa.prepare(side,count),[side,count]);await page.evaluate(()=>{qa.pending=qa.play()});
  if(count){await page.waitForFunction(()=>qa.starts>0||qa.done,null,{timeout:90000});await page.waitForTimeout(reduced?100:400);await page.screenshot({path:out+`/active-${width}-${side}-${count}-${reduced}.png`});}
  await page.evaluate(()=>qa.pending);const result=await page.evaluate(()=>({starts:qa.starts,trace:qa.trace,overlays:document.querySelectorAll('.rune-replay-layer,.fx-card-flight').length,hp:document.querySelector(`#hp-${qa.side?'me':'opp'}`).textContent,runes:[...document.querySelectorAll('.buff-icon[data-uid^="rune-"]')].map(n=>n.style.cssText)}));
  assert.equal(result.starts,count?1:0);assert.equal(result.hp,count?'8':'19');assert.equal(result.overlays,0);if(count){assert(result.trace.some(t=>t.hp==='19'&&t.layer));assert(!result.trace.some(t=>t.hp==='8'&&t.layer));assert(result.trace.some(t=>Number(t.scale)>1.06));if(!reduced)assert(result.trace.some(t=>t.turn?.includes('rotateY(')));}checks.push({side,count,width,reduced,frames:result.trace.length});await fs.writeFile(out+`/trace-${width}-${side}-${count}-${reduced}.json`,JSON.stringify(result,null,2));
 };
 await run(0,1,1280);await run(1,2,1280);await run(0,1,390);await run(1,1,390,true);await run(0,0,1280);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>qa.prepare());await page.evaluate(()=>{qa.pending=qa.play()});await page.waitForSelector('.rune-replay-layer');await page.evaluate(()=>qa.A.setFxSkip(true));await page.evaluate(()=>qa.pending);assert.equal(await page.locator('.rune-replay-layer,.fx-card-flight').count(),0);checks.push({cancel:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log({passed:checks.length,errors});
}catch(error){await fs.writeFile(out+'/failure-state.json',JSON.stringify(await page.evaluate(()=>({done:qa.done,starts:qa.starts,trace:qa.trace,events:qa.result?.events,skip:qa.A.isFxSkipped()})),null,2));console.error(error);await fs.writeFile(out+'/failure.txt',String(error));throw error;}finally{await fs.writeFile(out+'/latest.json',JSON.stringify({checks,errors},null,2));await context.close();await browser.close();}
