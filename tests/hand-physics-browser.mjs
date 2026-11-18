import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||process.cwd()+'/docs/releases/2026-11-18-hand-physics/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try{for(const [width,height,reduced] of [[1280,900,false],[390,844,false],[390,844,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:reduced?'reduce':'no-preference'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/hand-physics-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
 await page.goto((process.env.LORE_TEST_URL||'http://127.0.0.1:5319')+'/hand-physics-check',{waitUntil:'domcontentloaded',timeout:90000});
 await page.evaluate(async()=>{
  for(const name of ['fonts','reading-board','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','presentation','defaultUI'])await import('/src/styles/'+name+'.css');
  const [{BaseController},{createGame,reduce},{DB,STARTERS},{setLang},{startBoardLayout},{waitForDuel}]=await Promise.all([import('/src/game/controller.ts'),import('/src/shared/engine.ts'),import('/src/shared/cards.ts'),import('/src/i18n.ts'),import('/src/ui/layout.ts'),import('/src/ui/duelReadiness.ts')]);
  setLang('ja');let serial=0;const inst=id=>({...DB[id]??STARTERS[id],uid:'hp-'+(++serial)});const mon=id=>({...inst(id),tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
  class Controller extends BaseController{
   constructor(){super(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.reset();}
   reset(open=true){this.state=createGame({mode:'online',seed:207,starting:0,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;this.state.pending=null;this.state.opening=undefined;this.state.turn=4;this.state.cur=0;
    for(const [i,p]of this.state.players.entries())Object.assign(p,{openingDrawReady:false,mana:20,maxMana:20,hp:30,maxHp:40,quests:[],traps:[],enchants:[],hand:i?[inst('ELF')]:['ELF','MIMIC','GOBLIN','S1','STARTER_MANA'].map(inst),field:i?[mon('ELF')]:[mon('GOBLIN')],discard:[],removed:[],exile:[]});
    document.querySelector('#app').classList.remove('opening-pending');this.view.render(this.state);this.view.setHandOpen(open);}
   submit(action){window.physicsActions.push(action);this.applyResult(reduce(this.state,action));}
  }
  window.physicsActions=[];window.physicsController=new Controller();startBoardLayout();await waitForDuel(document.querySelector('#app'));document.body.dataset.ready='true';
 });
 await page.waitForSelector('body[data-ready=true]',{timeout:90000});await page.waitForSelector('.duel-loader',{state:'detached',timeout:120000});await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.handPhysics),undefined,'no preview opt-in flag');
 const point=async()=>page.evaluate(()=>{const c=document.querySelector('#hand .card[data-card-id="GOBLIN"]'),r=c.getBoundingClientRect();for(const yy of [.4,.6,.8])for(const xx of [.8,.65,.5,.25]){const x=r.left+r.width*xx,y=r.top+r.height*yy;if(document.elementFromPoint(x,y)?.closest('#hand .card')===c)return {x,y};}throw Error('no exposed card');});
 const home=async()=>page.locator('#hand .card[data-card-id="GOBLIN"]').evaluate(e=>{const r=e.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(e).transform);return {x:r.left+r.width/2,y:r.top+r.height*.6,width:e.offsetWidth*Math.hypot(m.a,m.b)};});
 const cdp=width===390?await context.newCDPSession(page):null;
 const down=async p=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
 const move=async p=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y}]});else await page.mouse.move(p.x,p.y);};
 const up=async()=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();};
 const board={x:width*.62,y:height*.6};
 await down(await point());await move(board);await page.waitForSelector('.physical-card .held-core');await page.waitForTimeout(550);
 assert.equal(await page.locator('#hand .is-physical-dragging').evaluate(e=>getComputedStyle(e).opacity),'0');
 await page.screenshot({path:`${out}/${width}-${reduced?'reduced':'normal'}-board.png`});
 // Authoritative snapshots may replace the captured source while a finger is down.
 await page.evaluate(()=>{const c=window.physicsController;window.physicsOldSource=document.querySelector('#hand .card[data-card-id="GOBLIN"]');c.state.players[0].hand.find(c=>c.id==='GOBLIN').text+=' ';c.view.render(c.state);});
 assert(await page.evaluate(()=>document.querySelector('#hand .card[data-card-id="GOBLIN"]')!==window.physicsOldSource));
 assert.equal(await page.locator('#hand .is-physical-dragging').evaluate(e=>getComputedStyle(e).opacity),'0');
 const origin=await home();await move(origin);await page.waitForTimeout(650);
 const held=await page.locator('.physical-card').evaluate(e=>({width:e.offsetWidth*Number(e.style.transform.match(/scale\(([-\d.e]+)\)/)[1]),ready:e.classList.contains('drop-ready'),paths:e.querySelectorAll('.held-card-outline path').length,outline:e.querySelector('.held-core')?.getAttribute('d'),reduced:getComputedStyle(e.querySelector('.held-travel')).display}));
 assert(Math.abs(held.width-origin.width)<2);assert.equal(held.ready,false);assert.equal(held.paths,5);assert(held.outline.length>500);if(reduced)assert.equal(held.reduced,'none');
 await page.screenshot({path:`${out}/${width}-${reduced?'reduced':'normal'}-home.png`});
 await move(board);await page.waitForTimeout(600);assert(Math.abs(await page.locator('.physical-card').evaluate(e=>Number(e.style.transform.match(/scale\(([-\d.e]+)\)/)[1]))-1)<.01);
 await move(await home());await up();await page.waitForTimeout(1000);assert.equal(await page.locator('#hand .card').count(),5);assert.equal(await page.locator('.physical-card,.held-card-outline,.is-physical-dragging').count(),0);assert.equal(await page.evaluate(()=>physicsActions.length),0);
 // Independent pointer abort, including the asynchronous outline completion.
 await down(await point());await move(board);if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await up();}await page.waitForTimeout(200);assert.equal(await page.locator('.physical-card,.held-card-outline,.is-physical-dragging').count(),0);
 // The normal closed hand can start one uninterrupted gesture to a real summon.
 await page.evaluate(()=>physicsController.view.setHandOpen(false));await page.waitForTimeout(300);await down(await point());await move(board);await page.waitForTimeout(300);await up();
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===4&&document.querySelectorAll('#meRow .zone-mon > .card').length===2,{},{timeout:20000});
 await page.waitForTimeout(900);assert.equal(await page.locator('.physical-card,.held-card-outline,.is-physical-dragging').count(),0);assert.deepEqual(errors,[]);
 reports.push({width,height,reduced,defaultEnabled:true,sourceReplacement:true,heldHome:true,backToBoard:true,cancel:true,abort:true,compactSummon:true,errors});await fs.writeFile(out+'/browser-report.json',JSON.stringify(reports,null,2));console.log(reports.at(-1));await context.close();
}}finally{await browser.close();}
