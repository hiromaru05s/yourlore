import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://lore.test'});
for(const key of ['window','document','localStorage','HTMLElement','HTMLImageElement','CustomEvent']) globalThis[key]=dom.window[key];
const dir=await fs.mkdtemp('/tmp/lore-wording-render-');
try {
 await build({stdin:{contents:`export { DB, STARTERS } from './client/src/shared/cards'; export { cardRulesEl } from './client/src/ui/cardView'; export { CARD_RULE_GROUP_LABELS, effectRuleGroup } from './client/src/shared/cardEffectHeadings'; export { displayPassives } from './client/src/shared/cardPresentation'; export { setLang } from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/render.mjs'});
 const {DB,STARTERS,cardRulesEl,setLang,CARD_RULE_GROUP_LABELS,effectRuleGroup,displayPassives}=await import(dir+'/render.mjs');
 let count=0;
 for(const lang of ['ja','ko','en']) {
  setLang(lang);
  for(const c of [...Object.values(DB),...Object.values(STARTERS)]) {
   const e=cardRulesEl({...c,uid:`test-${c.id}`});
   const raw=lang==='ja'?c.textJa:lang==='en'?c.textEn:c.text;
   const normalize=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').trim();
   const blocks=[...e.querySelectorAll('.card-effect-section')];
   const rendered=blocks.map(block=>block.querySelector('h3').textContent+
    [...block.querySelectorAll('.card-effect-body')].map(p=>p.textContent).join('')+
    [...block.querySelectorAll('.dr')].map(row=>row.querySelector('.dr-roll').textContent+':'+row.querySelector('.dr-fx').textContent).join('')).join('');
   assert.equal(normalize(rendered),normalize(raw==='—'?'':raw.replaceAll(' — ','').replaceAll(' / ','')),`${c.id}/${lang}: all rule text and dice outcomes survive hierarchy`);
   if(raw.includes(' / ')) assert.equal(e.querySelectorAll('.dr').length,raw.split(' / ').length,`${c.id}/${lang}: every dice row`);
   for(const block of blocks) {
    const kind=effectRuleGroup(block.querySelector('h3').textContent);
    assert.equal(block.parentElement.dataset.ruleGroup,kind,`${c.id}/${lang}: condition belongs to its declared parent`);
    if(block.querySelector('.card-dice')) assert(block.contains(block.querySelector('.dr')),`${c.id}/${lang}: dice outcomes stay under their own condition`);
   }
   for(const [kind,labels] of Object.entries(CARD_RULE_GROUP_LABELS)) {
    const groups=e.querySelectorAll(`[data-rule-group="${kind}"]`);
    assert(groups.length<=1,`${c.id}/${lang}: no repeated major headings`);
    for(const group of groups) { assert.equal(group.querySelector(':scope > h2').textContent,labels[lang]); assert(group.children.length>1,'no empty major group'); }
   }
   const hasEffect=blocks.some(b=>effectRuleGroup(b.querySelector('h3').textContent)==='effects')||displayPassives(c).length>0;
   assert.equal(!!e.querySelector('[data-rule-group="effects"]'),hasEffect,`${c.id}/${lang}: Effects exists exactly when an effect or owned keyword exists`);
   for(const chip of e.querySelectorAll('[data-ability-group="owned"]')) assert.equal(chip.closest('[data-rule-group]')?.dataset.ruleGroup,'effects');
   const headings=[...raw.matchAll(/【([^】]+)】/g)].map(m=>m[1]);
   assert.deepEqual([...e.querySelectorAll('.card-effect-section > h3')].map(h=>h.textContent),headings,`${c.id}/${lang}: all authored headings remain separate and in order`);
   for(const key of e.querySelectorAll('.card-key-label')) assert(key.querySelector(':scope > span:last-child')?.textContent.trim(),`${c.id}/${lang}: keyword name visible beside icon`);
   const glossary=e.querySelector('details.card-rule-notes');
   if(glossary){assert(!glossary.open);assert(glossary.querySelector('summary')?.textContent.trim());}
   assert(!e.querySelector('.card-effect-body .passive-icon'),`${c.id}/${lang}: keyword names in sentences remain text`);
   assert(!/シェルフ|셸프|\bshelf\b/i.test(e.textContent));
   count++;
  }
 }
 setLang('ja');
 for(const text of ['旧セーブの見出しなし本文。','【旧条件】旧セーブの本文。']) {
  const legacy=cardRulesEl({...DB.M3,uid:'legacy-text',textJa:text});
  assert(legacy.querySelector('[data-rule-group="effects"]'));
  assert(legacy.textContent.includes(text.replace(/[【】]/g,'')));
 }
 console.log(`PASS: ${count} complete effect renderings; intact text, dice rows, readable keyword names`);
} finally {dom.window.close();await fs.rm(dir,{recursive:true,force:true});}
