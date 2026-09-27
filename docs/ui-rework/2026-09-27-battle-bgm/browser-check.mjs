import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5190';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage();const errors=[];const modes=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/battle-bgm-check',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="app"></div></body></html>'}));
 await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.goto(origin+'/battle-bgm-check');
 await page.evaluate(async()=>{
  window.tracks=[];window.sockets=[];Object.defineProperty(window,'track',{get:()=>tracks.at(-1)});const NativeAudio=window.Audio;
  window.Audio=class extends NativeAudio {constructor(...args){super(...args);window.tracks.push(this);this.events=[];for(const name of ['ended','playing'])this.addEventListener(name,()=>this.events.push({name,at:performance.now()}));}};
  // Exercise the real online controller without contacting a server or entering matchmaking.
  window.WebSocket=class {static OPEN=1;readyState=1;constructor(){sockets.push(this);setTimeout(()=>this.onopen?.(),0);}send(){}close(){this.readyState=3;this.onclose?.();}};
  for(const css of ['tokens','base','card','game-overlays','game','screens','reading-board','duel-opening'])await import('/src/styles/'+css+'.css');
  window.sound=await import('/src/ui/sound.ts');sound.setSfxVolume(.7);
  const {mountGame}=await import('/src/screens/game.ts');window.engine=await import('/src/shared/engine.ts');
  window.app={root:document.getElementById('app'),user:null,home(){},tutorial(){}};
  window.mount=opts=>{window.screenHandle?.destroy();app.root.innerHTML='';window.screenHandle=mountGame(app,opts);if(opts.mode==='online'){const state=engine.createGame({mode:'online',seed:12,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;state.turn=2;sockets.at(-1).onmessage({data:JSON.stringify({type:'init',state,events:[]})});}};
 });
 for(const opts of [{mode:'online',roomId:'bgm-normal-fixture',you:0,oppName:'QA',ranked:false},{mode:'online',roomId:'bgm-ranked-fixture',you:0,oppName:'QA',ranked:true},{mode:'bot',difficulty:'easy'}]){
  await page.evaluate(opts=>mount(opts),opts);
  await page.waitForFunction(()=>track?.currentSrc.endsWith('/music/poised-opening.mp3')&&track.currentTime>.05&&!track.paused);
  assert.equal(await page.evaluate(()=>track.currentSrc.endsWith('/music/poised-opening.mp3')),true);
  assert.equal(await page.evaluate(()=>track.loop),false,'gap is implemented with ended, not native loop');
  assert(Math.abs(await page.evaluate(()=>track.volume)-.147)<.0001,'60% of home gain at default volume');
  assert.equal(await page.evaluate(()=>tracks.filter(a=>!a.paused).length),1,'one active music track');
  modes.push(opts.mode==='bot'?'BOT':opts.ranked?'ranked':'normal');
 }
 // Verify the actual media ending, then time its next audible playback.
 await page.evaluate(()=>track.currentTime=track.duration-.15);
 await page.waitForFunction(()=>track.ended);
 await page.evaluate(()=>{document.dispatchEvent(new MouseEvent('click'));document.dispatchEvent(new KeyboardEvent('keydown',{key:'a'}));sound.setSfxVolume(.5);});
 await page.waitForTimeout(2200);
 assert.equal(await page.evaluate(()=>track.paused&&track.ended),true,'input and volume cannot skip 3-second gap');
 await page.waitForFunction(()=>!track.paused&&track.currentTime<2);
 const gap=await page.evaluate(()=>{const ended=track.events.findLast(e=>e.name==='ended');return track.events.find(e=>e.name==='playing'&&e.at>ended.at).at-ended.at;});
 assert(gap>=2950&&gap<4500,`actual loop gap ${gap}ms`);
 assert.equal(await page.evaluate(()=>track.volume),.075);
 // Exercise the real in-board range handler, including immediate mute.
 await page.evaluate(()=>{const range=document.querySelector('.vol-pop input');range.value='0';range.dispatchEvent(new Event('input'));});
 assert.equal(await page.evaluate(()=>track.paused),true);
 await page.evaluate(()=>{const range=document.querySelector('.vol-pop input');range.value='100';range.dispatchEvent(new Event('input'));});
 await page.waitForFunction(()=>!track.paused);
 assert.equal(await page.evaluate(()=>track.volume),.3);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>track.paused),true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>!track.paused);
 // Leaving during silence must cancel the pending restart.
 await page.evaluate(()=>track.currentTime=track.duration-.15);
 await page.waitForFunction(()=>track.ended);
 const count=await page.evaluate(()=>{window.oldTrack=track;screenHandle.destroy();return oldTrack.events.length;});
 await page.evaluate(async()=>{app.root.innerHTML='';const {mountHome}=await import('/src/screens/home.ts');window.screenHandle=mountHome(app);document.dispatchEvent(new Event('lore:screen-ready'));});
 await page.waitForFunction(()=>tracks.at(-1).currentTime>.05&&!tracks.at(-1).paused);
 assert.equal(await page.evaluate(()=>tracks.at(-1).currentSrc.endsWith('/music/yohaku-to-zankyo.mp3')),true);
 assert.equal(await page.evaluate(()=>tracks.at(-1).volume),.5);
 await page.waitForTimeout(3200);
 assert.equal(await page.evaluate(()=>oldTrack.events.length),count,'destroy cancels restart timer');
 assert.equal(await page.evaluate(()=>tracks.filter(a=>!a.paused).length),1,'home and game never overlap');
 assert.equal(await page.evaluate(()=>oldTrack.paused&&!oldTrack.hasAttribute('src')),true);
 await page.evaluate(()=>screenHandle.destroy());
 // Tutorial is outside the requested game modes and does not create a track.
 const before=await page.evaluate(()=>tracks.length);
 await page.evaluate(()=>mount({mode:'tutorial'}));
 assert.equal(await page.evaluate(()=>tracks.length),before);
 await page.evaluate(()=>screenHandle.destroy());
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',modes,gapMs:gap,checks:['real MP3 playback in all three game modes','60% home volume','3-second silence despite interactions','immediate in-board volume/mute','visibility pause/resume','destroy during gap cancels restart','return home without overlap','tutorial excluded'],errors},null,2));
}finally{await browser.close();}
