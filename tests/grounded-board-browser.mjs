import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-grounded';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.route('**/continuity-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/continuity-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
 const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts'),V=await import('/src/ui/boardView.ts');
 (await import('/src/i18n.ts')).setLang('ja');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 const {BaseController}=await import('/src/game/controller.ts');
 class Controller extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a));} feed(r){this.applyResult(r,true);return this.queue;} reset(){const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=3;g.pending=null;g.market[0]={...C.DB.ELF,uid:'market-buy'};
 for(const [s,p] of g.players.entries()){p.openingDrawReady=false;p.field=[];p.hand=[C.STARTERS.STARTER_CHEST,C.STARTERS.STARTER_MANA,C.DB.ND2].map((c,i)=>({...c,uid:`hand-${s}-${i}`}));p.discard=[{...C.DB.ELF,uid:`disc-${s}`}];p.mana=30;p.maxMana=30;}
 this.state=g;this.introShown=true;this.view.render(g);}
 }
 const c=new Controller(document.getElementById('app'),0,{});const bootBackground=getComputedStyle(document.querySelector('.game')).backgroundImage;const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,E,C,A,bootBackground};
});
await page.waitForSelector('.supply-model-ready');await page.waitForTimeout(700);

const layouts=[];
for(const [width,height] of [[1280,720],[1920,1080],[1814,1274],[390,844]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>{qa.c.reset();qa.c.state.players.forEach((p,s)=>{p.field=[0,1,2].map(i=>({...qa.C.DB.ELF,uid:`mon-${s}-${i}`,damage:0,exhausted:false}));p.maxMana=6;p.mana=4;});qa.c.view.render(qa.c.state);qa.c.timerLeft=79;qa.c.turnTotal=90;qa.c.renderTimer();});await page.waitForTimeout(650);
 await page.screenshot({path:out+`/layout-${width}.png`});
 const m=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {field:r('#meRow .zone-mon'),opp:r('#oppRow .zone-mon'),hero:r('#portraitMe .pt-ring'),deck:r('#pile-myDeck'),shelf:r('#pile-myDisc'),rift:r('#rift-me'),end:r('#endBtn'),clock:r('.mp-clock'),unit:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))};});
 layouts.push({width,height,...m});
 assert(Math.abs(m.field.x+m.field.width/2-width/2)<3,JSON.stringify({width,field:m.field}));
 assert(Math.abs(m.opp.x+m.opp.width/2-width/2)<3);
 assert(m.clock.right<width&&m.clock.left>=0);
 assert(m.end.right<width&&m.end.left>=0,JSON.stringify({width,end:m.end}));
 if(width>700)assert(m.shelf.right<m.field.left&&m.shelf.left>=0,'shelf stays left of the centered field');
 assert(m.rift.left>=0);
 assert(m.deck.right<width&&m.shelf.right<width&&m.rift.right<width,JSON.stringify({width,shelf:m.shelf,rift:m.rift}));
}
await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>qa.c.reset());await page.waitForTimeout(400);
for(let n=1;n<=7;n++){
 await page.evaluate(n=>{qa.c.state.players[0].field=Array.from({length:n},(_,i)=>({...qa.C.DB.ELF,uid:'center-'+i,damage:0,exhausted:false}));qa.c.view.render(qa.c.state);},n);await page.waitForTimeout(350);
 const m=await page.locator('#meRow .zone-mon > .card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));assert.equal(m.length,n);assert(Math.abs((m[0].left+m.at(-1).right)/2-640)<3);
}
await page.screenshot({path:out+'/seven-centered.png'});
// The merged v48 condition must also reach the VFX tracker through GameView.
await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].field=[{...qa.C.DB.HALF_ELF,uid:'conditional-half',dmg:0}];qa.c.view.render(qa.c.state);});
await page.evaluate(()=>{qa.c.state.players[1].field=[{...qa.C.DB.WORLD_TREE,uid:'condition-tree',dmg:0}];qa.c.view.render(qa.c.state);});
await page.waitForFunction(()=>document.querySelector('.stat-rise-layer')?.dataset.targets.includes('conditional-half|attack'));
await page.screenshot({path:out+'/half-elf-opponent-tree-buff.png'});
await page.waitForFunction(()=>document.querySelector('.stat-rise-layer')?.hidden===true);
await fs.writeFile(out+'/layout.json',JSON.stringify({layouts,errors},null,2));assert.deepEqual(errors,[]);
console.log('PASS: 1–7 centered monsters, both field centers, rack and controls within four viewports');
await page.evaluate(()=>{qa.c.destroy();qa.stop();});
}finally{await browser.close();}
