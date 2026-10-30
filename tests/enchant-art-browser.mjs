import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5476';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-enchant-art';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');
 await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'),{},{timeout:90000});
 await page.evaluate(async()=>{
  // Include the common production surfaces too: they must not cover card faces.
  await import('/src/styles/mobile.css');await import('/src/styles/defaultUI.css');await import('/src/styles/defaultButtons.css');
  const {DB}=await import('/src/shared/cards.ts');
  const c=atelier.controller,g=c.state;g.turn=8;
  g.players.forEach((p,i)=>{
   p.enchants=['BREWING','BLOOD_RITE','GUILD_CO','ANCIENT_CIV'].map((id,j)=>({card:{...DB[id],uid:`art-${i}-${id}`},turns:3,bornTurn:1,...(j===0?{cnt:12}:{})}));
   const quest=Object.values(DB).find(card=>card.quest);p.quests=[{card:{...quest,uid:`art-${i}-quest`},progress:1}];
  });c.show(g);
  await Promise.all([...document.querySelectorAll('.buff-art,.buff-frame')].map(async el=>{const src=/url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage)?.[1];if(src){const image=new Image();image.src=src;await image.decode();}}));
 });
 for(const [width,height] of [[1280,900],[844,390],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  await page.evaluate(()=>{const c=atelier.controller,g=c.state;g.turn=8;for(const p of g.players){p.enchants[0].turns=3;p.enchants[0].cnt=12;}c.show(g);});
  await page.waitForTimeout(900);
  for(const phase of ['initial','updated','reduced']){
   if(phase!=='initial'){
    if(phase==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{const c=atelier.controller,g=c.state;g.turn++;for(const p of g.players){p.enchants[0].turns--;p.enchants[0].cnt+=4;}c.show(g);});
    await page.waitForTimeout(900);
   }
   const tiles=await page.locator('.zone-st .buff-icon').evaluateAll(nodes=>nodes.map(node=>{
    const frame=node.querySelector('.buff-frame').getBoundingClientRect(),art=node.querySelector('.buff-art').getBoundingClientRect();
    return{side:node.closest('#oppRow')?'opp':'me',id:node.dataset.cardId,artWidth:art.width,artHeight:art.height,frameWidth:frame.width,frameHeight:frame.height,time:node.querySelector('.enchant-time text')?.textContent,counter:node.querySelector('.card-counter')?.dataset.counterValue,infinity:!!node.querySelector('.buff-infinity')};
   }));
   assert.equal(tiles.length,10);
   for(const tile of tiles){
    // Check the rendered face, not CSS declarations: a partial image exposes
    // the dark frame interior even when its asset decoded successfully.
    assert(Math.abs(tile.artHeight-tile.frameHeight)<1,`${width}/${phase}/${tile.side}/${tile.id}: artwork must cover the frame height (${tile.artHeight}/${tile.frameHeight})`);
    assert(Math.abs(tile.artWidth-tile.frameWidth)<1,`${tile.id}: artwork must cover the frame width`);
    if(tile.id==='BREWING'){const step=['initial','updated','reduced'].indexOf(phase);assert.equal(tile.time,String(3-step));assert.equal(Number(tile.counter),12+4*step);}
    if(tile.id==='GUILD_CO')assert(tile.infinity);
   }
   await page.screenshot({path:`${out}/board-${width}-${phase}.png`});
   checks.push({width,phase,tiles});
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
 // Save the desktop animation print for a separate visual review.
 await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(500);
 const print=await page.evaluate(async()=>{
  const {captureQuestTile}=await import('/src/ui/cardSurface.ts');
  const source=document.querySelector('#meRow .buff-icon[data-card-id="BREWING"]');
  const canvas=await captureQuestTile(source);return canvas.toDataURL();
 });
 await fs.writeFile(out+'/enchant-print.png',Buffer.from(print.split(',')[1],'base64'));
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Real GameView and card renderer with local game-state fixtures; not an authenticated PvP match.'},null,2));
 console.log('PASS: full spell/quest artwork on both sides, desktop/mobile, badge updates, reduced motion, native animation print');
}finally{await context.close();await browser.close();}
