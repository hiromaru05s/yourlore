import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import {createServer} from 'vite';import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:5315,strictPort:true,hmr:false},plugins:[{name:'portrait-qa',resolveId(id){if(id==='/@portrait.js')return '\0portrait'},load(id){if(id==='\0portrait')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/portrait'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@portrait.js"></script></body></html>')}else next()})}}]});await server.listen();
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();p.setDefaultTimeout(120000);
const out=process.env.LORE_TEST_OUT||'docs/releases/2026-09-30-player-position/local';await fs.mkdir(out,{recursive:true});const checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5315/portrait');await p.waitForSelector('[data-scene-ready=true]');
 for(const [w,h]of [[1920,1037],[1461,789],[1280,720],[1280,900],[844,390],[390,844]]){
  await p.setViewportSize({width:w,height:h});
  let anchor;
  for(const count of [1,3,7])for(const blocked of [false,true])for(const [shield,dew]of [[0,0],[12,8]]){
   await p.evaluate(({count,blocked,shield,dew})=>{const q=monsterQA;q.g.players[0].field=Array.from({length:count},(_,i)=>q.mon('near-'+i,{exhausted:blocked,aura:undefined}));q.g.players[0].shield=shield;q.g.players[0].dew=dew;q.render();},{count,blocked,shield,dew});
   await p.waitForTimeout(160);
   const r=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
    const ring=rect(document.querySelector('#portraitMe .pt-ring'));
    const sources=[...document.querySelectorAll('#meRow .zone-mon .card .ad-atk,#meRow .zone-mon .card .ad-def')].map(rect);
    const stats=[...sources,...[...document.querySelectorAll('[data-layer-policy=field] .duet-card')].filter(n=>n.getBoundingClientRect().y>innerHeight/2).flatMap(n=>[...n.querySelectorAll('.ad-atk,.ad-def')].map(rect))];
    const badges=[...document.querySelectorAll('#portraitMe .pt-vitals,#portraitMe .pt-resources>span')].map(rect);
    return{ring,stats,sourceStats:sources.length,badges,shield:document.querySelector('#portraitMe .pt-shield b')?.textContent??null,dew:document.querySelector('#portraitMe .pt-dew b')?.textContent??null};
   });
   assert.equal(r.sourceStats,count*2,JSON.stringify({w,h,count,blocked,r}));
   const clearance=r.ring.y-Math.max(...r.stats.map(x=>x.bottom));
   assert(clearance>3,JSON.stringify({w,h,count,blocked,clearance,r}));
   assert(r.badges.every(x=>x.y>=0&&x.bottom<=h-7&&x.x>=0&&x.right<=w),JSON.stringify({w,h,r}));
   assert.equal(r.shield,shield?String(shield):null);assert.equal(r.dew,dew?String(dew):null);
   if(anchor)assert.deepEqual(r.ring,anchor,'Resources and monster count must not move the frame');else anchor=r.ring;
   checks.push({w,h,count,blocked,shield,dew,clearance,ring:r.ring,badgeBottom:Math.max(...r.badges.map(x=>x.bottom))});
   if(count===1&&!blocked)await p.screenshot({path:out+'/'+w+'-'+h+'-'+shield+'-'+dew+'.png'});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,boundary:'Real board/controller and persistent monster renderer with constructed game states; no authenticated online play.'},null,2));console.log('PASS',checks.length,'portrait/monster/resource combinations; min clearance',Math.min(...checks.map(x=>x.clearance)));
}finally{await b.close();await server.close()}
