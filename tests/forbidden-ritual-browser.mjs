import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const dir=path.resolve('docs/releases/2026-10-14-forbidden-spiral-03');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
for(const scenario of [{side:0,roll:6,count:3,w:1280},{side:1,roll:5,count:1,w:390},{side:0,roll:4,count:3,w:1280},{side:0,roll:6,count:3,w:390,skip:true},{side:0,roll:6,count:3,w:390,reduced:true}]){
 const context=await browser.newContext({viewport:{width:scenario.w,height:scenario.w===390?844:900},reducedMotion:scenario.reduced?'reduce':'no-preference'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`${process.env.LORE_FORBIDDEN_URL||'http://127.0.0.1:5739'}/forbidden-runtime.html?side=${scenario.side}&roll=${scenario.roll}&count=${scenario.count}`,{timeout:180000});await page.waitForFunction(()=>window.forbiddenRuntime?.ready,{},{timeout:180000});
 await page.evaluate(()=>{window.observed={ritual:false,dice:false,hpAtDice:[],overlap:false};window.watch=setInterval(()=>{const o=window.observed,ritual=document.querySelector('.forbidden-ritual'),dice=document.querySelector('.d3-overlay');o.ritual ||= !!ritual;o.dice ||= !!dice;if(dice)o.hpAtDice.push(document.querySelector('#hp-'+(window.forbiddenRuntime.side?'opp':'me'))?.textContent);if(ritual&&dice)o.overlap=true;},30);window.playDone=false;window.forbiddenRuntime.play().then(r=>{window.result=r;window.playDone=true;});});
 if(scenario.roll>=5&&!scenario.reduced){await page.waitForSelector('.forbidden-ritual',{timeout:180000});await page.waitForFunction(()=>Number(document.querySelector('.forbidden-ritual')?.getAttribute('data-time'))>2400,{},{timeout:30000});await page.screenshot({path:`${dir}/side-${scenario.side}-${scenario.w}${scenario.skip?'-skip':''}.png`});if(scenario.skip)await page.evaluate(()=>window.forbiddenRuntime.skip());}
 await page.waitForFunction(()=>window.playDone,{},{timeout:180000});
 const result=await page.evaluate(()=>{clearInterval(window.watch);return {observed:window.observed,final:document.querySelector('#hp-'+(window.forbiddenRuntime.side?'opp':'me'))?.textContent,field:[...document.querySelectorAll('#'+(window.forbiddenRuntime.side?'opp':'me')+'Row .zone-mon > .card')].map(e=>e.dataset.uid),remaining:document.querySelectorAll('.forbidden-ritual').length,events:window.result.events.filter(e=>e.type==='summon'||e.type==='dice'||e.type==='damage')}});
 assert.deepEqual(errors,[]);assert(result.observed.dice);assert.deepEqual([...new Set(result.observed.hpAtDice)],['1']);assert(!result.observed.overlap);assert.equal(result.remaining,0);assert.equal(result.final,'1');assert.equal(result.field.length,scenario.roll>=5?4:4-scenario.count);assert.equal(new Set(result.field).size,result.field.length);assert.equal(result.observed.ritual,scenario.roll>=5&&!scenario.reduced);
 results.push({scenario,...result,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
}
}finally{await writeFile(dir+'/browser-qa.json',JSON.stringify(results,null,2));await browser.close();}
