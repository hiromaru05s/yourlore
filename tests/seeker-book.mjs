import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-book-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/seekerBook';export {DB,STARTERS,PASSIVES,TRIBES} from './client/src/shared/cards';export {displayPassives} from './client/src/shared/cardPresentation';export {keywordRules} from './client/src/shared/cardKeywordText';export {cardEffectNotes} from './client/src/shared/cardEffectNotes';export {artUrl} from './client/src/ui/cardArt';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/book.mjs',logLevel:'silent'});
 const l=await import(dir+'/book.mjs');const catalogue={...l.DB,...l.STARTERS};
 for(const page of l.BOOK_PAGES){
  assert(catalogue[page.art],page.id+' uses an existing adopted card');
  if(page.id.startsWith('passive-'))assert(l.displayPassives(catalogue[page.art]).includes(page.id.slice(8)),page.id+' illustration is a current example of this passive');
  await access('client/public'+l.artUrl.full(page.art).split('?')[0]);
  for(const lang of ['ja','en','ko'])assert(page.title[lang]?.trim()&&page.body[lang]?.trim(),page.id+' '+lang);
 }
 assert.equal(new Set(l.BOOK_PAGES.map(p=>p.id)).size,l.BOOK_PAGES.length,'saved positions have unique stable ids');
 assert.notEqual(l.bookStorageKey('alice'),l.bookStorageKey('bob'),'account progress is isolated');
 for(const lang of ['ja','en','ko']){
  const entries=l.bookReference(lang),cards=entries.filter(e=>e.kind==='cards');
  assert.deepEqual(cards.map(e=>e.cardId).sort(),Object.keys(catalogue).sort(),'every active and generated card appears exactly once');
  for(const e of cards){const card=catalogue[e.cardId];const effect=lang==='ja'?card.textJa:lang==='en'?card.textEn:card.text;assert(!effect||e.body.includes(effect),`${e.cardId} complete ${lang} effect, no truncation`);for(const note of l.cardEffectNotes(card,lang))assert(e.body.includes(note));for(const key of l.displayPassives(card))for(const row of l.keywordRules(key,lang,card))assert(e.body.some(s=>s.includes(row.text)),`${e.cardId} derived passive ${key}`);}
  assert.equal(entries.filter(e=>e.kind==='passives').length,Object.keys(l.PASSIVES).length);
  assert.equal(entries.filter(e=>e.kind==='tribes').length,Object.keys(l.TRIBES).length);
  assert(!entries.map(e=>e.body.join(' ')).join(' ').includes('5,000'),'retired curriculum payment text is not a reading reward');
 }
 const quick=l.BOOK_PAGES.find(p=>p.id==='quick').body.ja;
 assert(quick.includes('リフトへ置いてから')&&quick.includes('無効にされても'),'Quick resolution order is exact');
 assert(l.BOOK_PAGES.at(-1).chapter==='reference','reference is the final chapter');
 const obsolete=Object.values(catalogue).filter(c=>c.t==='trap');assert.equal(obsolete.length,0,'retired traps are not taught as an active card type');
 console.log(`PASS Seeker book: ${l.BOOK_PAGES.length} pages, ${l.bookReference('ja').length} reference entries, ${Object.keys(catalogue).length} cards; all three locales, full effects/notes/derived passives and adopted art verified`);
}finally{await rm(dir,{recursive:true,force:true});}
