import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUTPUT||'.cache/card-frame-contour';
await fs.mkdir(out,{recursive:true});
// Load the product's complete stylesheet set: menu additions must not change
// floating game cards, which are mounted outside .game during event playback.
const css=[...(await fs.readFile('client/src/main.ts','utf8')).matchAll(/import "\.\/styles\/(.*?)\.css";/g)].map(m=>m[1]);
const server=await createServer({root:path.resolve('client'),configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},...(process.env.LORE_RECORD_VIDEO==='1'?{recordVideo:{dir:out,size:{width:1280,height:900}}}:{})});
page.setDefaultTimeout(45000);
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='warning'&&/Native card fallback/.test(message.text()))errors.push(message.text());});
try{
 await page.route('**/contour-qa',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/contour-qa`);
 await page.evaluate(async css=>{
  for(const name of css)await import('/src/styles/'+name+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts');
  const {BaseController}=await import('/src/game/controller.ts');
  (await import('/src/i18n.ts')).setLang('ja');
  class Controller extends BaseController{submit(){} }
  const ctl=new Controller(document.getElementById('app'),0,{onHome(){},onRematch(){}});
  (await import('/src/ui/layout.ts')).startBoardLayout();
  const reset=()=>{
   A.setFxSkip(false);
   const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;
   g.turn=3;g.pending=null;
   for(const [s,p]of g.players.entries()){
    p.openingDrawReady=false;p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.mana=p.maxMana=30;
    p.hand=[C.DB.M2,C.DB.ND2].map((c,i)=>({...c,uid:`hand-${s}-${i}`}));
   }
   ctl.state=g;ctl.introShown=true;ctl.view.render(g);document.getElementById('app').classList.remove('opening-pending');return g;
  };
  window.qa={ctl,A,C,reset,g:reset(),reveals:[]};
  new MutationObserver(records=>{
   for(const {target:n}of records)if(n instanceof HTMLElement&&n.matches('.cast-reveal')){
    const s=getComputedStyle(n),after=getComputedStyle(n,'::after');
    qa.reveals.push({background:s.backgroundColor,image:s.backgroundImage,border:s.borderTopWidth,shadow:s.boxShadow,outline:s.outlineStyle,after:after.content});
   }
  }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 },css);
 await page.waitForSelector('[data-scene-ready=true]');
 for(const cls of ['card','card card--field-back','card card--field-trap']){
  const style=await page.evaluate(cls=>{
   const n=document.createElement('div');n.className=cls;document.body.append(n);
   const s=getComputedStyle(n),result={background:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow};n.remove();return result;
  },cls);
  assert.equal(style.background,'rgba(0, 0, 0, 0)');assert.equal(style.border,'0px');assert.equal(style.shadow,'none');checks.push({cls,style});
 }
 // No rectangular shadow or reflection may be manufactured outside source
 // alpha. A narrow cross makes even a faint card-sized plate unambiguous.
 const alpha=await page.evaluate(async()=>{
  const {Renderer}=await import('/src/ui/summon/renderer.ts');
  const renderer=new Renderer(),face=document.createElement('canvas'),output=document.createElement('canvas');
  face.width=248;face.height=348;output.width=output.height=684;
  const f=face.getContext('2d'),c=output.getContext('2d');
  f.fillStyle='#fff';f.fillRect(120,90,8,168);f.fillRect(80,170,88,8);
  const results=[];
  for(const ms of [0,300,650])for(const pass of ['ground','card']){
   c.clearRect(0,0,684,684);renderer.draw(c,face,2,ms,342,342,180,false,pass,false);
   const pixels=c.getImageData(0,0,684,684).data;
   let cornerAlpha=0,totalAlpha=0;
   for(let y=0;y<684;y++)for(let x=0;x<684;x++){
    const a=pixels[(y*684+x)*4+3];totalAlpha+=a;
    // These areas are well outside the cross, even with a soft contact shadow.
    if(Math.abs(x-342)>60&&Math.abs(y-342)>65)cornerAlpha=Math.max(cornerAlpha,a);
   }
   results.push({ms,pass,cornerAlpha,totalAlpha});
  }
  f.clearRect(0,0,248,348);
  for(const pass of ['ground','card']){
   // A fresh face identity also covers preparation on an empty capture.
   const blank=document.createElement('canvas');blank.width=248;blank.height=348;
   c.clearRect(0,0,684,684);renderer.draw(c,blank,2,650,342,342,180,false,pass,false);
   results.push({ms:650,pass,blank:true,totalAlpha:c.getImageData(0,0,684,684).data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0)});
  }
  renderer.dispose();return results;
 });
 for(const r of alpha){if(r.blank||r.pass==='ground')assert.equal(r.totalAlpha,0,JSON.stringify(r));else{assert.equal(r.cornerAlpha,0,JSON.stringify(r));assert(r.totalAlpha>0,JSON.stringify(r));}}
 checks.push({alpha});
 const rear=await page.evaluate(async()=>{
  const {drawEffect}=await import('/src/ui/monster/renderer.ts');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=684;
  const c=canvas.getContext('2d'),r={x:342,y:342,w:180,h:270},results=[];
  for(const kind of ['summon','attack','trigger','atk','hp','both'])for(const variant of ['A','B','C']){
   c.clearRect(0,0,684,684);drawEffect(c,kind,variant,.2,r,r,{active:true,reduced:false,side:1,pass:'rear'});
   results.push({kind,variant,totalAlpha:c.getImageData(0,0,684,684).data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0)});
  }
  return results;
 });
 for(const r of rear)assert.equal(r.totalAlpha,0,JSON.stringify(r));checks.push({rear});
 const specialized=await page.evaluate(async()=>{
  const results=[],w=360,h=480,face=document.createElement('canvas'),canvas=document.createElement('canvas');
  face.width=248;face.height=348;canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
  const matrix=new DOMMatrix().translate(w/2,h/2).scale(.6,-.6,.6);
  const cases=[
   ['verdant','StudyRenderer',['ELF',3,5000]],
   ['vampireSummon','Renderer',['VAMP1',0,5000]],
   ['hexerSummon','Renderer',['NHEX',3,5000]],
   ['mageSummon','Renderer',[0,5000]],
   ['mercenarySummon','Renderer',[1,5000]],
  ];
  for(const [family,name,args]of cases){
   const module=await import(`/src/ui/${family}/${family==='verdant'?'studyRenderer':'renderer'}.ts`),renderer=new module[name]();
   try{c.clearRect(0,0,w,h);renderer.drawBoard(c,face,...args,matrix,w,h,true);const pixels=c.getImageData(0,0,w,h).data;results.push({family,totalAlpha:pixels.reduce((sum,v,i)=>sum+(i%4===3?v:0),0)});}
   finally{renderer.dispose();}
  }
  const {Renderer}=await import('/src/ui/shieldTitanSummon/renderer.ts'),shield=new Renderer();
  try{const {VARIANT}=await import('/src/ui/shieldTitanSummon/catalog.ts');shield.setFace(face);c.clearRect(0,0,w,h);shield.drawBoard(canvas,VARIANT,5000,new DOMMatrix().translate(w/2,h/2).scale(80,-80,80),true);results.push({family:'shieldTitanSummon',totalAlpha:c.getImageData(0,0,w,h).data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0)});}
  finally{shield.dispose();}
  return results;
 });
 for(const r of specialized)assert.equal(r.totalAlpha,0,JSON.stringify(r));checks.push({specialized});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const side of ['me','opp']){
   await page.evaluate(side=>{
    qa.g=qa.reset();qa.reveals=[];const player=side==='me'?0:1;
    const card={...qa.C.DB.M2,uid:'contour-summon',atk:14,def:12,dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:3};
    const prev=structuredClone(qa.g);qa.g.players[player].field.push(card);qa.ctl.state=qa.g;
    qa.done=false;qa.playing=qa.ctl.playEvents(prev,{state:qa.g,events:[{type:'summon',player,id:'M2',uid:card.uid}]}).then(()=>qa.done=true);
   },side);
   await page.waitForFunction(()=>qa.reveals.length>0);
   const reveal=await page.evaluate(()=>qa.reveals[0]);
   assert.equal(reveal.background,'rgba(0, 0, 0, 0)');assert.equal(reveal.image,'none');assert.equal(reveal.border,'0px');assert.equal(reveal.shadow,'none');assert.equal(reveal.outline,'none');assert(['none','normal'].includes(reveal.after));
   await page.screenshot({path:path.join(out,`${viewport.width}-${side}-reveal.png`)});
   await page.waitForSelector('.slate-summon');
   await page.waitForFunction(()=>Number(document.querySelector('.slate-summon')?.dataset.time)>=350);
   await page.screenshot({path:path.join(out,`${viewport.width}-${side}-landing.png`)});
   await page.waitForFunction(()=>qa.done);
   assert.equal(await page.locator('.slate-summon,.fx-card-flight,.cast-reveal').count(),0);
   assert.equal(await page.locator(`#${side}Row .zone-mon [data-uid="contour-summon"]`).count(),1);
   checks.push({viewport,side,reveal,complete:true});
  }
 }
 await page.setViewportSize({width:1280,height:900});
 for(const [id,layer]of [['ELF','verdant-summon'],['VAMP1','vampire-summon'],['NHEX','hexer-summon'],['FIRE_MASTER','mage-summon'],['MERCENARY','mercenary-summon'],['SHIELD_TITAN','shield-titan-summon']]){
  await page.evaluate(id=>{qa.reset();qa.done=false;qa.playing=qa.A.ghostSummon({...qa.C.DB[id],uid:'special-contour'},'me',0).then(()=>qa.done=true);},id);
  await page.waitForSelector('.'+layer);
  await page.waitForFunction(layer=>Number(document.querySelector('.'+layer)?.dataset.time)>=500,layer);
  await page.screenshot({path:path.join(out,`special-${id}.png`)});
  await page.waitForFunction(()=>qa.done);
  assert.equal(await page.locator('.'+layer).count(),0);checks.push({special:id,complete:true});
 }
 for(const side of ['me','opp']){
  await page.evaluate(side=>{qa.reset();qa.reveals=[];qa.done=false;qa.playing=qa.A.revealSpell({...qa.C.DB.ND2,uid:'contour-spell'},side,'discard').then(()=>qa.done=true);},side);
  await page.waitForFunction(()=>qa.reveals.length>0);
  assert.equal(await page.evaluate(()=>qa.reveals[0].shadow),'none');
  await page.waitForFunction(()=>qa.done);
  assert.equal(await page.locator('.fx-card-flight,.spell-frame-resonance').count(),0);
  checks.push({spell:side,complete:true});
 }
 await page.evaluate(()=>{
  qa.reset();qa.done=false;
  qa.playing=Promise.all(['me','opp'].map((side,i)=>qa.A.ghostSummon({...qa.C.DB.M2,uid:'simultaneous-'+i},side,0))).then(()=>qa.done=true);
 });
 await page.waitForFunction(()=>document.querySelectorAll('.slate-summon').length===2);
 await page.waitForFunction(()=>qa.done);assert.equal(await page.locator('.slate-summon,.fx-card-flight').count(),0);
 checks.push({simultaneous:true,complete:true});
 for(const mode of ['skip','reduced','resize']){
  await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  await page.evaluate(()=>{qa.reset();qa.done=false;qa.playing=qa.A.ghostSummon({...qa.C.DB.M2,uid:'interrupted'},'me',0).then(()=>qa.done=true);});
  if(mode==='skip'){await page.waitForSelector('.slate-summon');await page.evaluate(()=>qa.A.setFxSkip(true));}
  if(mode==='resize'){await page.waitForSelector('.slate-summon');await page.setViewportSize({width:1200,height:800});}
  await page.waitForFunction(()=>qa.done);
  assert.equal(await page.locator('.slate-summon,.fx-card-flight').count(),0);checks.push({mode,complete:true});
 }
 await page.evaluate(()=>qa.ctl.destroy());assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,boundary:'Local real-board/controller fixtures. No authenticated match or deployment.'},null,2)+'\n');
 console.log('PASS card alpha contour, complete product CSS, both sides, PC/mobile summon, spells, skip/reduced/resize, cleanup');
}catch(error){console.error(error);await page.screenshot({path:path.join(out,'failure.png')});throw error;}
finally{await page.close();await browser.close();await server.close();}
