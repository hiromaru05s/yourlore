import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5191';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const report=[];
try {
 const page=await browser.newPage();page.setDefaultTimeout(20000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/opening-music-check',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="app"></div></body></html>'}));
 await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 for(const mode of ['normal','ranked','BOT']){
  console.log('CHECK',mode);await page.goto(origin+'/opening-music-check');
  await page.evaluate(async mode=>{
   window.tracks=[];window.sockets=[];const NativeAudio=window.Audio;
   window.Audio=class extends NativeAudio {constructor(...args){super(...args);this.originalUrl=args[0];this.events=[];tracks.push(this);for(const name of ['playing','ended'])this.addEventListener(name,()=>this.events.push({name,at:performance.now()}));}};
   window.WebSocket=class {static OPEN=1;readyState=1;constructor(){sockets.push(this);setTimeout(()=>this.onopen?.(),0);}send(){}close(){this.readyState=3;this.onclose?.();}};
   for(const css of ['tokens','base','card','game-overlays','game','screens','reading-board','duel-opening'])await import('/src/styles/'+css+'.css');
   window.sound=await import('/src/ui/sound.ts');sound.setSfxVolume(.7);
   const {mountGame}=await import('/src/screens/game.ts');
   window.app={root:document.getElementById('app'),user:null,home(){},tutorial(){}};
   window.screenHandle=mountGame(app,mode==='BOT'?{mode:'bot',difficulty:'easy'}:{mode:'online',roomId:'opening-music-fixture',you:0,oppName:'QA',ranked:mode==='ranked'});
   if(mode!=='BOT'){
    const E=await import('/src/shared/engine.ts');window.state=E.createGame({mode:'online',seed:12,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    state.turnTotalMs=90000;state.turnLeftMs=90000;state.opening={startsAt:null,playableAt:null,serverNow:Date.now()};
    window.feed=()=>sockets.at(-1).onmessage({data:JSON.stringify({type:'init',state,events:[]})});feed();
   }
  },mode);
  if(mode!=='BOT'){
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>tracks.length),0,'no music during opponent/preview preparation');
   await page.evaluate(()=>{const now=Date.now();state.opening={startsAt:now+350,playableAt:now+10800,serverNow:now};feed();});
  }
  await page.waitForFunction(()=>tracks[0]?.currentTime>.05&&!tracks[0].paused);console.log('intro playing',mode);
  assert.equal(await page.evaluate(()=>tracks[0].originalUrl),'/music/clash-of-blades.mp3');
  assert.equal(await page.evaluate(()=>tracks.length),1,'battle music not started under fanfare');
  await page.waitForFunction(()=>tracks.length===2&&!tracks[1].paused&&tracks[1].currentTime>.05);
  console.log('battle playing',mode);const transition=await page.evaluate(()=>({introEnd:tracks[0].events.find(e=>e.name==='ended')?.at,battleStart:tracks[1].events.find(e=>e.name==='playing')?.at,introPaused:tracks[0].paused,battleUrl:tracks[1].originalUrl,battleVolume:tracks[1].volume}));
  assert(transition.introEnd,'full intro ends naturally');assert(transition.battleStart>=transition.introEnd);
  assert(transition.battleStart-transition.introEnd<700,'prompt transition after intro');
  assert.equal(transition.introPaused,true);assert.equal(transition.battleUrl,'/music/poised-opening.mp3');
  assert(Math.abs(transition.battleVolume-.147)<.0001);
  await page.waitForFunction(()=>document.querySelector('.duel-opening')?.dataset.openingPhase==='toss');
  const coinMs=await page.locator('.duel-opening').getAttribute('data-opening-ms');
  assert(Number(coinMs)>=7000&&Number(coinMs)<7400,`coin begins at 7 seconds: ${coinMs}`);
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),true);
  await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
  await page.evaluate(()=>screenHandle.destroy());
  assert.equal(await page.evaluate(()=>tracks.every(t=>t.paused&&!t.hasAttribute('src'))),true);
  report.push({mode,coinMs:Number(coinMs),transitionGapMs:transition.battleStart-transition.introEnd});
 }
 // Disposal while the intro is still playing must never start the next track.
 await page.evaluate(async()=>{app.root.innerHTML='';const {mountGame}=await import('/src/screens/game.ts');screenHandle=mountGame(app,{mode:'bot',difficulty:'easy'});});
 await page.waitForFunction(()=>tracks.at(-1).originalUrl.endsWith('clash-of-blades.mp3')&&!tracks.at(-1).paused);
 const n=await page.evaluate(()=>{screenHandle.destroy();return tracks.length;});
 await page.waitForTimeout(7000);assert.equal(await page.evaluate(()=>tracks.length),n);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',report,checks:['no music before opening','intro naturally finishes before battle music','7-second coin start','all three modes','full first-turn gate','destroy during fanfare prevents handoff'],errors},null,2));
}finally{await browser.close();}
