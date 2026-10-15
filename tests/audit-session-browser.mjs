import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5174';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/audit-session',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/audit-session');
 const result=await page.evaluate(async()=>{
  const {OnlineController}=await import('/src/game/online.ts');
  const {App}=await import('/src/router.ts');
  const {api}=await import('/src/net/api.ts');
  const {saveActiveGame,loadActiveGame}=await import('/src/net/resume.ts');
  let homes=0,logins=0;
  const ctrl=Object.create(OnlineController.prototype);Object.assign(ctrl,{closing:false,retries:6,openedAt:0,exits:{onHome:()=>homes++}});
  saveActiveGame('missing-room',0,false,'account-a');ctrl.onSockClose();
  const before=loadActiveGame('account-a')?.roomId;
  document.querySelector('.modal button').click();
  const after=loadActiveGame('account-a');
  saveActiveGame('another-room',0,false,'account-a');
  const app=Object.create(App.prototype);Object.assign(app,{user:{id:'account-a'},login:()=>logins++});api.logout=async()=>({ok:true});await app.logout();
  return{before,after,homes,logins,loggedOut:app.user===null,remaining:loadActiveGame()};
 });
 assert.deepEqual(result,{before:'missing-room',after:null,homes:1,logins:1,loggedOut:true,remaining:null});assert.deepEqual(errors,[]);
 await fs.writeFile(process.env.LORE_TEST_OUTPUT||'/tmp/lore-audit-session-browser.json',JSON.stringify({result,errors},null,2));console.log('PASS exhausted reconnect Home clears stale room; logout clears account resume');
}finally{await browser.close();}
