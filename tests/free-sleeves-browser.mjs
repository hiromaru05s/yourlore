const {chromium}=await import(process.env.LORE_PLAYWRIGHT||'playwright');
import {apiFixture} from './helpers/api-fixture.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-free-sleeves-checks';await fs.mkdir(out,{recursive:true});
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5473';
const user={id:'free-sleeves-fixture',display:'シーカー',credits:0,decks:null,frames:[],effects:[],starterCards:{STARTER_TRASH:8,STARTER_CHEST:2,STARTER_MANA:1},needsUsername:false};let saves=0;
const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('lore_lang','ja');if(!localStorage.getItem('lore_local_dev_decks')){localStorage.setItem('lore_local_dev_decks',JSON.stringify({sel:0,list:Array.from({length:9},(_,i)=>({name:'デッキ '+(i+1),cards:[...Array(6).fill('STARTER_TRASH'),'STARTER_CHEST','STARTER_CHEST'],sleeve:'default'}))}));localStorage.setItem('lore_local_guest_profile',JSON.stringify({credits:0,sleeves:[],sleeve:'default'}));}});
 await apiFixture(p,r=>{const path=new URL(r.url).pathname;if(path==='/api/auth/me')return {user};if(path==='/api/social/profile')return {profile:{...user,self:true,sleeves:[],furnitures:[],effects:[],frames:[]}};if(path==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0,now:Date.now()};if(path==='/api/rewards/tutorial')return {offered:true,keys:['tuto:1','tuto:10'],credits:0};if(path==='/api/rewards/progression')return {credits:0,ranked:0,online:0,bot:{},resetsAt:Date.now()+86400000,dailies:[]};if(path==='/api/rank/me')return {rating:{season:'2026-11',tier:'bronze',mmr:1000,wins:0,losses:0}};if(path==='/api/collection')return {credits:0,starterCards:user.starterCards,effects:[],cosmetics:[],dailyShop:{cards:[],remaining:{},day:'2026-11-20',resetsAt:Date.now()+86400000}};if(path==='/api/deck'){saves++;user.decks=r.body.decks;Object.assign(user,user.decks.list[user.decks.sel]);return {ok:true,...user};}return {ok:true,country:'JP',entries:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],dailies:[],bot:{},sleeves:[],furnitures:[]};});
 await p.goto(origin+'/deck-library-preview.html?slot=1',{waitUntil:'domcontentloaded'});await p.locator('[data-setting=sleeve]').waitFor({timeout:60000});
 await p.locator('[data-setting=sleeve]').click();
 const choices=p.locator('[data-cosmetic-kind="sleeve"]');assert.equal(await choices.count(),2);assert.equal(await p.locator('[data-cosmetic-kind="sleeve"]:disabled').count(),0);
 const results=[];
 for(const id of ['sleeve:indigo-eye','default']){
  const choice=p.locator(`[data-cosmetic-kind="sleeve"][data-cosmetic-id="${id}"]`);await choice.click();await p.waitForFunction(id=>document.querySelector('.deck-sleeve-preview')?.getAttribute('src')?.includes(id==='default'?'sleeve_default':'sleeve_indigo_eye'),id);assert.equal(await choice.getAttribute('aria-pressed'),'true');
  await p.locator('#save').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('lore_local_dev_decks')).list[0].sleeve===document.querySelector('[data-cosmetic-kind=sleeve][aria-pressed=true]').dataset.cosmeticId);
  await p.screenshot({path:out+'/'+(id==='default'?'default-picker':'eye-picker')+'.png'});
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('[data-setting=sleeve]').click();assert.equal(await p.locator(`[data-cosmetic-id="${id}"]`).getAttribute('aria-pressed'),'true');
  const stored=await p.evaluate(()=>({deck:JSON.parse(localStorage.getItem('lore_local_dev_decks')).list[0].sleeve,profile:JSON.parse(localStorage.getItem('lore_local_guest_profile'))}));assert.equal(stored.profile.credits,0);results.push({id,persisted:stored.deck});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/picker-check.json',JSON.stringify({viewport:{width:1440,height:1000},results,errors,boundary:'Actual deck editor and local save/reload with empty starting inventory and zero credits; real Worker/SQLite routes tested separately.'},null,2));console.log('PASS two available sleeves, changing preview, actual editor save/reload, zero credits',results);
}finally{await b.close();}
