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
const dir=await mkdtemp('/tmp/lore-effect-ux-');
try {
 await build({stdin:{contents:`export {DB,STARTERS,PASSIVES} from './client/src/shared/cards';export * from './client/src/shared/cardPresentation';export * from './client/src/shared/cardEffectNotes';export * from './client/src/shared/cardRuleMetadata';export {cardEl,cardRulesEl} from './client/src/ui/cardView';export {cardStateEl} from './client/src/ui/cardState';export {zoomCard,closeZoom} from './client/src/ui/anim';export {setLang} from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},outfile:dir+'/ui.mjs',logLevel:'silent'});
 const E=await import(dir+'/ui.mjs'),all=[...Object.values(E.DB),...Object.values(E.STARTERS)];
 const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:id});
 const mon=(id,extra={})=>({...card(id),summonedTurn:1,tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,...extra});
 let rendered=0;
 for(const lang of ['ja','ko','en']) {
  E.setLang(lang);
  const nameKey={ja:'nameJa',ko:'name',en:'nameEn'}[lang];
  assert.equal(new Set(all.map(c=>c[nameKey])).size,all.length,`${lang}: all names distinguish different cards`);
  for(const c of all) {
   E.zoomCard({...c,uid:c.id});
   assert.equal(document.querySelector('.inspect-type').textContent,E.cardTypeLabel(c,lang));
   for(const key of new Set([...E.displayPassives(c),...E.referencedPassives(c)])) {
    const chip=document.querySelector(`button.card-key-label[data-psv="${key}"]`),target=document.querySelector(`.psv-item[data-psv="${key}"]`);
    assert(chip && target,`${c.id}/${lang}/${key}: readable term and linked definition`);
    assert.equal(chip.getAttribute('aria-controls'),target.id);
   }
   assert(E.cardSearchText(c).includes(c[{ja:'textJa',ko:'text',en:'textEn'}[lang]].normalize('NFKC').toLocaleLowerCase()),`${c.id}/${lang}: full effect searchable`);
   const notes=['ja','ko','en'].map(l=>E.cardEffectNotes(c,l).length);assert.equal(new Set(notes).size,1,`${c.id}: same glossary in all locales`);
   for(const [k,p] of Object.entries(E.PASSIVES)) if(c.textJa.includes(p.ja.name))assert(E.referencedPassives(c).includes(k),`${c.id}: new keyword reference needs metadata`);
   for(const [pattern,term] of [['持続','lasting'],['デッキ構成','composition'],['リフト','rift'],['カウンター','counters'],['墓地','graveyard']])if(c.textJa.includes(pattern))assert(E.CARD_RULE_METADATA[c.id]?.terms?.includes(term),`${c.id}: missing ${term}`);
   E.closeZoom();rendered++;
  }
  const received=mon('M4',{decayCnt:2});
  const face=E.cardEl(received,{fullArt:true});assert(face.querySelector('[data-status="decay"]'));assert(!face.querySelector('.passive-icon[data-psv="decay"]'));
  const source=E.cardEl(mon('RUST_SHROOM',{decayCnt:2}),{fullArt:true});assert(source.querySelector('.passive-icon[data-psv="decay"]'));assert(source.querySelector('[data-status="decay"]'));
  E.zoomCard(mon('M4',{passivesG:['evade'],decayCnt:2}),{now:1,max:2});
  assert(document.querySelector('button[data-psv="evade"]'));assert(document.querySelector('.inspect-current-state').textContent.includes('2/3'));
  assert(document.querySelector('.inspect-current-state').textContent.includes('1 / 2'));
  const wrap=document.querySelector('.zoom-wrap'),details=document.querySelector('.zoom-details');wrap.scrollTop=140;details.scrollTop=45;
  const chip=document.querySelector('button[data-psv="evade"]');chip.click();assert.equal(document.activeElement.dataset.psv,'evade');
  assert.equal(document.querySelector('.inspect-return-rules').hidden,false);document.querySelector('.inspect-return-rules').click();
  assert.equal(wrap.scrollTop,140);assert.equal(details.scrollTop,45);assert.equal(document.activeElement,chip);
  E.closeZoom();
  E.zoomCard(mon('CASTLE',{gcount:5,guts:0,passivesG:['guts']}));assert(document.querySelector('.inspect-current-state').textContent.includes('5'));assert(document.querySelector('.inspect-current-state dd').textContent);
  E.closeZoom();assert.equal(E.cardStateEl(card('CASTLE')),null,'catalog does not invent live counter values');
  assert(!E.passiveSearchKeys(E.DB.ND5,'owned').includes('aura'));assert(E.passiveSearchKeys(E.DB.ND5,'granted').includes('aura'));
  assert(E.passiveSearchKeys(E.DB.DARK_ELF,'mentioned').includes('evade'));
  assert(!E.displayPassives(E.DB.MAJESTY_RITE).includes('majesty'),'grant spell does not own monster ability');
  const quick=E.cardEl(card('QUICK_POISON'));assert.equal(quick.querySelector('.kw').title,E.quickSpellRule(lang));
  assert(!E.questProgressText(2,4,lang).includes('クエスト') || lang==='ja');
 }
 E.setLang('ja');
 const immune=mon('M4',{immuneDamageTurn:4});
 assert(E.cardStateEl(immune,{now:2,max:2,turn:4}).textContent.includes('ダメージ無効'));
 assert(!E.cardStateEl(immune,{now:2,max:2,turn:5}).textContent.includes('ダメージ無効'),'expired prevention must not look active');
 const opener=document.querySelector('#opener');opener.focus();E.zoomCard(card('GM6_0'));
 const root=document.querySelector('#zoomOverlay'),details=root.querySelector('.zoom-details');details.scrollTop=222;
 const related=root.querySelector('.zoom-related [data-card-id="DRAGON_RIDER"]');related.focus();related.click();
 assert.equal(document.querySelector('h1').textContent,E.DB.DRAGON_RIDER.nameJa);assert(document.querySelector('.inspect-back'));
 document.querySelector('.inspect-back').click();assert.equal(document.querySelector('#zoomOverlay'),root);assert.equal(details.scrollTop,222);assert.equal(document.activeElement,related);
 related.click();document.querySelector('#zoomOverlay').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.querySelector('#zoomOverlay'),root);
 E.closeZoom();assert.equal(document.activeElement,opener);assert(!document.querySelector('#zoomOverlay'));
 assert(E.cardSearchText(E.DB.VITAL2).includes('restore'));
 assert(!E.CARD_RULE_METADATA.CAVALRY.terms?.includes('counters'));
 assert(E.CARD_RULE_METADATA.AEM.terms.includes('lasting'));
 console.log(`PASS ${rendered} real card inspections: unique names, glossary parity, referenced and granted abilities, applied Decay, counters, search, type labels, return to effect, related history, Escape and focus restoration`);
} finally {await rm(dir,{recursive:true,force:true});dom.window.close();}
