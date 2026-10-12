const {chromium}=await import(process.env.LORE_PLAYWRIGHT_PATH||'playwright');
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text()+' '+e.location().url);});
try{
 if(!process.argv.includes('--screens')){await page.goto('http://127.0.0.1:55217/void-four.html?verify',{timeout:120000,waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.qa,null,{timeout:360000});
 console.log(await page.locator('#status').textContent());}
 await fs.writeFile(out+'browser-errors.json',JSON.stringify(errors,null,2));
 await page.goto('http://127.0.0.1:55217/void-four.html?qa',{timeout:120000});await page.waitForFunction(()=>window.voidLab?.ready,null,{timeout:90000});
 await page.evaluate(()=>window.voidLab.seek(1050));await page.screenshot({path:out+'comparison-final.png',fullPage:true});
 await page.getByRole('button',{name:'白い盤面',exact:true}).click();await page.screenshot({path:out+'comparison-dark.png',fullPage:true});
 await page.getByRole('button',{name:'次元幽閉者',exact:true}).click();await page.evaluate(()=>window.voidLab.seek(1120));await page.screenshot({path:out+'jailer-final.png',fullPage:true});
 for(const width of [390,844]){await page.setViewportSize({width,height:844});await page.screenshot({path:out+'responsive-'+width+'.png',fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)errors.push('Horizontal overflow '+width);}
 await page.setViewportSize({width:1280,height:900});await page.getByRole('button',{name:'実盤面・手札から',exact:true}).click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.search==='?board');const f=page.frames().find(f=>f.url().includes('?board'));await f.waitForFunction(()=>window.voidBoard?.state.ready,null,{timeout:120000});
 await page.evaluate(()=>window.voidLab.seek(1050,3));await f.waitForFunction(()=>window.voidBoard?.state.ms===1050&&window.voidBoard?.state.rigs===1);await page.locator('iframe').screenshot({path:out+'board-jailer-cage.png'});await page.setViewportSize({width:390,height:844});await f.waitForFunction(()=>window.voidBoard?.state.ms===1050&&window.voidBoard.state.rigs===1);await page.locator('iframe').screenshot({path:out+'board-mobile.png'});await page.setViewportSize({width:1280,height:900});console.log('Board resize preserves paused effect');
 await page.evaluate(()=>{window.voidLab.setSide(1);window.voidLab.setMulti(true);window.voidLab.seek(1350,2)});await f.waitForFunction(()=>window.voidBoard?.state.ms===1350&&window.voidBoard?.state.rigs===3);await page.locator('iframe').screenshot({path:out+'board-opp-three.png'});
 await page.evaluate(()=>{window.voidLab.setSide(0);window.voidLab.setMulti(false);window.voidLab.seek(0);});await f.waitForFunction(()=>window.voidBoard?.state.ms===0&&window.voidBoard?.state.side===0);await f.locator('.hand .card').nth(0).click();await page.waitForFunction(()=>window.voidLab?.state.playing);if(await f.evaluate(()=>window.voidBoard.state.requestedHand)!==0)throw Error('Wrong source card');console.log('Hand-click route passed: clicked card 0 is the source');await page.evaluate(()=>window.voidLab.pause());
 await fs.writeFile(out+'browser-errors.json',JSON.stringify(errors,null,2));console.log(JSON.stringify({errors}));
}catch(e){console.log(await page.locator('#status').textContent().catch(()=>''));console.log(JSON.stringify(errors));await page.screenshot({path:out+'failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
