import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5338',out=process.env.LORE_TEST_OUTPUT||'docs/sound-redesign/2026-09-30/checks';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/audio-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><button id="unlock">音声テスト</button>'}));
 await page.goto(origin+'/audio-fixture.html');
 const files=JSON.parse(await fs.readFile('client/public/sfx/lore-v5/manifest.json','utf8')).sounds;
 const clips=await page.evaluate(async files=>{
  const decoder=new AudioContext(),report=[];window.qaClipNames=new Map();window.qaFingerprint=b=>{const x=b.getChannelData(0);let h=0;for(let i=0;i<128;i++)h=(h*31+Math.round(x[Math.floor(i*x.length/128)]*1e7))|0;return b.length+':'+h;};
  for(const [name,rows] of Object.entries(files))for(const clip of rows){
   const r=await fetch(clip.url);if(!r.ok)throw Error(clip.file+' unavailable');const b=await decoder.decodeAudioData(await r.arrayBuffer());
   window.qaClipNames.set(window.qaFingerprint(b),name);
   const offline=new OfflineAudioContext(2,b.length,44100),source=offline.createBufferSource();source.buffer=b;source.connect(offline.destination);source.start();const pcm=await offline.startRendering();let peak=0,energy=0;for(const x of pcm.getChannelData(0)){peak=Math.max(peak,Math.abs(x));energy+=x*x;}
   report.push({name,file:clip.file,channels:b.numberOfChannels,duration:b.duration,peak,rms:Math.sqrt(energy/b.length)});
  }
  await decoder.close();return report;
 },files);
 assert.equal(clips.length,41);for(const clip of clips){assert.equal(clip.channels,2);assert(clip.peak>0.003&&clip.peak<.71);assert(clip.rms>0);}
 const checks=['all 41 local MP3s decode to stereo and render non-silent PCM in real Chrome Web Audio'];
 // Vite exposes source modules locally. Static staging validates exactly the deployed clips.
 if(!origin.startsWith('https:')){
  await page.evaluate(async()=>{
   window.qaStarts=0;window.qaLive=0;window.qaTrace=[];
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){window.qaStarts++;window.qaLive++;window.qaTrace.push({cue:qaClipNames.get(qaFingerprint(this.buffer)),at:performance.now()});this.addEventListener('ended',()=>window.qaLive--,{once:true});return start.apply(this,args);};
   const controllerSource=await (await fetch('/src/game/controller.ts')).text();const soundUrl=controllerSource.match(/from "([^"]*\/sound\.ts[^"]*)"/)[1];
   window.s=await import(soundUrl);window.o=await import('/src/ui/openingSound.ts');s.initSound();
  });
  await page.click('#unlock');await page.evaluate(()=>s.warmSounds());
  const result=await page.evaluate(async()=>{
   const pause=ms=>new Promise(r=>setTimeout(r,ms));
   const played=[];
   for(const name of s.SFX_NAMES){const count=qaStarts;s.sfx(name);if(qaStarts===count+1)played.push(name);s.stopSounds();await pause(45);}
   const opening=o.openingAudio();opening.play('rise');await pause(25);opening.stop();await pause(65);const afterCancel=qaLive;
   s.sfx('mana');s.setSfxVolume(0);await pause(65);const afterMute=qaLive;s.setSfxVolume(.7);
   return {played,afterCancel,afterMute};
  });
  assert.equal(result.played.length,35);assert.equal(result.afterCancel,0);assert.equal(result.afterMute,0);
  checks.push('all 35 gameplay cues play through real shared AudioContext; opening cancellation and mute end every source');
  await page.evaluate(async()=>{
   document.body.innerHTML='<div id="app"></div>';
   for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
   const {BaseController}=await import('/src/game/controller.ts'),{createGame}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');
   class Harness extends BaseController{submit(){}maybeBot(){}}
   const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}}),g=createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'A'},p1:{id:'bot',name:'B'}}).state;
   const mon=(uid)=>({...DB.ELF,uid,tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
   g.turn=3;g.phase='main';g.cur=0;g.pending=null;g.players[0].field=[mon('audio-a')];g.players[1].field=[mon('audio-b')];c.introShown=true;c.applyResult({state:g,events:[]},false);window.qaController=c;window.qaMon=mon;window.qaStopLayout=(await import('/src/ui/layout.ts')).startBoardLayout();
  });
  await page.waitForSelector('.duel-loader',{state:'detached',timeout:60000});await page.waitForSelector('#meRow .card[data-uid="audio-a"]');
  const battle=await page.evaluate(async()=>{
   const c=qaController,run=async events=>{s.stopSounds();qaTrace=[];await c.playEvents(c.state,{state:structuredClone(c.state),events});return qaTrace.map(x=>x.cue);};
   const monster=await run([{type:'attack',player:0,uid:'audio-a',targetUid:'audio-b'},{type:'hit',uid:'audio-b'}]);
   const zeroFace=await run([{type:'attack',player:0,uid:'audio-a',targetUid:null,contactDamage:0}]);
   const zeroMonster=await run([{type:'attack',player:0,uid:'audio-a',targetUid:'audio-b',contactDamage:0},{type:'hit',uid:'audio-b'}]);
   const blockedThenDamage=await run([{type:'attack',player:0,uid:'audio-a',targetUid:null,contactDamage:0},{type:'damage',player:1,amount:2}]);
   const face=await run([{type:'attack',player:0,uid:'audio-a',targetUid:null},{type:'damage',player:1,amount:4}]);
   const heal=await run([{type:'heal',player:1,amount:4}]);
   s.stopSounds();qaTrace=[];let impactAt;const listener=()=>impactAt=performance.now();window.addEventListener('lore:summon-impact',listener,{once:true});
   const next=structuredClone(c.state);next.players[0].field.push(qaMon('audio-new'));await c.playEvents(c.state,{state:next,events:[{type:'summon',player:0,uid:'audio-new',id:'ELF'}]});
   const summon=qaTrace.find(x=>x.cue==='summon');window.removeEventListener('lore:summon-impact',listener);
   const A=await import('/src/ui/anim.ts');
   s.stopSounds();qaTrace=[];await A.buyReveal(qaMon('paid-buy'),'me',new DOMRect(160,240,80,120),undefined,0,2);const paidBuy=qaTrace.map(x=>x.cue);
   s.stopSounds();qaTrace=[];await A.buyReveal(qaMon('free-buy'),'me',null,undefined,0,0);const freeBuy=qaTrace.map(x=>x.cue);
   c.fastForward();const skipped=await run([{type:'damage',player:1,amount:4},{type:'heal',player:0,amount:3},{type:'dice',player:0,rolls:[6]}]);
   c.destroy();qaStopLayout();return {zeroFace,zeroMonster,blockedThenDamage,monster,face,heal,skipped,paidBuy,freeBuy,summonOffset:impactAt!=null&&summon?Math.abs(impactAt-summon.at):null};
  });
  assert.deepEqual(battle.zeroFace,['attack']);assert.deepEqual(battle.zeroMonster,['attack']);assert.deepEqual(battle.blockedThenDamage,['attack','damage']);assert.deepEqual(battle.monster,['attack','impact']);assert.deepEqual(battle.face,['attack','facehit']);assert.deepEqual(battle.heal,['heal']);assert.deepEqual(battle.skipped,[]);assert.deepEqual(battle.paidBuy,['mana-pay','buy']);assert.deepEqual(battle.freeBuy,['buy']);assert(battle.summonOffset!=null&&battle.summonOffset<40,JSON.stringify(battle));
  checks.push('Zero/prevented contact has sweep only; later independent damage stays audible');
  checks.push('Paid purchase: mana-pay then buy; free purchase: buy only');
  checks.push('actual BaseController: one contact cue per attack, opponent healing audible, summon sound within 40 ms of landing VFX, fast-forwarded damage/heal/dice stay silent');

 }
 assert.deepEqual(errors,[]);await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/audio-browser.json',JSON.stringify({origin,checks,clips,errors},null,2)+'\n');console.log('PASS',checks);
}finally{await browser.close();}
