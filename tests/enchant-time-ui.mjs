import assert from 'node:assert/strict';
import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="meRow"><div class="zone-st"></div></div><div id="oppRow"><div class="zone-st"></div></div></div>',{pretendToBeVisual:true,url:'http://localhost'});
for(const k of ['window','document','HTMLElement','Element','Node','navigator','localStorage','Image'])Object.defineProperty(globalThis,k,{configurable:true,value:dom.window[k]});
let now=0,reduced=false,seq=0;const frames=new Map();globalThis.performance={now:()=>now};globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=cb=>{frames.set(++seq,cb);return seq;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
function step(ms){now+=ms;const q=[...frames.values()];frames.clear();q.forEach(cb=>cb(now));}
const dir=await mkdtemp(path.join(tmpdir(),'lore-enchant-time-'));
try{
 await build({stdin:{contents:"export * from './client/src/ui/enchantTime';export {DB} from './client/src/shared/cards';export {setLang} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},outfile:dir+'/time.mjs'});
 const {enchantTimeState:state,enchantTimeDescription:describe,createEnchantTime:create,createBoardEnchantTimes:board,DB,setLang}=await import(dir+'/time.mjs');setLang('ja');
 const owner={tribesFired:[]},g={turn:8},e=(id,turns=3,bornTurn=1)=>({card:{...DB[id],uid:id},turns,bornTurn}),s=(id,turns=3)=>state(e(id,turns),g,owner);
 assert.deepEqual([s('BLOOD_RITE').remaining,s('BLOOD_RITE').mode,s('BLOOD_RITE').fill],[3,'drain',.3]);
 assert.deepEqual([s('ANCIENT_CIV').remaining,s('ANCIENT_CIV').mode,s('ANCIENT_CIV').fill],[2,'fill',7/9]);assert.equal(s('ANCIENT_CIV').timing,'delayed-own');
 for(const id of ['BREWING','FARM','NIGHT_CASTLE_GIFT']){assert.equal(s(id).mode,'fill');assert.equal(s(id).timing,'own-start');}
 assert.equal(s('BREWING').fill,.5);assert.equal(s('BREWING').remaining,3);assert.equal(state(e('BREWING'),{turn:90},owner).remaining,3,'owner upkeeps do not come from global turn');
 assert.equal(s('E2').timing,'both-start');assert.equal(s('MANA_BACKFLOW').timing,'own-start');assert.equal(s('GUILD_CO'),null);assert.equal(s('TRIBE_PACT').remaining,37);assert.equal(state(e('TRIBE_PACT'),g,{tribesFired:['x']}),null);
 const mature=state(e('ANCIENT_CIV'),{turn:40},owner);assert.equal(mature.remaining,0);assert.equal(mature.fill,1);const full=create(mature);assert.equal(full.querySelector('text').textContent,'0');assert.equal(full.querySelector('.enchant-time-level').getAttribute('height'),'46');assert.equal(full.querySelector('.enchant-time-level').getAttribute('y'),'8');assert.equal(full.querySelectorAll('text').length,1);assert.equal(full.querySelectorAll('path').length,1,'only the liquid surface, without an icon');assert(!/[✦∞⏳]/.test(full.textContent));
 for(const lang of ['ja','en','ko']){setLang(lang);assert(describe(s('BREWING')).includes('3'));assert(describe(s('MANA_BACKFLOW')).length>10);}setLang('ja');
 const root=document.getElementById('root'),zone=root.querySelector('#meRow .zone-st'),controller=board(root);let data=s('BREWING',4);
 const render=()=>{const host=document.createElement('div');host.className='buff-icon';host.dataset.uid='same';host.dataset.cardId='BREWING';host.append(create(data));zone.replaceChildren(host);controller.sync();};
 const pos=()=>Number(zone.querySelector('.enchant-time').dataset.timePosition);
 render();const start=pos();data=s('BREWING',3);render();assert.equal(pos(),start);step(260);const halfway=pos();assert(halfway>start&&halfway<.5);render();assert.equal(pos(),halfway);step(260);assert.equal(pos(),.5,'rerender preserves original animation deadline');
 data=s('BREWING',1);render();step(100);const before=pos();data=s('BREWING',5);render();assert.equal(pos(),before,'reversal starts at current fill');step(520);assert.equal(pos(),1/6);
 reduced=true;data=s('BREWING',0);render();assert.equal(pos(),1);reduced=false;data=s('BREWING',3);render();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(pos(),.5);assert.equal(frames.size,0);Object.defineProperty(document,'hidden',{configurable:true,value:false});
 data=s('BREWING',0);render();controller.dispose();assert.equal(frames.size,0);zone.replaceChildren();controller.sync();assert.equal(zone.children.length,0);
 console.log('PASS enchant time: authoritative clocks, delay/expiry, deadline, zero/full without glyphs, fill continuity/reversal, rerender, reduced/hidden, disposal');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
