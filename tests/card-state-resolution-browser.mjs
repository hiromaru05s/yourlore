import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-resolution-qa/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5591',out=process.env.LORE_TEST_OUT||'/tmp/lore-card-state-resolution',engine=process.env.LORE_QA_ENGINE||'chromium';
await fs.mkdir(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true,...(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})}:{channel:'chrome',headless:true});
const results=[];
try{for(const [width,dpr] of [[1746,1],[1280,2],[390,3]]){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:dpr,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>{
  document.querySelector('.tempo-controls').style.display='none';const g=combatTempo.fixture('summon',0).prev;g.opening=undefined;
  const card=g.players[0].hand[0];g.players[0].field=[{...combatTempo.fixture('counter',0).prev.players[0].field[0],uid:'resolution-field'}];g.market[0]={...card,uid:'resolution-market'};
  window.resolutionFixture=g;
 });
 const states=[];
 for(const blocked of [false,true,false]){
  await page.evaluate(blocked=>{const g=structuredClone(resolutionFixture);g.cur=0;g.players[0].mana=blocked?0:40;g.players[0].field[0].exhausted=blocked;combatTempo.controller.show(g);},blocked);
  await page.waitForTimeout(450);
  await page.waitForFunction(()=>[...document.querySelectorAll('#meRow .zone-mon .card img.card-art-img,#hand .card img.card-art-img,#market .card img.card-art-img')].every(i=>i.complete&&i.naturalWidth>0));
  const sample=await page.evaluate(()=>['#meRow .zone-mon .card','#fixedMarket .card','#supplyMarket .card','#hand .card'].map(selector=>{
   const n=document.querySelector(selector),img=n.querySelector('.card-art img'),art=n.querySelector('.card-art'),frame=n.querySelector('.card-frame');
   return{selector,id:n.dataset.cardId,dim:n.classList.contains('is-dim')||n.classList.contains('is-exhausted')||!!n.dataset.monsterBlocked,rootFilter:getComputedStyle(n).filter,src:img.currentSrc,naturalWidth:img.naturalWidth,width:n.offsetWidth,artWidth:art.offsetWidth,artScale:getComputedStyle(art).scale,artFilter:getComputedStyle(art).filter,frameFilter:getComputedStyle(frame).filter,layers:[...n.querySelectorAll(':scope > .card-art,:scope > .card-frame,:scope > .card-name,:scope > .card-cost > .seal-print,:scope > .ad-atk > .seal-print,:scope > .ad-def > .seal-print')].map(l=>({name:l.className,compositing:getComputedStyle(l).willChange,scale:getComputedStyle(l).scale,filter:getComputedStyle(l).filter}))};
  }));
  for(const card of sample){assert.equal(card.rootFilter,'none');assert(card.naturalWidth>384);assert(card.artWidth>=card.width*1.98);assert.equal(card.artScale,dpr<2?'0.25':'0.5');assert(card.layers.filter(l=>l.name==='card-name'||l.name==='seal-print').every(l=>l.scale===(dpr<2?'0.25':'0.5')),JSON.stringify(card));assert(card.layers.every(l=>l.compositing==='filter'),JSON.stringify(card));if(blocked){assert(card.layers.filter(l=>l.name==='seal-print').every(l=>l.filter.includes('grayscale(')),JSON.stringify(card));assert(card.dim,JSON.stringify(card));assert.match(card.artFilter,/grayscale\((?:1|0\.7)\)/);}if(card.selector.includes('Market'))assert((card.frameFilter.match(/drop-shadow/g)||[]).length>=3,card.frameFilter);}
  if(states.length)for(let i=0;i<sample.length;i++)for(const key of ['id','src','naturalWidth','width','artWidth','artScale'])assert.equal(sample[i][key],states[0][i][key],sample[i].selector+' '+key);
  await page.screenshot({path:`${out}/${engine}-${width}-${states.length}-${blocked?'dim':'ready'}.png`});states.push(sample);
 }
 assert.deepEqual(errors,[]);results.push({width,dpr,states,errors});await ctx.close();console.log('PASS card state resolution',engine,width);
 await fs.writeFile(`${out}/${engine}-report.json`,JSON.stringify({origin,engine,results,boundary:'Actual shipped board/controller with synthetic state. Desktop/mobile browser viewports, not physical devices or authenticated PvP.'},null,2));
}}finally{await browser.close();}
