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
const dir=await mkdtemp('/tmp/lore-card-references-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cardReferences';export {DB,STARTERS} from './client/src/shared/cards';export {isGolem,isAssassinCard,isVampFamily,isHexer,isWorldTreeCard,isElfCard} from './client/src/shared/engine';export {cardRulesEl} from './client/src/ui/cardView';export {zoomCard,closeZoom} from './client/src/ui/cardInspection';export {setLang} from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},outfile:dir+'/ui.mjs',logLevel:'silent'});
 const E=await import(dir+'/ui.mjs'),all=Object.values(E.REFERENCE_CARDS),card=id=>({...E.REFERENCE_CARDS[id],uid:id});
 for(const [key,predicate]of [['golem',E.isGolem],['assassin',E.isAssassinCard],['vampire',E.isVampFamily],['hexer',E.isHexer],['worldtree',E.isWorldTreeCard],['elf',E.isElfCard]])assert.deepEqual(E.CARD_SERIES[key].ids,all.filter(predicate).map(c=>c.id));
 assert(!E.CARD_SERIES.mimic.ids.includes('MIMIC_HIDEOUT'));assert(!E.CARD_SERIES.black.ids.includes('BLACK_ELSA'));assert(E.CARD_SERIES.vampire.ids.includes('VAMP_BUTLER'));
 assert.deepEqual(E.CARD_SERIES.knight.ids,['INFKNIGHT']);assert(E.CARD_SERIES.militaryKnight.ids.length>1);
 for(const [id,members]of Object.entries(E.CARD_GENERATES))for(const target of members){assert(E.REFERENCE_CARDS[id]&&E.REFERENCE_CARDS[target],id+' -> '+target);assert(E.cardRelations(target).sources.includes(id));assert(E.cardRelations(id).generated.includes(target));}
 for(const c of all)if(c.hatchInto)assert.deepEqual([...E.CARD_GENERATES[c.id]].sort(),[...c.hatchInto].sort());
 assert(E.cardRelations('CREATION').sources.includes('EMPTY_MIND'));assert(E.cardRelations('DOMINION').sources.includes('Q_TOWN'));
 assert(!E.cardRelations('CASTLE').sources.includes('Q_TOWN'));assert(!E.cardRelations('FIRE_BALL').sources.includes('FIRE_MASTER'),'retrieval is not creation');
 let rendered=0;
 for(const lang of ['ja','ko','en']){
  E.setLang(lang);
  for(const c of all){
   const text=c[{ja:'textJa',ko:'text',en:'textEn'}[lang]],parts=E.effectReferenceParts(text,lang,c.id);
   assert.equal(parts.map(p=>p.text).join(''),text,'reference markup preserves original wording');
   const jaRefs=E.effectReferenceParts(c.textJa,'ja',c.id).filter(p=>p.reference).map(p=>p.reference.kind+':'+p.reference.id);
   const localized=new Set(parts.filter(p=>p.reference).map(p=>p.reference.kind+':'+p.reference.id));
   for(const ref of jaRefs)assert(localized.has(ref),c.id+'/'+lang+': '+ref);
   const expected=[...E.cardRulesEl({...c,uid:c.id}).querySelectorAll('.card-effect-body,.dr-fx')].map(n=>n.textContent);
   E.zoomCard({...c,uid:c.id});
   assert.deepEqual([...document.querySelectorAll('#zoomOverlay .card-effect-body,#zoomOverlay .dr-fx')].map(n=>n.textContent),expected);
   for(const link of document.querySelectorAll('.card-reference-link'))assert(link.textContent&&link.getAttribute('aria-haspopup')==='dialog');
   E.closeZoom();rendered++;
  }
  E.zoomCard(card('CREATION'));assert(document.querySelector('[data-relation=sources] [data-card-id=EMPTY_MIND]'));E.closeZoom();
  E.zoomCard(card('DOMINION'));assert(document.querySelector('[data-relation=sources] [data-card-id=Q_TOWN]'));E.closeZoom();
 }
 E.setLang('ja');E.zoomCard(card('MIMIC_KING'));
 const family=document.querySelector('.card-reference-link[data-reference-id=mimic]');family.dispatchEvent(new dom.window.Event('pointerenter'));await new Promise(resolve=>setTimeout(resolve,100));
 assert.equal(document.querySelectorAll('.card-reference-preview .reference-member').length,E.CARD_SERIES.mimic.ids.length);
 assert(document.querySelector('.card-reference-preview [data-card-id=MIMIC2]'));
 document.querySelector('#zoomOverlay').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!document.querySelector('.card-reference-preview'));assert(document.querySelector('#zoomOverlay'));
 const link=document.querySelector('.card-reference-link[data-reference-id=MIMIC2]');link.focus();
 const original=document.querySelector('#zoomOverlay'),details=original.querySelector('.zoom-details');details.scrollTop=150;link.click();
 assert.equal(document.querySelector('#zoomOverlay').dataset.cardId,'MIMIC2');assert(!document.querySelector('.card-reference-preview'));
 document.querySelector('.inspect-back').click();assert.equal(document.querySelector('#zoomOverlay'),original);assert.equal(details.scrollTop,150);assert.equal(document.activeElement,link);
 E.closeZoom();assert(!document.querySelector('.card-reference-preview'));
 assert(!E.effectReferenceParts(E.DB.SPEAR_AND_SHIELD.textJa,'ja','SPEAR_AND_SHIELD').some(p=>p.reference?.id==='QUICK_ASSAULT'),'total attack is not All-Out Assault');
 console.log(`PASS ${rendered} unchanged effect renderings; all localized reference coverage; engine family parity; bidirectional creation edges; hover, Escape, history and focus`);
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
