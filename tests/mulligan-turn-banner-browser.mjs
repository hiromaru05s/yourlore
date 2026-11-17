import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5173';
const temp=await mkdtemp(path.join(tmpdir(),'opening-banner-'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-webgl']});
try {
  await build({entryPoints:['client/src/shared/engine.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'engine.mjs')});
  const {createGame,reduce}=await import(path.join(temp,'engine.mjs'));
  for(const starting of [0,1]) {
    const page=await browser.newPage({viewport:starting?{width:390,height:844}:{width:1280,height:720}});
    page.setDefaultTimeout(90000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let state=createGame({mode:'online',seed:17,starting,mulligan:true,p0:{id:'opening-qa',name:'QA'},p1:{id:'opponent',name:'Opponent'}}).state;
    await apiFixture(page,r=>{
      switch(new URL(r.url).pathname){
        case '/api/auth/me':return {user:{id:'opening-qa',display:'QA',avatar:'SEEKER_BLUE'}};
        case '/api/geo':return {country:'JP'};
        case '/api/social/friends':return {friends:[],incoming:[],outgoing:[],challenges:[]};
        default:return {ok:true};
      }
    });
    await page.exposeFunction('confirmOpeningHand',action=>{state=reduce(state,action).state;return state;});
    await page.addInitScript(initial=>{
      localStorage.setItem('lore_lang','ja');
      localStorage.setItem('lore_game',JSON.stringify({roomId:'opening-qa',you:0,ts:Date.now(),userId:'opening-qa'}));
      window.seenBanners=[];
      new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.matches?.('.fx-turn-sigil'))window.seenBanners.push(n.getAttribute('aria-label'));}).observe(document,{childList:true,subtree:true});
      const Native=window.WebSocket;
      window.WebSocket=class {
        static OPEN=1;readyState=1;startsAt=null;
        constructor(url){if(!url.includes('/ws/room/'))return new Native(url);window.roomFixture=this;setTimeout(()=>this.onopen?.(),0);}
        snapshot(state,type){const now=Date.now(),playableAt=this.startsAt===null?null:this.startsAt+1600;
          this.onmessage?.({data:JSON.stringify({type,state:{...state,opening:{startsAt:this.startsAt,playableAt,serverNow:now},mulliganUntil:now+30000},events:[]})});}
        async send(raw){const m=JSON.parse(raw);
          if(m.type==='ready')this.snapshot(initial,'init');
          if(m.type==='openingReady'){this.startsAt=Date.now()+100;this.snapshot(initial,'init');}
          if(m.type==='action'&&m.action.type==='mulligan')this.snapshot(await window.confirmOpeningHand(m.action),'update');
        }
        close(){this.readyState=3;}
      };
    },state);
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('.opening-hand-picker .study-action').waitFor();
    assert.deepEqual(await page.evaluate(()=>window.seenBanners),[],'opening and hand selection must not announce');
    await page.locator('.opening-hand-picker .study-action').click();
    await page.locator('.opening-hand-picker.is-confirmed').waitFor();
    assert.deepEqual(await page.evaluate(()=>window.seenBanners),[],'waiting for opponent must not announce');
    state=reduce(state,{type:'mulligan',player:1,uids:[]}).state;
    const update=()=>page.evaluate(s=>window.roomFixture.snapshot(s,'update'),state);
    await update();
    const banner=page.locator('.fx-turn-sigil');
    await banner.waitFor();
    assert.equal(await page.locator('.opening-hand-picker').count(),0);
    const expected=(starting?'相手のターンです':'あなたのターンです')+' ターン · 01';
    assert.equal(await banner.getAttribute('aria-label'),expected);
    await update();
    await banner.waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(()=>window.seenBanners),[expected],'duplicate snapshots must not replay the banner');
    assert.deepEqual(errors,[]);await page.close();
    console.log('PASS',origin,expected,'once, after both hands are confirmed');
  }
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
