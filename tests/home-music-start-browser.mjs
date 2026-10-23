import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { apiFixture } from './helpers/api-fixture.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5583';
const baseline = process.env.LORE_MUSIC_BASELINE === '1';
const out = process.env.LORE_TEST_OUTPUT || '/tmp/lore-home-music';
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport:{width:1280,height:720}, serviceWorkers:'block' });
  page.setDefaultTimeout(120000);
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await apiFixture(page, request=>{
    const p=new URL(request.url).pathname;
    if(p==='/api/auth/me')return {user:{id:'music-qa',display:'シーカー',avatar:'SEEKER_BLUE',wins:12,losses:5,credits:840}};
    if(p==='/api/geo')return {country:'JP'};
    if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1144,tier:'silver'}};
    if(p==='/api/rewards/tutorial')return {offered:true,keys:[],credits:840};
    if(p==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
    return {ok:true,keys:[]};
  });
  // Give the music response a reproducible slow-network delay. All media decoding
  // and playback, HOME assets and its entrance run in the actual browser/app.
  await page.route('**/music/yohaku-to-zankyo.mp3', async route=>{
    await new Promise(r=>setTimeout(r,2500));
    await route.continue();
  });
  await page.addInitScript(()=>{
    window.musicQA={ready:[],tracks:[]};
    document.addEventListener('lore:screen-ready',()=>musicQA.ready.push(performance.now()));
    const NativeAudio=window.Audio;
    window.Audio=class extends NativeAudio {
      constructor(...args){
        super(...args);
        const trace={created:performance.now(),events:[],audio:this};
        musicQA.tracks.push(trace);
        for(const name of ['loadstart','canplay','playing','pause'])this.addEventListener(name,()=>trace.events.push({name,at:performance.now()}));
      }
    };
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>musicQA.ready.length && musicQA.tracks.some(t=>t.events.some(e=>e.name==='playing')));
  const result=await page.evaluate(()=>{
    const t=musicQA.tracks.find(t=>t.audio.src.includes('yohaku-to-zankyo'));
    const at=name=>t.events.find(e=>e.name===name)?.at;
    return {ready:musicQA.ready[0],created:t.created,loaded:at('canplay'),loadStarted:at('loadstart'),playing:at('playing'),gapMs:at('playing')-musicQA.ready[0],active:musicQA.tracks.filter(t=>!t.audio.paused).length};
  });
  if(!baseline){
    assert(result.loadStarted<result.ready,'music must load during HOME preparation');
    assert(result.gapMs>=590 && result.gapMs<1500,JSON.stringify(result));
    assert.equal(result.active,1);
    const toggle=page.locator('.home-sound-toggle');
    await toggle.click();
    assert(await page.evaluate(()=>musicQA.tracks.every(t=>t.audio.paused)));
    await toggle.click();
    await page.waitForFunction(()=>musicQA.tracks.some(t=>!t.audio.paused));
    const instances=await page.evaluate(()=>musicQA.tracks.length);
    await page.locator('[data-nav=tutorial]').click();
    await page.waitForSelector('.lounge-tutorial');
    await page.locator('[data-nav=home]').click();
    await page.waitForSelector('.lounge-home');
    assert.equal(await page.evaluate(()=>musicQA.tracks.length),instances,'menu navigation retains one track');
  }
  assert.deepEqual(errors,[]);
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(out+'/browser.json',JSON.stringify({origin,baseline,networkDelayMs:2500,...result,errors,boundary:'API fixture; actual HOME, entrance and native audio; autoplay allowed to isolate startup timing'},null,2)+'\n');
  await page.screenshot({path:out+'/home.png'});
  console.log(JSON.stringify(result));
}finally{await browser.close();}
