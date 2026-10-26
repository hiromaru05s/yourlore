import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import ts from 'typescript';
import {JSDOM} from 'jsdom';

// Exercise the actual screen/filter against the complete current card catalog.
// Only rendering/assets are stubbed so this runs in every guarded release.
const dir=await fs.mkdtemp('/tmp/lore-starter-category-');
const dom=new JSDOM('<body><div id="app"></div></body>',{url:'https://lore.test'});
for(const key of ['window','document','HTMLElement','localStorage'])globalThis[key]=dom.window[key];
try{
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/cardPresentation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/catalog.mjs'});
 const catalog=await import(dir+'/catalog.mjs');
 const {DB,STARTERS,DECK_POOL,sanitizeDeck}=catalog;
 const expected=[...DECK_POOL,'STARTER_MANA'].sort();
 const excluded=Object.values(DB).filter(c=>c.noShop&&!DECK_POOL.includes(c.id));
 assert(excluded.length>0);
 for(const c of excluded)assert(!sanitizeDeck([c.id]).includes(c.id),`${c.id} is not deck eligible`);
 // Future cards must be classified by eligibility, never noShop, cost, or type.
 DB.TEST_GENERATED={id:'TEST_GENERATED',t:'starter',cost:7,noShop:true,name:'Generated fixture',text:''};
 DB.TEST_ELIGIBLE={id:'TEST_ELIGIBLE',t:'spell',cost:0,name:'Eligible fixture',text:''};
 DECK_POOL.push('TEST_ELIGIBLE');
 expected.push('TEST_ELIGIBLE');expected.sort();
 const deps={...catalog,t:k=>k,cardName:c=>c.nameJa||c.name,getLang:()=> 'ja',onLangChange:()=>()=>{},loungeText:ja=>ja,
  bindTouchActivation:()=>()=>{},passiveIcon:()=>'',homeIcon:()=>'',langSelectEl:()=>document.createElement('select'),bindZoom:()=>{},zoomCard:()=>{},
  cardEl:c=>{const el=document.createElement('div');el.className='card';el.dataset.cardId=c.id;return el;},
  revealCards:async(el,nodes)=>el.replaceChildren(...nodes),cancelRevealCards:()=>{}};
 const source=(await fs.readFile('client/src/screens/cards.ts','utf8')).replace(/^import .*;\s*$/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 function mount(){
  const exports={};new Function('exports',...Object.keys(deps),js)(exports,...Object.values(deps));
  const root=document.querySelector('#app');return {root,screen:exports.mountCards({root,home(){},cards(){}})};
 }
 const {root,screen}=mount();
 assert.equal(root.querySelector('#prevPage,#nextPage,#pageLabel'),null,'Catalog has no pagination controls');
 const clickType=key=>[...root.querySelectorAll('#typeRow .chip')].find(b=>b.textContent===`cards.f.${key}`).click();
 const ids=()=>[...root.querySelectorAll('#grid > .card')].map(e=>e.dataset.cardId).sort();
 clickType('starter');assert.deepEqual(ids(),expected,'Starter category equals editable deck pool plus fixed Attune');
 const search=root.querySelector('#search');
 for(const c of excluded){
  search.value=c.nameJa||c.name;search.dispatchEvent(new window.Event('input'));
  assert(!ids().includes(c.id),`${c.id} cannot leak into starters via search`);
 }
 search.value='';search.dispatchEvent(new window.Event('input'));
 clickType('all');assert.deepEqual(ids(),[...Object.keys(DB),...Object.keys(STARTERS)].sort(),'Generated cards remain browsable in All');
 clickType('spell');const spells=ids();
 for(const c of excluded.filter(c=>c.t==='spell'))assert(spells.includes(c.id),`${c.id} remains in its normal type`);
 screen.destroy();
 console.log(`PASS: ${expected.length-1} catalog starters plus a future eligible fixture match deck eligibility; ${excluded.length} non-deck noShop cards excluded; All/type/search and future-card regressions covered`);
 console.log('Excluded:',excluded.map(c=>`${c.id} (${c.nameJa})`).join(', '));
}finally{dom.window.close();await fs.rm(dir,{recursive:true,force:true});}
