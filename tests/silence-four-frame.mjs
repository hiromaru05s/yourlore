import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/vfx-prototypes/2026-10-13-silence-purple-r3/qa/frame-fix';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1320,height:1160}});page.setDefaultTimeout(120000);const errors=[],surfaces=[],cases=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5496/silence-four.html?revision=3-framefix');await page.waitForFunction(()=>window.silenceQA?.state.ready);await page.evaluate(()=>silenceQA.seek(800));
 for(const id of ['NT_SEAL5','NT_SEAL3']){
  const s=await page.evaluate(async id=>{const {surface}=await import('/src/dev/silence-four/surface.ts');const c=await surface(id),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let border=0,overhang=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(x===0||y===0||x===c.width-1||y===c.height-1)border+=a;if(x<65||x>605||y<65||y>875)overhang+=a>32?1:0;}return{id,width:c.width,height:c.height,border,overhang,png:c.toDataURL()};},id);
  assert.equal(s.width,670);assert.equal(s.height,940);assert.equal(s.border,0,'No ornament touches the texture edge');assert(s.overhang>1000,'Ornaments outside the nominal card rectangle must survive');await fs.writeFile(`${out}/${id}-surface.png`,Buffer.from(s.png.split(',')[1],'base64'));delete s.png;surfaces.push(s);
  await page.selectOption('#card',id);for(const ms of [0,800,1800,3000]){await page.evaluate(ms=>silenceQA.seek(ms),ms);await page.screenshot({path:`${out}/${id}-${ms}.png`});}
 }
 await page.evaluate(()=>silenceQA.setMode('board'));await page.waitForFunction(()=>silenceQA.state.boardReady);const frame=page.frames().find(f=>f.url().includes('?board'));assert(frame);
 for(const id of ['NT_SEAL5','NT_SEAL3']){await page.selectOption('#card',id);for(let side=0;side<2;side++){if((await frame.evaluate(()=>silenceBoard.state.side))!==side)await page.click('#side');for(let v=0;v<4;v++){
  await page.evaluate(v=>silenceQA.select(v),v);await page.evaluate(()=>silenceQA.seek(800));await frame.waitForFunction(()=>silenceBoard.state.ms===800);assert.equal(await frame.evaluate(()=>silenceBoard.state.hidden),1);if(v===0)await page.screenshot({path:`${out}/${id}-board-${side}.png`});await page.evaluate(()=>silenceQA.seek(3000));await frame.waitForFunction(()=>silenceBoard.state.ms===3000);assert.equal(await frame.evaluate(()=>silenceBoard.state.hidden),0);cases.push({id,side,v,restored:true});
 }}}
 await page.evaluate(()=>silenceQA.setMode('grid'));await page.setViewportSize({width:390,height:800});await page.evaluate(()=>silenceQA.seek(800));const scroll=await page.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);return {y:scrollY,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});assert(scroll.y>0);assert.equal(scroll.width,scroll.scrollWidth);assert.deepEqual(errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify({surfaces,cases,scroll,errors},null,2));console.log('PASS',JSON.stringify({surfaces,cases:cases.length,scroll,errors}));
}finally{await browser.close();}
