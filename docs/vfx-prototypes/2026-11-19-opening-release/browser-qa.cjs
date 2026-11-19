const {chromium}=require('/tmp/lore-feedback-browser/node_modules/playwright');
const fs=require('fs');const assert=require('assert/strict');
const out=process.cwd()+'/docs/vfx-prototypes/2026-11-19-opening-release';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});try{
const ctx=await browser.newContext({viewport:{width:1280,height:720}});const p=await ctx.newPage();const errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
await p.addInitScript(()=>{
 performance.setResourceTimingBufferSize(10000);localStorage.setItem('lore_sfx','.7');const qa=window.audioQA={starts:[],active:0,urls:{},recorded:[]};
 const hash=b=>{const a=new Uint8Array(b);let h=0;for(let i=0;i<a.length;i+=1013)h=(h*31+a[i])|0;return a.length+':'+h;};
 const fetch0=window.fetch;window.fetch=async(...args)=>{const r=await fetch0(...args);if(r.url.includes('/sfx/')){const ab=r.arrayBuffer.bind(r);r.arrayBuffer=async()=>{const b=await ab();qa.urls[hash(b)]=r.url;return b;};}return r;};
 const dec=AudioContext.prototype.decodeAudioData;AudioContext.prototype.decodeAudioData=function(b){const url=qa.urls[hash(b)];return dec.call(this,b).then(buf=>{buf.qaUrl=url;return buf;});};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(dest,...args){const result=connect.call(this,dest,...args);if(dest instanceof AudioDestinationNode&&!qa.tap){qa.tap=this.context.createMediaStreamDestination();connect.call(this,qa.tap);qa.analyser=this.context.createAnalyser();connect.call(this,qa.analyser);}return result;};
 const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){qa.starts.push({url:this.buffer?.qaUrl,rate:this.playbackRate.value,ms:Number(document.querySelector('.duel-opening')?.dataset.openingMs),duration:this.buffer?.duration});qa.active++;this.addEventListener('ended',()=>qa.active--,{once:true});return start.apply(this,args);};
 qa.rms=()=>{if(!qa.analyser)return 0;const a=new Float32Array(qa.analyser.fftSize);qa.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);};
 qa.record=()=>{qa.chunks=[];qa.recorder=new MediaRecorder(qa.tap.stream);qa.recorder.ondataavailable=e=>qa.chunks.push(e.data);qa.recorder.start();};
 qa.finish=()=>new Promise(resolve=>{qa.recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(qa.chunks).arrayBuffer())));qa.recorder.stop();});
});

const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5278';
const runs=[];
for(const npc of ['normal','hard']){
 await p.goto(origin+'/duel-lab.html?opening&ranked&playable&npc='+npc+'&at=4400',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('[data-opening-ms="4400"]',{timeout:90000});
 for(const size of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  await p.setViewportSize(size);await p.waitForTimeout(120);
  assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  await p.screenshot({path:out+'/'+npc+'-ranked-'+size.width+'.png'});
 }
 await p.setViewportSize({width:1280,height:720});
 await p.evaluate(async()=>{const {warmOpeningSound}=await import('/src/ui/openingSound.ts');await warmOpeningSound();});
 await p.mouse.click(3,3);await p.evaluate(()=>audioQA.record());
 const before=await p.evaluate(()=>audioQA.starts.length);
 await p.getByRole('button',{name:'▶ 再生',exact:true}).click();
 await p.waitForFunction(()=>Number(document.querySelector('.duel-opening')?.dataset.openingMs)>3450);
 const rms=await p.evaluate(()=>audioQA.rms());assert(rms>.00001);
 await p.screenshot({path:out+'/'+npc+'-friction.png'});
 await p.waitForFunction(()=>!document.querySelector('.duel-opening'),null,{timeout:30000});
 await p.screenshot({path:out+'/'+npc+'-board.png'});
 const cues=(await p.evaluate(n=>audioQA.starts.slice(n),before)).filter(x=>x.url?.includes('opening-mana-v1'));
 assert.deepEqual(cues.map(x=>x.url.split('/').pop()),['b-rise.wav','b-impact.wav','b-toss.wav','a-rejoin.wav','a-friction.wav','h-land.wav','a-exit.wav']);
 cues.forEach((x,i)=>assert(Math.abs(x.ms-[180,1460,1460,1710,1710,3220,5120][i])<150));
 fs.writeFileSync(out+'/'+npc+'-audio.webm',Buffer.from(await p.evaluate(()=>audioQA.finish())));
 const loaded=await p.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('duel-portraits')));
 assert(loaded.some(x=>x.includes((npc==='normal'?'noel':'vera')+'-right.png')));
 assert(!loaded.some(x=>/wind-v[1234]\//.test(x)));
 runs.push({npc,cues,rms,loaded});
}
await p.getByRole('button',{name:'▶ 再生',exact:true}).click();
await p.waitForFunction(()=>Number(document.querySelector('.duel-opening')?.dataset.openingMs)>2400);
await p.evaluate(()=>loreOpeningPreview.cancel());await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>audioQA.active),0);
await p.emulateMedia({reducedMotion:'reduce'});const before=await p.evaluate(()=>audioQA.starts.length);
await p.getByRole('button',{name:'▶ 再生',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.duel-opening'));assert.equal(await p.evaluate(()=>audioQA.starts.length),before);
assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
fs.writeFileSync(out+'/browser-qa.json',JSON.stringify({origin,errors,failed,runs,checks:['production default seven-cue mix incl III-C','normal/hard actual assets','three viewport ratios','full return to real board','abort silence','reduced motion silence']},null,2));
console.log(JSON.stringify({pass:true,errors,failed,runs}));await ctx.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
