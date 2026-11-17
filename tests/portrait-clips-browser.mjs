import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-portrait-clips';await fs.mkdir(out,{recursive:true});
const clips=JSON.parse(await fs.readFile('docs/performance/2026-11-18/portrait-clips.json','utf8'));
const fixture=`import {mountNpcReaction,playNpcReaction,disposeNpcReactions} from '/src/ui/npcReaction.ts';
window.mountPortrait=stem=>{disposeNpcReactions(document.body);document.body.innerHTML='<div id="portraitOpp"><div class="pt-ring"><div class="avatar" style="position:relative;width:256px;height:256px"></div></div></div>';mountNpcReaction(document.querySelector('.pt-ring'),'/'+stem+'.webp');};window.react=action=>playNpcReaction('opp',action);window.disposePortrait=()=>disposeNpcReactions(document.body);window.ready=true;`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'clip-codec',resolveId(id){if(id==='/@clip-codec.js')return '\0clip-codec';},load(id){if(id==='\0clip-codec')return fixture;},configureServer(s){s.middlewares.use('/clip-codec',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<link rel="icon" href="data:,"><body><script type="module" src="/@clip-codec.js"></script>');});}}]});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
try{const p=await browser.newPage({viewport:{width:640,height:480}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.httpServer.address().port+'/clip-codec');await p.waitForFunction(()=>window.ready);
 for(const clip of clips){const decoded=await p.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};},clip.url);assert.equal(decoded.width,256);assert.equal(decoded.height,256);}
 for(const stem of [...new Set(clips.filter(c=>c.url.includes('/npcs/')).map(c=>c.url.split('/').at(-2)))]){
  await p.evaluate(stem=>window.mountPortrait(stem),stem);
  for(const action of ['hurt','mana','heal']){
   await p.evaluate(action=>window.react(action),action);await p.locator('[data-npc-reaction="'+action+'"]').waitFor();
   assert(await p.locator('[data-npc-reaction]').evaluate(i=>i.complete&&i.naturalWidth===256));
   if(action==='hurt'){const first=await p.locator('[data-npc-reaction]').getAttribute('src');await p.evaluate(()=>window.react('hurt'));await p.waitForFunction(first=>!!document.querySelector('[data-npc-reaction]')&&document.querySelector('[data-npc-reaction]').getAttribute('src')!==first,first);}
   await p.locator('[data-npc-reaction]').waitFor({state:'detached',timeout:4000});checks.push({stem,action,retrigger:action==='hurt'});
  }
  await p.evaluate(()=>{window.react('heal');window.disposePortrait()});await p.waitForTimeout(50);assert.equal(await p.locator('[data-npc-reaction]').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS native WebP decode of 22 clips; 21 NPC reactions, retrigger and disposal');
}finally{await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close();await server.close();}
