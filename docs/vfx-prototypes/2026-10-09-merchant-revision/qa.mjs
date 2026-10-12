const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/lore-target-browser-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs/promises';
const dir=new URL('./qa/',import.meta.url).pathname.replace(/\/$/,'');
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1480},deviceScaleFactor:1});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));};
await page.goto('http://127.0.0.1:55143/merchant-six.html?revision=2');await page.waitForFunction(()=>window.merchantLab?.ready,null,{timeout:90000});
for(const id of ['MERCH1','MERCH2','DARK_MERCHANT']){
 await page.evaluate(id=>{merchantLab.setCard(id);merchantLab.seek(id==='DARK_MERCHANT'?3000:1120);},id);
 const state=await page.evaluate(()=>merchantLab.state);check(id+' count',state.coinCount===(id==='MERCH1'?2:id==='MERCH2'?6:0),state);
 await page.locator('#grid').screenshot({path:dir+'/'+id+'-four.png'});
 for(let v=0;v<4;v++)for(const ms of [0,790,1250,2500,id==='DARK_MERCHANT'?6600:3100])await page.evaluate(([ms,v])=>merchantLab.seek(ms,v),[ms,v]);
}
await page.evaluate(()=>{merchantLab.setCard('MERCH2');merchantLab.seek(0);});await page.click('#play');await page.waitForTimeout(1100);
let state=await page.evaluate(()=>merchantLab.state);check('audio unlock and decode',state.playing&&state.audio.unlocked&&state.audio.loaded&&!state.audio.error,state.audio);
await page.click('#reset');state=await page.evaluate(()=>merchantLab.state);check('cancel audio',!state.playing&&state.audio.active===0&&state.ms===0,state);
await page.evaluate(()=>merchantLab.reduce(true));state=await page.evaluate(()=>merchantLab.state);check('reduced motion static and silent',state.reduced&&!state.playing&&state.audio.active===0,state);await page.evaluate(()=>merchantLab.reduce(false));
await page.evaluate(()=>merchantLab.setMode('board'));await page.waitForFunction(()=>merchantLab.state.boardReady,null,{timeout:90000});
const frame=page.frames().find(f=>f.url().includes('?board'));
for(const id of ['MERCH1','MERCH2','DARK_MERCHANT'])for(const side of [0,1])for(let v=0;v<4;v++){
 await page.evaluate(([id,side,v])=>{merchantLab.setCard(id);merchantLab.setSide(side);merchantLab.setMulti(false);merchantLab.seek(id==='DARK_MERCHANT'?3000:1150,v);},[id,side,v]);
 await frame.waitForFunction(({id,side,v})=>merchantBoard.state.card===id&&merchantBoard.state.side===side&&merchantBoard.state.variant===v,{id,side,v});
 const s=await frame.evaluate(()=>merchantBoard.state);check(`board ${id}/${side}/${v}`,id==='DARK_MERCHANT'?s.spellVisible&&s.hidden===0&&s.rigs===0:s.hidden===1&&s.rigs===1&&!s.spellVisible,s);
 if(v===0)await page.locator('iframe').screenshot({path:dir+`/board-${id}-${side}.png`});
 await page.evaluate(id=>merchantLab.seek(id==='DARK_MERCHANT'?6600:3100),id);await frame.waitForFunction(()=>merchantBoard.state.hidden===0&&!merchantBoard.state.spellVisible&&merchantBoard.state.rigs===0);
}
await page.evaluate(()=>{merchantLab.setCard('MERCH2');merchantLab.setSide(0);merchantLab.setMulti(true);merchantLab.seek(1300);});await frame.waitForFunction(()=>merchantBoard.state.rigs===3);check('three simultaneous cards',(await frame.evaluate(()=>merchantBoard.state)).hidden===3);
await page.locator('iframe').screenshot({path:dir+'/board-three.png'});
await page.evaluate(()=>{merchantLab.setMulti(false);merchantLab.seek(3100);});
await frame.locator('#hand .card').first().click({force:true});await page.waitForTimeout(100);check('hand triggers playback',(await page.evaluate(()=>merchantLab.state)).playing);
await page.evaluate(()=>{merchantLab.pause();merchantLab.setMode('grid');});
const before=await page.evaluate(()=>merchantLab.state.resources);
for(let i=0;i<24;i++)await page.evaluate(i=>{merchantLab.setCard(i%2?'MERCH1':'DARK_MERCHANT');merchantLab.seek(i%2?1250:3000,i%4);merchantLab.seek(i%2?3100:6600);},i);
const after=await page.evaluate(()=>merchantLab.state.resources);check('pooled coin resource stability',JSON.stringify(before)===JSON.stringify(after),{before,after});
for(const width of [320,390,844]){
 await page.setViewportSize({width,height:940});await page.evaluate(()=>{merchantLab.setCard('DARK_MERCHANT');merchantLab.setMode('detail');merchantLab.seek(3000);});
 const dims=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));check('responsive '+width,dims.scroll<=width,dims);await page.screenshot({path:dir+`/responsive-${width}.png`,fullPage:true});
}
check('browser errors',errors.length===0,errors);await fs.writeFile(dir+'/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors,dir}));await browser.close();
