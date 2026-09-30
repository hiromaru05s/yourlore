import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz',out='docs/sound-redesign/2026-09-30/staging';
await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile('client/public/sfx/lore-v5/manifest.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1461,height:789}});page.setDefaultTimeout(90000);
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/sfx/'))requests.push(new URL(r.url()).pathname);});
try{
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user:{id:'sound-stage-qa',display:'SOUND QA',avatar:'SEEKER_BLUE',credits:0,deck:Array(8).fill('CASTLE')}};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:{season:'2026-09',tier:'bronze',mmr:1000}};return {ok:true};});
 await page.addInitScript(()=>{
  Math.random=()=>.1;localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  window.audioStarts=[];window.audioFingerprint=b=>{const x=b.getChannelData(0);let h=0;for(let i=0;i<128;i++)h=(h*31+Math.round(x[Math.floor(i*x.length/128)]*1e7))|0;return b.length+':'+h;};
  const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){audioStarts.push({fingerprint:audioFingerprint(this.buffer),at:performance.now(),state:this.context.state});return start.apply(this,args);};
 });
 await page.goto(origin+'/?v=sound-v5',{waitUntil:'commit'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();console.log('BOT opening');
 await page.waitForSelector('.duel-table-ready');await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.duel-opening',{state:'detached'});await page.waitForSelector('#hand [data-card-id=CASTLE]');console.log('BOT ready');
 const names=await page.evaluate(async sounds=>{const decoder=new AudioContext(),names={};for(const [name,clips]of Object.entries(sounds))for(const clip of clips){const response=await fetch(clip.url);const buffer=await decoder.decodeAudioData(await response.arrayBuffer());names[audioFingerprint(buffer)]=name;}await decoder.close();return names;},manifest.sounds);
 await page.locator('#hand [data-card-id=CASTLE]').first().hover();await page.waitForTimeout(180);
 let box=await page.locator('#hand [data-card-id=CASTLE]').first().boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height*.35);await page.waitForTimeout(150);
 box=await page.locator('#hand [data-card-id=CASTLE]').first().boundingBox();const zone=await page.locator('#meRow .zone-mon').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height*.35);await page.mouse.down();await page.mouse.move(zone.x+zone.width/2,zone.y+zone.height/2,{steps:12});await page.mouse.up();
 await page.waitForSelector('#meRow .zone-mon [data-card-id=CASTLE]');await page.waitForTimeout(2300);
 const beforeAttack=await page.evaluate(()=>audioStarts.length);await page.locator('#meRow .zone-mon [data-card-id=CASTLE]').first().click();
 await page.waitForFunction(()=>document.querySelector('#meRow .zone-mon [data-monster-blocked]'));await page.waitForTimeout(500);
 const trace=(await page.evaluate(()=>audioStarts)).map(x=>({...x,cue:names[x.fingerprint]||'unknown'}));
 for(const name of ['click','coinToss','coinLand','draw','summon','attack','facehit'])assert(trace.some(x=>x.cue===name&&x.state==='running'),name+' naturally played');
 assert.deepEqual(trace.slice(beforeAttack).filter(x=>['attack','impact','facehit','damage'].includes(x.cue)).map(x=>x.cue),['attack','facehit']);
 assert(!requests.some(u=>/\/draw-[12]\.mp3$/.test(u)));assert(requests.includes('/sfx/lore-v4/draw-3.mp3'));
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/battle.png'});
 await fs.writeFile(out+'/browser.json',JSON.stringify({origin,trace,requests:[...new Set(requests)],errors,boundary:'Public staging app and natural local BOT actions; account/API fixture. AudioBufferSource start with decoded PCM fingerprints and running AudioContext; not human listening or authenticated online PvP.'},null,2)+'\n');
 console.log('PASS staging natural draw, summon, attack and facehit; HOME preserved; draw3 only');
}catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:e.stack,errors,requests,starts:await page.evaluate(()=>window.audioStarts)},null,2));throw e;}finally{await browser.close();}
