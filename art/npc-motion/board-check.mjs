// Browser fixture only. Uses the production controller/board over Vite (no login).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://127.0.0.1:4287', out='output/npc-reactions';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
const mobile=process.argv.includes('--mobile');
const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},
  recordVideo:{dir:out,size:mobile?{width:390,height:844}:{width:960,height:600}}});
const page=await ctx.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error' && m.text().includes('[playback]'))errors.push(m.text())});
try {
 const css=(await fs.readFile('client/src/main.ts','utf8')).match(/import "\.\/styles\/[^"]+";/g).join('\n').replaceAll('./styles/','/src/styles/');
 await page.route('**/__npc_board__',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module">
 ${css}
 import {BaseController} from '/src/game/controller.ts';
 import {createGame} from '/src/shared/engine.ts';
 import {setOppAvatar} from '/src/ui/boardView.ts';
 import {startBoardLayout} from '/src/ui/layout.ts';
 import {waitForDuel} from '/src/ui/duelReadiness.ts';
 import {setFxSkip} from '/src/ui/anim.ts';
 import {playNpcReaction} from '/src/ui/npcReaction.ts';
 class Harness extends BaseController {
   get useTurnClock(){return false}
   constructor(){super(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.introShown=true;
    this.state=createGame({mode:'bot',seed:243,starting:0,p0:{id:'a',name:'Seeker'},p1:{id:'b',name:'Aries'}}).state;
    Object.assign(this.state,{cur:0,turn:3,opening:undefined,phase:'main',pending:null});
    this.state.players[1].hp=32; this.view.render(this.state)}
   opponent(id){setOppAvatar(id);this.state.players[1].name=id.split('_')[1];this.view.render(this.state)}
   event(action,amount=2){const state=structuredClone(this.state),p=state.players[1],events=[];
    if(action==='mana'){p.maxMana+=amount;p.mana+=amount}else{p.hp+=action==='heal'?amount:-amount;events.push({type:action==='hurt'?'damage':'heal',amount,player:1})}
    this.applyResult({state,events});return this.queue}
 }
 setOppAvatar('STORY_ARIES');const h=new Harness();const stop=startBoardLayout();await waitForDuel(h.view.root);
 window.qa={h,skip:setFxSkip,play:playNpcReaction,destroy(){h.destroy();stop()}};
 </script></body></html>`}));
 await page.goto(base+'/__npc_board__');await page.waitForFunction(()=>!!window.qa,null,{timeout:60000});
 const runs=[];
 const roster=mobile?['STORY_RENA']:['NPC_LUMI','NPC_NOEL','NPC_VERA','NPC_SION','STORY_SHION','STORY_RENA','STORY_ARIES'];
 const layer=page.locator('#portraitOpp img[data-npc-reaction]');
 for(const id of roster){
  await page.evaluate(id=>qa.h.opponent(id),id);
  await page.locator('#portraitOpp .avatar img').first().evaluate(e=>e.decode());
  for(const action of ['hurt','heal','mana']){
   await page.evaluate(a=>{window.done=qa.h.event(a)},action);
   await layer.waitFor({state:'attached',timeout:8500});assert.equal(await layer.getAttribute('data-npc-reaction'),action);
   assert.equal(await layer.evaluate(img=>img.naturalWidth),256);
   if((mobile || id==='STORY_ARIES')&&action==='mana'){await page.waitForTimeout(400);await page.screenshot({path:out+'/'+(mobile?'mobile':'desktop')+'.jpg'})}
   await page.evaluate(()=>window.done);await layer.waitFor({state:'detached',timeout:6000});
   runs.push([id,action]);console.log(id,action);
  }
 }
 await page.evaluate(()=>{qa.play('opp','hurt')});await layer.waitFor();
 const first=await layer.getAttribute('src');
 await page.evaluate(()=>{qa.play('opp','hurt');qa.play('opp','heal')});
 await page.waitForFunction(first=>{const e=document.querySelector('#portraitOpp [data-npc-reaction]');return e&&e.src!==first&&e.dataset.npcReaction==='hurt'},first);
 await page.waitForSelector('[data-npc-reaction="heal"]',{timeout:4000});
 await page.evaluate(()=>qa.skip(true));assert.equal(await layer.count(),0);
 await page.evaluate(()=>{qa.play('opp','mana');qa.skip(false)});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qa.play('opp','heal'));await page.waitForTimeout(200);assert.equal(await layer.count(),0);
 await page.evaluate(()=>qa.destroy());assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/'+(mobile?'mobile':'desktop')+'.json',JSON.stringify({base,mobile,runs,errors},null,2));
} catch(e) {console.error(await page.evaluate(()=>({url:location.href,body:document.body.innerText.slice(0,160),ring:document.querySelector('#portraitOpp')?.outerHTML.slice(0,900),qa:!!window.qa})),errors);throw e;} finally {const video=page.video();await ctx.close();await video.saveAs(out+'/'+(mobile?'mobile':'desktop')+'.webm');await browser.close()}
