import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
const dom=new JSDOM('<body><button id="opener">Inspect</button></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Element','Node','localStorage','navigator','CustomEvent','Event','Image','HTMLImageElement','MutationObserver'])Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame=cb=>setTimeout(cb,0);globalThis.cancelAnimationFrame=clearTimeout;
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
dom.window.matchMedia=globalThis.matchMedia;
dom.window.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};

const dir=await mkdtemp('/tmp/lore-card-glossary-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cardRuleGlossary';export * from './client/src/shared/cardReferences';export {DB,STARTERS,PASSIVES} from './client/src/shared/cards';export {zoomCard,closeZoom} from './client/src/ui/cardInspection';export {setLang} from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},outfile:dir+'/ui.mjs',logLevel:'silent'});
 const E=await import(dir+'/ui.mjs');let texts=0,tooltips=0;
 for(const c of Object.values(E.REFERENCE_CARDS)){
  const coverage=[];
  for(const lang of ['ja','ko','en']){
   const text=c[{ja:'textJa',ko:'text',en:'textEn'}[lang]],parts=E.ruleTermParts(text,lang);
   assert.equal(parts.map(p=>p.text).join(''),text,c.id+' '+lang+' full text');
   assert(!/（持続[）、]|\(lasting[),]|\(지속[),]/.test(text),c.id+' bare duration');
   const hits=[...new Set(parts.flatMap(p=>p.term?[p.term]:[]))].sort();coverage.push(hits);texts++;
  }
  assert.deepEqual(coverage[0],coverage[1],c.id+' ja/ko concept coverage');assert.deepEqual(coverage[0],coverage[2],c.id+' ja/en concept coverage');
 }
 assert.deepEqual(E.ruleTermParts('Counter counter counters counterattack','en').filter(p=>p.term).map(p=>p.term),['passive:counter','counters','counters','passive:counter']);
 assert(!E.ruleTermParts('이 몬스터가 필드를 떠나도 지속','ko').some(p=>p.term==='lasting'),'ongoing game effect is not monster duration');
 for(const id of ['GOBLIN_LEADER','GOBLIN_KING'])for(const member of E.CARD_SERIES.goblin.ids)if(member!==id)assert(E.cardRelations(id).references.includes(member),id+' '+member);
 assert.deepEqual(E.CARD_SERIES.eggs.ids.sort(),['BEAST_EGG','DRAGON_EGG','TGE1']);
 for(const id of ['INCUBATOR','INCUBATOR_S','EGG_MASTER','EGG_HUNTER'])for(const egg of E.CARD_SERIES.eggs.ids){assert(E.cardRelations(id).references.includes(egg));assert(E.cardRelations(egg).referencedBy.includes(id));}
 for(const lang of ['ja','ko','en']){
  E.setLang(lang);
  for(const e of E.CARD_RULE_GLOSSARY){assert(e.names[lang]);assert(E.glossaryParagraphs(e.id,lang).every(r=>r.text.length>20),e.id+lang);}
  for(const [id,term]of [['DUNGEON','passive:guts'],['DUNGEON','passive:evade'],['PURGE_TOUCH','brand'],['HIGH_ELF','dew'],['FURNACE','shield'],['M6','lasting'],['TPO2','passive:counter'],['TPO5','passive:aura']]){
   E.zoomCard({...E.REFERENCE_CARDS[id],uid:id});const overlay=document.querySelector('.zoom-overlay');
   const before=[...overlay.querySelectorAll('.card-effect-body')].map(x=>x.textContent);const button=overlay.querySelector('.card-rule-term[data-rule-term="'+term+'"]');assert(button,id+lang+term);
   button.dispatchEvent(new dom.window.Event('pointerenter'));let popup=overlay.querySelector('.card-rule-tooltip');assert(popup);assert.equal(popup.dataset.ruleTerm,term);assert.equal(button.getAttribute('aria-expanded'),'true');assert(E.glossaryParagraphs(term,lang).every(row=>popup.textContent.includes(row.text)));
   overlay.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!overlay.querySelector('.card-rule-tooltip'));assert(document.body.contains(overlay));assert.equal(document.activeElement,button);
   button.click();assert(overlay.querySelector('.card-rule-tooltip'),'tap opens');assert.equal(overlay.querySelectorAll('button button').length,0);
   assert.deepEqual([...overlay.querySelectorAll('.card-effect-body')].map(x=>x.textContent),before);E.closeZoom();assert(!document.querySelector('.zoom-overlay'));tooltips++;
  }
  E.zoomCard({...E.REFERENCE_CARDS.QUICK_WORLD,uid:'quick'});const typeTerm=document.querySelector('.inspect-type .card-rule-term[data-rule-term=quick]');assert(typeTerm);typeTerm.focus();assert(document.querySelector('.card-rule-tooltip'));E.closeZoom();
  E.zoomCard({...E.REFERENCE_CARDS.DUNGEON,uid:'dungeon'});const chip=document.querySelector('.card-key-label[data-psv="guts"]');assert(chip);chip.focus();assert(document.querySelector('.card-rule-tooltip'));E.closeZoom();
 }
 console.log(`PASS ${texts} full texts and three-language concept parity, ${E.CARD_RULE_GLOSSARY.length} definitions, ${tooltips} hover/tap/focus/Escape cases, 3 Egg relations and reverse links`);
} finally {await rm(dir,{recursive:true,force:true});}
