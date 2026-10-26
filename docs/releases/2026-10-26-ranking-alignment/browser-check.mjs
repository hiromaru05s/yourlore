import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const origin=process.env.ORIGIN||'http://127.0.0.1:5567', out=process.env.OUT||'tmp/ranking-layout';
await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(p,req=>{const path=new URL(req.url).pathname;
if(path==='/api/auth/me')return {user:{id:'qa',display:'SEEKER',credits:100,wins:1,losses:2}};
if(path==='/api/geo')return {country:'JP'};
if(path==='/api/rank/leaderboard')return {season:'2026-10',entries:[{rank:1,userId:'a',display:'PYAP',tier:'bronze',mmr:1036,wins:2,losses:0},{rank:2,userId:'qa',display:'hiromaru',tier:'iron',mmr:986,wins:1,losses:2},{rank:3,userId:'c',display:'신 무',tier:'iron',mmr:984,wins:0,losses:1},{rank:4,userId:'d',display:'とても長いシーカーの名前ABCDEFGHIJK',tier:'gm',mmr:2050,wins:999,losses:123}]};
if(path==='/api/rank/me')return {rating:{rank:2,tier:'iron',mmr:986,wins:1,losses:2}};
if(path==='/api/rank/decks')return {display:'PYAP',rank:1,decks:[]};
if(path==='/api/rewards/tutorial')return {keys:[],offered:true};
if(path==='/api/rewards/progression')return {credits:100,resetsAt:Date.now()+86400000,online:0,ranked:0,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{}};
return {ok:true,keys:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
try {
await p.goto(origin);await p.locator('#startup').waitFor({state:'hidden',timeout:90000});await p.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));await p.locator('[data-nav=leaderboard]').evaluate(el=>el.click());await p.locator('.lb-deck-trigger').first().waitFor();await p.waitForFunction(()=>![...document.querySelectorAll('.game-loading')].some(el=>el.getBoundingClientRect().width>0),{},{timeout:90000});
await p.evaluate(async()=>{const image=new Image();image.src='/art/ui/lore-panel-azure-cut.png';await image.decode();await document.fonts.ready;});await p.waitForTimeout(500);
const checks=[];
for(const width of [1440,1070,820,390,320]){
 await p.setViewportSize({width,height:900});await p.waitForTimeout(200);
 const layout=await p.evaluate(()=>{const head=document.querySelector('.lb-columns'),row=document.querySelector('#lbList .lb-row');const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,width:r.width,display:s.display,align:s.textAlign,justify:s.justifyContent}};const btn=getComputedStyle(document.querySelector('.lb-deck-trigger'));return {head:[...head.children].map(box),row:[...row.children].map(box),button:{image:btn.borderImageSource,background:btn.backgroundColor},overflow:document.documentElement.scrollWidth>innerWidth};});
 for(let i=0;i<5;i++){if(layout.head[i].display==='none')continue;assert(Math.abs(layout.head[i].x-layout.row[i].x)<1,`column ${i} at ${width}: ${JSON.stringify(layout)}`);assert(Math.abs(layout.head[i].width-layout.row[i].width)<1);}
 assert.equal(layout.button.image,'none');assert.equal(layout.button.background,'rgba(0, 0, 0, 0)');assert.equal(layout.overflow,false);
 if(width>1050)assert(layout.row[1].width<=280);
 checks.push({width,...layout});await p.screenshot({path:`${out}/${width}.png`});
}
await p.setViewportSize({width:1440,height:900});const trigger=p.locator('.lb-deck-trigger').first();await trigger.click();await p.locator('.ranked-decks').waitFor();assert.equal(await trigger.getAttribute('aria-expanded'),'true');await trigger.click();assert.equal(await p.locator('.ranked-decks').count(),0);await trigger.focus();await p.keyboard.press('Enter');await p.locator('.ranked-decks').waitFor();
assert.deepEqual(errors,[]);await fs.writeFile(`${out}/checks.json`,JSON.stringify({origin,api:'synthetic fixtures',checks,errors,deckToggle:true,keyboard:true},null,2));console.log('PASS column alignment, plain links, desktop/mobile overflow, deck toggle and keyboard');
}catch(e){await p.screenshot({path:out+'/failure.png'});console.log(await p.locator('body').innerText(),errors);throw e;}finally{await b.close()}
