import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN || 'https://test.yourlore.xyz';
const out=process.env.LORE_TEST_OUTPUT || 'docs/ui-rework/2026-09-27-audio-v4/staging';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(120000);const errors=[],soundRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('/sfx/'))soundRequests.push(new URL(r.url()).pathname);});
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user:{id:'opening-qa',display:'シーカー',avatar:'SEEKER_BLUE',credits:0,sleeve:'default',furniture:'default'}};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:{season:'2026-09',tier:'bronze',mmr:1000}};return {ok:true};});
 await page.addInitScript(()=>{
  window.tracks=[];window.phases=[];const NativeAudio=window.Audio;
  window.Audio=class extends NativeAudio{constructor(...args){super(...args);this.originalUrl=args[0];this.events=[];tracks.push(this);for(const name of ['playing','ended'])this.addEventListener(name,()=>this.events.push({name,at:performance.now()}));}};
  new MutationObserver(()=>{const h=document.querySelector('.duel-opening');const phase=h?.dataset.openingPhase;if(phase&&phase!==phases.at(-1)?.phase)phases.push({phase,ms:Number(h.dataset.openingMs)});}).observe(document,{subtree:true,attributes:true});
 });
 await page.goto(origin,{waitUntil:'commit'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 console.log('staging home ready');
 await page.locator('#bot').click();await page.locator('[data-diff="easy"]').click();
 await page.waitForFunction(()=>tracks.some(t=>t.originalUrl.endsWith('clash-of-blades.mp3')&&!t.paused&&t.currentTime>.05));
 console.log('staging intro playing');
 await page.waitForFunction(()=>tracks.some(t=>t.originalUrl.endsWith('poised-opening.mp3')&&!t.paused&&t.currentTime>.05));
 await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
 const result=await page.evaluate(()=>{
  const intro=tracks.find(t=>t.originalUrl.endsWith('clash-of-blades.mp3')),battle=tracks.find(t=>t.originalUrl.endsWith('poised-opening.mp3'));
  return {phases,introEnded:intro.events.find(e=>e.name==='ended')?.at,battleStarted:battle.events.find(e=>e.name==='playing')?.at,battleVolume:battle.volume,activeTracks:tracks.filter(t=>!t.paused).length};
 });
 assert(result.introEnded&&result.battleStarted>=result.introEnded);
 assert(result.phases.find(p=>p.phase==='toss').ms>=7000);
 assert(Math.abs(result.battleVolume-.147)<.0001);assert.equal(result.activeTracks,1);
 await page.evaluate(()=>{window.battle=tracks.find(t=>t.originalUrl.endsWith('poised-opening.mp3'));battle.currentTime=battle.duration-.15;});
 await page.waitForFunction(()=>battle.ended);await page.waitForFunction(()=>!battle.paused&&battle.currentTime<2);
 result.battleLoopGapMs=await page.evaluate(()=>{const end=battle.events.findLast(e=>e.name==='ended');return battle.events.find(e=>e.name==='playing'&&e.at>end.at).at-end.at;});
 assert(soundRequests.some(u=>u.includes('/lore-v3/click-')),'approved UI requested');
 for(const cue of ['duel-start','mana','heal','summon','attack-1','impact-1','diceRoll'])assert(soundRequests.includes('/sfx/lore-v4/'+cue+'.mp3'),cue+' loaded from new bank');
 assert(soundRequests.filter(u=>u.includes('/lore-v3/')).every(u=>/\/(click-\d|pop|error)\.mp3$/.test(u)),'v3 used only for approved UI');
 assert(result.battleLoopGapMs>=2950&&result.battleLoopGapMs<4500);assert.deepEqual(errors,[]);
 await fs.mkdir(out,{recursive:true});await page.screenshot({path:out+'/battle.png'});
 await fs.writeFile(out+'/browser.json',JSON.stringify({origin,...result,soundRequests:[...new Set(soundRequests)],errors,boundary:'Account/API fixture; deployed app, real BOT game and real audio playback'},null,2)+'\n');
 console.log('PASS deployed v4 duel bank + unchanged v3 UI; real BOT intro -> battle BGM, seven-second coin, 60% gain, three-second loop');
} finally {await browser.close();}
