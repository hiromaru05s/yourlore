import {chromium} from '/tmp/lore-dungeon-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import path from 'node:path';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1360,height:1000}});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
async function snap(name){
 if(name.includes('board')){try{await page.screenshot({path:out+name,fullPage:true,timeout:20000});}catch(e){console.log('Screenshot deferred',name);}return;}
 const data=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=880;const ctx=canvas.getContext('2d');ctx.fillStyle=document.querySelector('#app').classList.contains('dark')?'#172927':'#e6e9df';ctx.fillRect(0,0,960,880);const l=window.dungeonLab,r=l.renderer();for(let v=0;v<4;v++){const c=document.createElement('canvas');c.width=480;c.height=390;r.draw(c,v,l.state.ms);ctx.drawImage(c,v%2*480,Math.floor(v/2)*440+35);ctx.fillStyle=document.querySelector('#app').classList.contains('dark')?'#d6decf':'#223831';ctx.font='18px sans-serif';ctx.fillText('0'+(v+1),v%2*480+20,Math.floor(v/2)*440+25);}return canvas.toDataURL().split(',')[1];});await fs.writeFile(out+name,Buffer.from(data,'base64'));
}
function check(name,value){if(checks.length%10===0)console.log('Checking',name);checks.push({name,pass:!!value});if(!value)throw Error(name);}
try{
 await page.goto('http://127.0.0.1:5459/dungeon-four.html?qa');await page.waitForFunction(()=>window.dungeonLab?.ready);
 for(let v=0;v<4;v++){
  await page.evaluate(v=>{window.dungeonLab.setMode('detail');window.dungeonLab.seek([1190,1420,1360,1540][v],v);},v);
  await snap(`detail-0${v+1}.png`);
  for(const t of [0,350,800,1500,2350,3000]){const finite=await page.evaluate(({v,t})=>{const l=window.dungeonLab;l.seek(t,v);const r=l.renderer();return r.skins.every(m=>Array.from(m.geometry.attributes.position.array).every(Number.isFinite));},{v,t});check(`variant ${v+1} finite geometry at ${t}`,finite);}
 }
 await page.evaluate(()=>{window.dungeonLab.setMode('grid');window.dungeonLab.seek(1380);});await snap('comparison-white.png');
 await page.getByRole('button',{name:'白い背景',exact:true}).click();await snap('comparison-dark.png');
 await page.getByRole('button',{name:'暗い背景',exact:true}).click();
 await page.getByLabel('反復',{exact:true}).uncheck();await page.evaluate(()=>{window.dungeonLab.seek(0);window.dungeonLab.play();});await page.waitForFunction(()=>window.dungeonLab.state.ms===3000&&!window.dungeonLab.state.playing,{},{timeout:15000});check('normal speed completes',true);
 await page.getByLabel('反復',{exact:true}).check();await page.evaluate(()=>{window.dungeonLab.seek(2980);window.dungeonLab.play();});await page.waitForTimeout(950);check('loop returns to beginning',(await page.evaluate(()=>window.dungeonLab.state.ms))<1100);await page.evaluate(()=>window.dungeonLab.pause());
 await page.evaluate(()=>{window.dungeonLab.reduce(true);});check('reduced motion stops playback',await page.evaluate(()=>!window.dungeonLab.state.playing&&window.dungeonLab.state.ms===3000));await page.evaluate(()=>window.dungeonLab.reduce(false));
 await page.evaluate(()=>window.dungeonLab.setMode('board'));await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.dungeonBoard?.state.ready);
 const board=page.frames().find(f=>f.url().includes('?board'));
 for(const side of [0,1])for(const multi of [false,true])for(let v=0;v<4;v++){
  await page.evaluate(({side,multi,v})=>{const l=window.dungeonLab;l.setSide(side);l.setMulti(multi);l.seek(1420,v);},{side,multi,v});await page.waitForTimeout(90);
  const s=await board.evaluate(()=>window.dungeonBoard.state);check(`board ${side}/${multi}/${v+1}`,s.overlays===(multi?3:1)&&s.hidden===(multi?3:1));
 }
 await snap('board-opponent-three.png');
 await page.evaluate(()=>{window.dungeonLab.setSide(0);window.dungeonLab.setMulti(false);window.dungeonLab.summon();});await page.waitForTimeout(650);check('hand summon is running',await board.evaluate(()=>window.dungeonBoard.state.active));await snap('board-hand.png');
 await page.evaluate(()=>window.dungeonLab.stop());await page.waitForTimeout(80);check('cancel restores cards and overlays',await board.evaluate(()=>window.dungeonBoard.state.hidden===0&&window.dungeonBoard.state.overlays===0));
 await page.evaluate(()=>window.dungeonLab.summon());await page.waitForTimeout(3800);check('hand summon completes cleanly',await board.evaluate(()=>!window.dungeonBoard.state.active&&window.dungeonBoard.state.hidden===0&&window.dungeonBoard.state.overlays===0));
 await page.evaluate(()=>{window.dungeonLab.seek(1300,2);});await page.waitForTimeout(80);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);check('resize restores cards',await board.evaluate(()=>window.dungeonBoard.state.hidden===0));
 await page.evaluate(()=>window.dungeonLab.seek(1350,2));await page.waitForTimeout(100);await snap('mobile-board.png');
 await page.evaluate(()=>window.dungeonLab.setMode('grid'));await page.waitForFunction(()=>document.querySelector('iframe').getAttribute('src')==='about:blank');check('mode exit removes board context',true);
 for(const width of [320,390,844]){await page.setViewportSize({width,height:844});await page.evaluate(()=>window.dungeonLab.seek(1300));check(`no horizontal overflow ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:844});await snap('mobile-comparison.png');
 await page.setViewportSize({width:1360,height:1000});await page.evaluate(()=>{window.dungeonLab.setMode('detail');window.dungeonLab.seek(1300,0);});
 const perf=await page.evaluate(()=>{const l=window.dungeonLab,r=l.renderer(),canvas=document.querySelector('#large'),times=[];for(let i=0;i<50;i++){const start=performance.now();r.draw(canvas,i%4,i*60);times.push(performance.now()-start);}times.sort((a,b)=>a-b);return{medianMs:times[25],p95Ms:times[47],renderer:r.gl.info.render,geometryCount:r.gl.info.memory.geometries,textureCount:r.gl.info.memory.textures,note:'Headless Chrome, GPU submission plus canvas copy; shared host. Not a mobile FPS guarantee.'};});await fs.writeFile(out+'performance.json',JSON.stringify(perf,null,2));
 check('no browser page errors',errors.length===0);
 await fs.writeFile(out+'report.json',JSON.stringify({checks,errors,viewport:[1360,1000],status:'preview only'},null,2));console.log(JSON.stringify({passed:checks.length,errors,perf}));
}catch(e){console.log('FAILED URL',page.url(),(await page.locator('body').innerText()).slice(0,1400));await fs.writeFile(out+'failure.json',JSON.stringify({error:String(e),checks,errors},null,2));throw e;}finally{await browser.close();}
