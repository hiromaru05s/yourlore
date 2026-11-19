import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Node','localStorage','navigator','CustomEvent','Event','Image','HTMLImageElement','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame=cb=>setTimeout(cb,0);globalThis.cancelAnimationFrame=clearTimeout;
globalThis.matchMedia=dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const dir=await mkdtemp('/tmp/lore-attune-effects-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';export {setLang} from './client/src/i18n';export {cardEl,cardRulesEl} from './client/src/ui/cardView';export {zoomCard,closeZoom,bindZoom} from './client/src/ui/cardInspection';`},bundle:true,platform:'node',format:'esm',external:['/art/*'],define:{'import.meta.env.DEV':'false'},outfile:dir+'/ui.mjs',logLevel:'silent'});
 const E=await import(dir+'/ui.mjs');let serial=0;
 const card=id=>({...E.DB[id]??E.STARTERS[id],uid:'attune-test-'+serial++});
 for(const side of [0,1]){
  let g=E.createGame({mode:'online',seed:41,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.turn=3;g.cur=side;g.pending=null;
  Object.assign(g.players[side],{hp:50,mana:24,maxMana:24,openingDrawReady:false,hand:[card('ATTUNE_RESEARCH'),card('ATTUNE_SECRET'),card('STARTER_MANA')],enchants:[],field:[]});
  g=E.reduce(g,{type:'play',idx:0}).state;
  const research=g.players[side].attuneBonuses[0];assert.match(research,/^heal[123]$/);
  g=E.reduce(g,{type:'play',idx:0}).state;
  for(const viewer of [0,1]){
   const owner=JSON.parse(JSON.stringify(E.redactFor(g,viewer))).players[side];
   for(const lang of ['ja','ko','en']){
    E.setLang(lang);E.zoomCard(card('STARTER_MANA'),undefined,undefined,undefined,undefined,owner);
    const added=document.querySelector('.attune-added-effects');assert(added);
    assert.deepEqual([...added.querySelectorAll('[data-attune-bonus]')].map(e=>e.dataset.attuneBonus),[research,'mana']);
    assert(added.querySelector(`[data-attune-bonus="${research}"]`).textContent.includes(research.slice(-1)));
    E.closeZoom();
   }
  }
 }
 E.setLang('ja');
 const owner={attuneBonuses:['heal2','heal2','selfHex','heal2','shield','dew','crystal','mana','shine','spirit','hex','heal1','heal3']};
 const basic=card('STARTER_MANA');
 const rules=E.cardRulesEl(basic,undefined,owner);
 assert.equal(rules.querySelector('[data-attune-bonus="heal2"]').textContent,'自分の体力を2回復する。 ×2');
 assert.equal(rules.querySelectorAll('[data-attune-bonus="heal2"]').length,2,'separated triggers retain grant order');
 assert(rules.querySelector('[data-attune-bonus="selfHex"]').textContent.includes('自分の墓地'));
 assert.equal(E.cardEl(basic,{owner}).querySelector('.attune-bonus-badge').textContent,'追加効果 13');
 assert(!E.cardEl(basic).querySelector('.attune-bonus-badge'));
 assert(!E.cardRulesEl(basic).querySelector('.attune-added-effects'),'catalog has no live player context');
 assert(E.cardRulesEl(basic,undefined,{}).textContent.includes('現在、追加効果はありません。'));
 for(const id of ['DUAL_ATTUNE','ATTUNE_SHINE','ATTUNE_RESEARCH','STARTER_CHEST'])assert(!E.cardRulesEl(card(id),undefined,owner).querySelector('.attune-added-effects'));
 const face=E.cardEl(basic);document.body.append(face);E.bindZoom(face,basic,undefined,undefined,undefined,undefined,owner);
 face.dispatchEvent(new dom.window.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
 assert(document.querySelector('#zoomOverlay .attune-added-effects'));E.closeZoom();
 assert.equal(basic.textJa,E.STARTERS.STARTER_MANA.textJa,'printed card remains unchanged');
 console.log('PASS: research and mana grants, both owners/viewers, serialized remote snapshots, three languages, ordered stacks, harmful effects, empty state and catalog isolation');
} finally {await rm(dir,{recursive:true,force:true});dom.window.close();}
