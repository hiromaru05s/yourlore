import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-summon-appearance-special',origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5597';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2}),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/fallback|\[playback\]|Shader Error|GL_INVALID/.test(m.text()))errors.push(m.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'),null,{timeout:60000});
 for(const owner of [0,1])for(const kind of (process.env.LORE_QA_SPECIAL_CASES?.split(',')||['CASINO','CASTLE','hatch','fusion','rebirth','ritual','floor'])){
  console.log('start',kind,owner);
  const result=await page.evaluate(async({kind,owner})=>{
   const {DB}=await import('/src/shared/cards.ts'),{reduce}=await import('/src/shared/engine.ts'),{redactFor}=await import('/src/shared/protocol.ts');
   const c=combatTempo.controller;await c.queue;let g=combatTempo.fixture('summon',owner).prev;g.opening=undefined;
   for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],removed:[],enchants:[],quests:[],traps:[],mana:40,maxMana:40,hp:200,maxHp:200,tribesFired:['마족:2','마족:3','마족:4']});
   const mon=(id,uid)=>({...DB[id],uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0});let action={type:'play',idx:0},res;
   if(kind==='hatch'){g.cur=1-owner;g.players[owner].field=[{...mon('BEAST_EGG','egg'),hatch:1,hatchInto:['DIVINE']}];action={type:'endTurn'};}
   else if(kind==='fusion'){g.players[owner].field=[mon('SOLDIER2','mate')];g.players[owner].hand=[{...DB.GM6_0,uid:'dragon'}];}
   else if(kind==='rebirth'){g.players[owner].discard=[{...DB.VOID_APOSTLE,uid:'reborn',cost:4}];g.players[owner].supply=[{...DB.QUICK_REBIRTH,uid:'purchase'}];g=reduce(g,{type:'buySupply',i:0}).state;action={type:'pick',uid:'reborn'};}
   else g.players[owner].hand=[{...DB[kind==='ritual'?'FORBIDDEN':kind==='floor'?'DUNGEON_FLOOR':kind],uid:'source'}];
   if(kind==='ritual')g.players[owner].field=[mon('TDE1','ritual-source')];
   res=reduce(g,action);
   if(kind==='ritual')for(let seed=1;!res.events.some(e=>e.type==='summon')&&seed<100;seed++){g.rng=seed;res=reduce(g,action);}
   if(!res.events.some(e=>e.type==='summon'))throw Error(kind+' did not summon: '+JSON.stringify(res.events));
   c.show(redactFor(g,0));await new Promise(r=>setTimeout(r,250));const families=new Set(),tones=new Set(),bad=[];let running=true;
   const sample=()=>{for(const n of document.querySelectorAll('.casino-summon,.castle-summon,.hatch-summon,.dragon-fusion-summon,[data-rebirth-fx],.forbidden-ritual,.dungeon-floor-overlay'))families.add(n.dataset.rebirthFx?'rebirth':n.className);for(const n of document.querySelectorAll('.summon-face')){const tone=getComputedStyle(n.querySelector('.card-art')).filter;tones.add(n.dataset.summonRest);if((n.dataset.summonRest==='blocked')!==tone.includes('grayscale(1)'))bad.push({kind:n.dataset.summonRest,tone});}if(running)requestAnimationFrame(sample);};sample();
   c.applyResult({state:redactFor(res.state,0),events:res.events});await c.queue;running=false;
   return{kind,owner,families:[...families],tones:[...tones],bad,arrivals:res.events.filter(e=>e.type==='summon').map(e=>e.id),field:c.state.players[owner].field.map(c=>c.id)};
  },{kind,owner});
  assert.deepEqual(result.bad,[]);assert(result.families.length,kind+' did not run its dedicated renderer');assert(result.tones.length,kind+' had no state-aware face');assert(result.field.length,kind+' failed to land');results.push(result);await page.screenshot({path:out+'/'+kind+'-'+owner+'.png'});await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,boundary:'Real reducer and controller in a local actual-board fixture; not authenticated multiplayer.'},null,2));console.log('PASS',result);
 }
 assert.deepEqual(errors,[]);
}finally{await context.close();await browser.close();}
