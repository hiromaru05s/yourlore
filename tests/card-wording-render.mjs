import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://lore.test'});
for(const key of ['window','document','localStorage','HTMLElement','HTMLImageElement','CustomEvent']) globalThis[key]=dom.window[key];
const dir=await fs.mkdtemp('/tmp/lore-wording-render-');
try {
 await build({stdin:{contents:`export { DB, STARTERS } from './client/src/shared/cards'; export { cardRulesEl } from './client/src/ui/cardView'; export { setLang } from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/render.mjs'});
 const {DB,STARTERS,cardRulesEl,setLang}=await import(dir+'/render.mjs');
 let count=0;
 for(const lang of ['ja','ko','en']) {
  setLang(lang);
  for(const c of [...Object.values(DB),...Object.values(STARTERS)]) {
   const e=cardRulesEl({...c,uid:`test-${c.id}`});
   const raw=lang==='ja'?c.textJa:lang==='en'?c.textEn:c.text;
   const body=e.querySelector('.card-eff-txt');
   const normalize=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').trim();
   if(body) assert.equal(normalize(body.textContent),normalize(raw.replaceAll(' · ','\n')),`${c.id}/${lang}: entire authored effect survives rendering`);
   if(raw.includes(' / ')) {
    assert.equal(e.querySelectorAll('.dr').length,raw.split(' / ').length,`${c.id}/${lang}: every dice row`);
    for(const row of e.querySelectorAll('.dr')) assert(row.querySelector('.dr-fx')?.textContent.trim());
    const tableText=(e.querySelector('.card-dice-head')?.textContent??'')+[...e.querySelectorAll('.dr')].map(row=>row.querySelector('.dr-roll').textContent+':'+row.querySelector('.dr-fx').textContent).join('');
    assert.equal(normalize(tableText),normalize(raw.replace(' — ','').replaceAll(' / ','')),`${c.id}/${lang}: every dice heading and outcome survives rendering`);
   }
   const headings=[...raw.matchAll(/【([^】]+)】/g)].map(m=>m[1]);
   assert.deepEqual([...e.querySelectorAll('.card-effect-section > h3')].map(h=>h.textContent),headings,`${c.id}/${lang}: all authored headings remain separate and in order`);
   for(const key of e.querySelectorAll('.card-key-label')) assert(key.querySelector(':scope > span:last-child')?.textContent.trim(),`${c.id}/${lang}: keyword name visible beside icon`);
   const glossary=e.querySelector('details.card-rule-notes');
   if(glossary){assert(!glossary.open);assert(glossary.querySelector('summary')?.textContent.trim());}
   assert(!e.querySelector('.card-eff-txt .passive-icon'),`${c.id}/${lang}: keyword names in sentences remain text`);
   assert(!/シェルフ|셸프|\bshelf\b/i.test(e.textContent));
   count++;
  }
 }
 console.log(`PASS: ${count} complete effect renderings; intact text, dice rows, readable keyword names`);
} finally {dom.window.close();await fs.rm(dir,{recursive:true,force:true});}
