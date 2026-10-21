import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194';
const output=process.env.LORE_TEST_OUTPUT||'/tmp/lore-attack-drag';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const checks=[];
try {
 for(const touch of [false,true]) {
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/attack-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
  await page.goto(origin+'/attack-fixture');
  await page.evaluate(async()=>{
   for(const css of ['fonts','reading-board','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','presentation'])await import('/src/styles/'+css+'.css');
   const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts');
   (await import('/src/i18n.ts')).setLang('ja');
   class Controller extends BaseController {
    actions=[];
    submit(action){this.actions.push(action);this.applyResult(E.reduce(this.state,action),false);}
    reset(kind='normal'){
     const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'SELF'},p1:{id:'b',name:'OPPONENT'}}).state;g.pending=null;g.turn=4;g.phase='main';g.opening=undefined;
     const basic={id:'ELF',name:'Test',nameJa:'テスト',t:'mon',cost:3,play:0,atk:3,def:20,text:'',exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0};
     g.players.forEach((p,i)=>{p.field=[{...basic,uid:i?'defender':'attacker'}];p.enchants=[];p.traps=[];p.hand=[];p.quests=[];p.hp=40;p.maxHp=40;});
     if(kind==='empty')g.players[1].field=[];
     if(kind==='direct')g.players[0].field[0].directOnly=true;
     if(kind==='reorder')g.players[0].field.push({...basic,uid:'second'});
     if(kind==='guard')g.players[1].field.push({...basic,uid:'guard',aura:'eliteGuard'});
     this.actions=[];this.state=g;this.introShown=true;this.view.render(g);document.getElementById('app').classList.remove('opening-pending');
    }
   }
   const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop};
  });
  const cdp=touch?await context.newCDPSession(page):null;
  const center=async selector=>{const r=await page.locator(selector).first().boundingBox();assert(r,selector);return {x:r.x+r.width/2,y:r.y+r.height/2};};
  const own='#meRow .zone-mon .card',enemy='#oppRow .zone-mon .card';
  const down=async p=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]}):(await page.mouse.move(p.x,p.y),page.mouse.down());
  const move=async p=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]}):page.mouse.move(p.x,p.y,{steps:5});
  const up=async()=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
  const drag=async(a,b)=>{await down(a);await move(b);await up();};
  const reset=async kind=>{await page.evaluate(async kind=>{await qa.c.queue;qa.c.reset(kind);},kind);await page.waitForTimeout(250);};
  const actions=()=>page.evaluate(()=>qa.c.actions);
  const idle=async()=>{await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>qa.c.state.pending),null);assert.equal(await page.locator('.attack-aim,.is-aiming,.drag-ghost,.drop-marker').count(),0,await page.locator('.attack-aim,.is-aiming,.drag-ghost,.drop-marker').evaluateAll(es=>es.map(e=>e.outerHTML.slice(0,250))));};
  const attackFinished=async()=>{await page.waitForFunction(()=>qa.c.state.pending===null&&qa.c.state.players[0].field[0].exhausted);await page.evaluate(()=>qa.c.queue);await idle();};
  await reset('normal');
  if(touch)await page.locator(own).tap();else await page.locator(own).click();
  assert.deepEqual(await actions(),[]);await idle();
  const blank={x:8,y:100};
  // Repeated early releases must submit nothing and leave the same card draggable.
  for(let i=0;i<3;i++){await drag(await center(own),blank);assert.deepEqual(await actions(),[]);await idle();}
  await drag(await center(own),await center(enemy));await attackFinished();
  assert.deepEqual((await actions()).map(a=>a.type),['attack','chooseTarget']);
  checks.push(`${touch?'touch':'mouse'}: tap disabled, three cancelled drags, immediate successful retry`);
  await reset('normal');await down(await center(own));await move(blank);
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else {await page.keyboard.press('Escape');await up();}
  assert.deepEqual(await actions(),[]);await idle();
  await drag(await center(own),await center(enemy));await attackFinished();
  checks.push(`${touch?'touch':'mouse'}: pointer cancellation/Escape then retry`);
  await reset('normal');await drag(await center(own),await center('#portraitOpp .pt-ring'));assert.deepEqual(await actions(),[]);await idle();
  await reset('empty');await drag(await center(own),blank);assert.deepEqual(await actions(),[]);await idle();
  await drag(await center(own),await center('#portraitOpp .pt-ring'));await attackFinished();
  assert.equal(await page.evaluate(()=>qa.c.state.players[1].hp),37);
  await reset('empty');if(touch)await page.locator(own).tap();else await page.locator(own).click();await attackFinished();
  assert.equal(await page.evaluate(()=>qa.c.state.players[1].hp),37);
  checks.push(`${touch?'touch':'mouse'}: guarded portrait blocked, empty-field tap and portrait drag work`);
  await reset('direct');if(touch)await page.locator(own).tap();else await page.locator(own).click();assert.deepEqual(await actions(),[]);
  await drag(await center(own),await center(enemy));assert.deepEqual(await actions(),[]);await idle();
  await drag(await center(own),await center('#portraitOpp .pt-ring'));await attackFinished();
  await reset('guard');await drag(await center(own),await center('[data-uid="guard"]'));assert.deepEqual(await actions(),[]);await idle();
  await drag(await center(own),await center('[data-uid="defender"]'));await attackFinished();
  checks.push(`${touch?'touch':'mouse'}: direct-only and elite-guard legality, valid retry`);
  await reset('reorder');const second=await center('[data-uid="second"]');await drag(await center('[data-uid="attacker"]'),{x:second.x+8,y:second.y});
  assert.deepEqual((await actions()).map(a=>a.type),['reorder']);await page.evaluate(()=>qa.c.queue);await idle();
  checks.push(`${touch?'touch':'mouse'}: field reordering preserved`);
  await page.screenshot({path:`${output}/${touch?'touch':'mouse'}.png`});
  assert.deepEqual(errors,[]);await page.evaluate(()=>{qa.c.destroy();qa.stop();});await context.close();
 }
 await fs.writeFile(output+'/checks.json',JSON.stringify({checks},null,2));console.log('PASS',checks.join('\n'));
} finally {await browser.close();}
