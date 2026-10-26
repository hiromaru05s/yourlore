import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="meRow"><div class="zone-mon"></div></div><div id="oppRow"><div class="zone-mon"></div></div></div>',{pretendToBeVisual:true,url:'http://localhost'});
for(const k of ['window','document','HTMLElement','Element','Node','navigator','localStorage','Image'])Object.defineProperty(globalThis,k,{configurable:true,value:dom.window[k]});
let now=0,reduced=false,nextFrame=0;const frames=new Map();
globalThis.performance={now:()=>now};globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=cb=>{frames.set(++nextFrame,cb);return nextFrame;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
function step(ms){now+=ms;const queue=[...frames];frames.clear();queue.forEach(([,cb])=>cb(now));}
const dir=await mkdtemp(path.join(tmpdir(),'lore-card-counters-'));
try{
 await build({stdin:{contents:"export * from './client/src/ui/cardCounter';export {cardEl} from './client/src/ui/cardView';export {DB} from './client/src/shared/cards';export {setLang} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},outfile:dir+'/counters.mjs'});
 const {createBoardCardCounters,createCardCounter,setCardCounter,cardEl,DB,setLang,fieldCounters,enchantCounterValue}=await import(dir+'/counters.mjs');setLang('ja');
 assert.equal(enchantCounterValue({card:DB.GUILD_CO,turns:99}),0,'new Guild shows zero before its first upkeep');
 assert.equal(enchantCounterValue({card:DB.BREWING,turns:6}),0,'new Brewing shows zero before its first ingredients');
 assert.equal(enchantCounterValue({card:DB.BLOOD_RITE,turns:99}),null,'time-only spell has no resource counter');
 const root=document.getElementById('root'),zone=root.querySelector('#meRow .zone-mon'),controller=createBoardCardCounters(root);
 let data={...DB.GOLEM1,uid:'same-mon',guts:3};
 const badge=kind=>zone.querySelector(`[data-counter-kind="${kind}"]`),pos=kind=>Number(badge(kind).dataset.counterPosition);
 const render=()=>{zone.replaceChildren(cardEl(data,{field:true}));controller.sync();};
 render();assert.equal(pos('guts'),3,'initial state snaps to authoritative count');
 data={...data,guts:7};render();assert.equal(pos('guts'),3);
 const visited=new Set([3]);for(let i=0;i<20;i++){step(26);zone.querySelectorAll('[data-counter-kind="guts"] text').forEach(t=>visited.add(Number(t.textContent)));}
 assert.deepEqual([...visited].sort((a,b)=>a-b),[3,4,5,6,7],'+4 traverses four slots without skipping a count');assert.equal(pos('guts'),7);assert.equal(badge('guts').querySelectorAll('text').length,1);
 data={...data,guts:3};render();step(130);const moving=pos('guts');assert(moving<7&&moving>3);render();assert.equal(pos('guts'),moving,'DOM rebuild keeps the current reel position');step(390);assert.equal(pos('guts'),3,'same target keeps original deadline');
 data={...data,guts:7};render();step(200);const interrupted=pos('guts');data={...data,guts:0};render();assert.equal(pos('guts'),interrupted);step(520);assert.equal(pos('guts'),0,'reverse settles at latest authoritative target');
 data={...data,decayCnt:1};render();assert.equal(pos('decay'),0,'newly granted decay starts at zero on an existing card');step(520);assert.equal(pos('decay'),1);assert.equal(zone.querySelectorAll('.card-counter').length,2);
 data={...data,decayCnt:0};render();assert.equal(badge('decay').dataset.counterValue,'0');step(520);assert(!badge('decay'),'cleared status rolls to zero and then releases its badge');
 reduced=true;data={...data,guts:8};render();assert.equal(pos('guts'),8);reduced=false;
 data={...data,guts:4};render();step(100);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(pos('guts'),4);Object.defineProperty(document,'hidden',{configurable:true,value:false});
 for(const id of ['DRAGON_EGG','BEAST_EGG']){const egg=cardEl({...DB[id],uid:id,hatch:4,dur:2},{field:true});assert.equal(egg.querySelector('[data-counter-kind="hatch"]').dataset.counterValue,'4');assert.equal(egg.querySelector('.ad-def--durability .seal-value').textContent,'2');assert(!egg.querySelector('.ad-atk'));assert(!egg.querySelector('.ec-h,.ec-d'));}
 for(const id of ['DRAGON_EGG','BEAST_EGG']){
  for(const data of [{...DB[id],uid:id},{...DB[id],uid:id,hatch:3,dur:2}]){
   for(const opt of [{size:'mkt'},{size:'hand'},{fullArt:true}]){const card=cardEl(data,opt);assert.equal(card.querySelectorAll('.card-counter').length,0,'egg counter appears only on the field');assert.equal(card.querySelectorAll('.ad-def--durability').length,0,'durability counter is field-only too');}
   assert.deepEqual(fieldCounters(data,false),[]);
  }
 }
 assert.deepEqual(fieldCounters({...DB.CASTLE,uid:'non-field',gcount:8,guts:2,decayCnt:1},false),[],'off-field cards do not carry live counters');
 assert(!fieldCounters({...DB.M4,uid:'silenced',guts:0,passive:[],passivesG:[]},true).some(c=>c.kind==='guts'),'silenced cards do not acquire a false zero Guts resource');
 assert.deepEqual(fieldCounters({...DB.CASTLE,uid:'castle',gcount:6},true),[{kind:'charge',value:6}]);assert(fieldCounters({...DB.GUILD_HALL,uid:'guild'},true).some(c=>c.kind==='charge'&&c.value===0));
 for(const lang of ['ja','en','ko']){setLang(lang);assert(createCardCounter('private-uid','private-card','decay',2).getAttribute('aria-label').includes('2/3'));}
 setLang('ja');const secret=createCardCounter('DO-NOT-SERIALIZE','HIDDEN-CARD','charge',4);assert(!secret.outerHTML.includes('DO-NOT-SERIALIZE'));assert(!secret.outerHTML.includes('HIDDEN-CARD'));
 zone.append(secret);setCardCounter(secret,8);step(100);setCardCounter(secret,2);step(520);assert.equal(secret.dataset.counterPosition,'2');
 const prior=pos('guts');data={...DB.M4,uid:'same-mon',guts:1};render();assert.equal(pos('guts'),1);assert.notEqual(prior,1,'changed card identity does not borrow old counters');
 controller.dispose();step(1000);assert.equal(frames.size,0);dom.window.close();
 console.log('PASS card counters: +4 four slots; reversal; DOM rebuild and deadline; grant/clear; reduced/hidden; eggs; zero; public metadata; locale; identity; disposal');
}finally{await rm(dir,{recursive:true,force:true});}
