import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><div id="app"></div></body>',{url:'http://localhost',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});
const make=id=>({id,name:id,t:'spell',cost:1}),DB={A:make('A'),B:make('B')},STARTERS={STARTER_MANA:make('STARTER_MANA')};
const fresh=()=>({sel:0,list:Array.from({length:5},()=>({cards:['A','A','A','A','B','B','B','B'],watch:[]}))});
const store=fresh(),zooms=[],saves=[];let rejectSave=false;
const deps={DB,STARTERS,DECK_POOL:['A','B'],BUYABLE_POOL:['A','B'],DECK_SIZE:8,DECK_MAX_COPIES:8,DECK_SLOTS:5,WATCH_MAX:8,
 deckStoreForUser:()=>store,sanitizeDeckName:s=>s.trim(),t:k=>k,cardName:c=>c.name,esc:s=>s,onLangChange:()=>()=>{},loungeText:ja=>ja,homeIcon:()=>'',
 cardEl:c=>{const el=document.createElement('div');el.className='card';el.dataset.card=c.id;return el;},bindZoom:()=>{},zoomCard:c=>zooms.push(c.id),
 revealCards:async(el,nodes)=>el.replaceChildren(...nodes),renderDeckAppearance:()=>{},isLocalDevAccount:()=>false,loadLocalGuestProfile:()=>({}),confirmDialog:async()=>true,
 api:{profile:()=>new Promise(()=>{}),saveDecks:async payload=>{saves.push(structuredClone(payload));if(rejectSave)throw Error('save failed');return {decks:structuredClone(payload),deck:payload.list[payload.sel].cards.join(',')};}}};
const source=(await fs.readFile(new URL('../client/src/screens/deck.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function('exports',...Object.keys(deps),js)(exports,...Object.values(deps));
const root=document.querySelector('#app'),screen=exports.mountDeck({root,user:{},home(){},shop(){},deck(){}});
const click=s=>root.querySelector(s).click(),hand=()=>root.querySelector('#deckCur');
assert.equal(hand().children.length,9);assert.equal(hand().firstElementChild.querySelector('.card').dataset.card,'STARTER_MANA');
click('#deckCur .is-fixed .card');assert.deepEqual(zooms,['STARTER_MANA']);assert.equal(store.list[0].cards.length,8);
click('#deckPool [data-card="B"]');assert(hand().classList.contains('is-replacing'));click('#deckCur .is-fixed .card');assert(hand().classList.contains('is-replacing'),'Attune cannot be replaced');
click('#deckCur .deck-entry:nth-child(2) .card');assert.equal(store.list[0].cards[0],'B');assert.equal(store.list[0].cards.length,8);
click('#deckUndo');assert.equal(store.list[0].cards[0],'A');click('#deckCur .deck-entry:nth-child(2) .card');assert.equal(store.list[0].cards.length,7);assert(root.querySelector('#save').disabled);
click('#deckPool [data-card="B"]');assert.equal(store.list[0].cards.length,8);assert(!root.querySelector('#save').disabled);
click('#deckPool [data-card="A"]');click('#deckTabs .deck-tab:nth-child(2)');assert(!hand().classList.contains('is-replacing'),'Switching decks clears replacement');assert(root.querySelector('#deckUndo').disabled,'Undo must not cross deck slots');
click('#deckCur .deck-entry:nth-child(2) .card');click('#deckTabs .deck-tab:first-child');assert(root.querySelector('#save').disabled,'Every slot must be valid before saving');click('#deckTabs .deck-tab:nth-child(2)');click('#deckUndo');
// Undo is intentionally cleared on slot change; repair the slot by adding a card.
click('#deckPool [data-card="A"]');assert.equal(store.list[1].cards.length,8);
click('#useBtn');await Promise.resolve();await Promise.resolve();assert.equal(saves.at(-1).sel,1);assert.equal(store.sel,1);assert(!root.querySelector('#save').disabled);
click('#deckCur .deck-entry:nth-child(2) .card');click('#deckPool [data-card="B"]');rejectSave=true;click('#save');await Promise.resolve();await Promise.resolve();assert.equal(root.querySelector('#deckMsg').textContent,'save failed');assert(!root.querySelector('#save').disabled);assert.equal(store.list[1].cards.length,8);
screen.destroy();assert.equal(root.children.length,0);
console.log('PASS: fixed Attune, full-deck replacement, removal/addition, scoped undo, all-slot validation, active deck persistence, failed save recovery');
