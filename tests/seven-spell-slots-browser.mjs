const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out=process.env.OUTPUT_DIR||'/tmp/lore-seven-spell-slots';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto((process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5473')+'/nameplate-board.html?count=7');await p.waitForSelector('[data-scene-ready=true]',{timeout:120000});await p.waitForTimeout(2000);
const report=[];
for(const [w,h] of [[1440,900],[1920,1080],[1280,720],[1366,768],[390,844],[844,390]]){
 await p.setViewportSize({width:w,height:h});await p.waitForTimeout(900);
 const result=await p.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
 return ['Me','Opp'].map(side=>{
 const tiles=[...document.querySelectorAll(`#${side==='Me'?'meRow':'oppRow'} .zone-st>.buff-icon`)];
 const name=document.querySelector(`#portrait${side}>.pt-name`);
 const obstacles=[name,document.querySelector(`#portrait${side} .pt-ring`),document.querySelector(`#pile-${side==='Me'?'my':'opp'}Deck`),document.querySelector(side==='Me'?'#hand':'#oppHand')];
 return {side,count:tiles.length,name:name.textContent,visible:rect(name).y>=0,rows:[...new Set(tiles.map(t=>Math.round(rect(t).y)))],collisions:tiles.flatMap(t=>obstacles.filter(o=>overlap(rect(t),rect(o))>2).map(o=>({tile:t.getAttribute('aria-label'),obstacle:o.id||o.className,area:overlap(rect(t),rect(o))}))),nameRect:rect(name)};
 });});
 report.push({w,h,result});await fs.writeFile(`${out}/seven-slots-browser.json`,JSON.stringify({errors,report},null,2));
}
await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(700);
await p.locator('#meRow .buff-icon--quest').first().click({button:'right'});await p.waitForSelector('#zoomOverlay');assert(await p.locator('.zoom-details').isVisible());await p.keyboard.press('Escape');
await p.evaluate(()=>{const c=window.nameplateBoard.controller;c.state.players[0].name='とても長い日本語のプレイヤーネーム';c.state.duelProfiles[0].level=100;c.view.render(c.state);});await p.waitForTimeout(500);
const long=await p.locator('#portraitMe .pt-name').textContent();assert(long.includes('Lv.100')); 
await fs.writeFile(`${out}/seven-slots-browser.json`,JSON.stringify({errors,report,questInspection:true},null,2));console.log(JSON.stringify({errors,report}));
assert.equal(errors.length,0);for(const r of report)for(const s of r.result){assert.equal(s.count,7);assert.equal(s.rows.length,1);assert(s.visible);assert.equal(s.collisions.length,0,`${r.w}x${r.h} ${s.side}: ${JSON.stringify(s.collisions)}`);}
await browser.close();
