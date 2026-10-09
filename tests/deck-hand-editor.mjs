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
assert.equal(root.querySelectorAll('.deck-hand-detail,.deck-pool-detail').length,0);
const unchanged=JSON.stringify(store);
click('#deckPool [data-card="B"]');click('#deckCur .deck-entry:nth-child(2) .card');
assert.deepEqual(zooms.slice(-2),['B','A']);assert.equal(JSON.stringify(store),unchanged,'Card faces only enlarge');
for(const key of ['Enter',' '])root.querySelector('#deckPool [data-card="A"]').dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
assert.deepEqual(zooms.slice(-2),['A','A']);assert.equal(JSON.stringify(store),unchanged,'Keyboard enlargement never edits');

const zoomCount=zooms.length;click('#deckPool [data-card="B"] + .deck-card-action');assert.equal(zooms.length,zoomCount,'Plus must not open zoom');assert(hand().classList.contains('is-replacing'));click('#deckCur .deck-entry:nth-child(2) .card');assert(hand().classList.contains('is-replacing'),'Zoom preserves replacement choice');click('#deckCur .is-fixed .card');assert(hand().classList.contains('is-replacing'),'Attune cannot be replaced');
click('#deckCur .deck-entry:nth-child(2) .deck-hand-action');assert.equal(store.list[0].cards[0],'B');assert.equal(store.list[0].cards.length,8);
click('#deckUndo');assert.equal(store.list[0].cards[0],'A');click('#deckCur .deck-entry:nth-child(2) .deck-hand-action');assert.equal(store.list[0].cards.length,7);assert(root.querySelector('#save').disabled);
click('#deckPool [data-card="B"] + .deck-card-action');assert.equal(store.list[0].cards.length,8);assert(!root.querySelector('#save').disabled);
click('#deckPool [data-card="A"] + .deck-card-action');click('#deckTabs .deck-tab:nth-child(2)');assert(!hand().classList.contains('is-replacing'),'Switching decks clears replacement');assert(root.querySelector('#deckUndo').disabled,'Undo must not cross deck slots');
click('#deckCur .deck-entry:nth-child(2) .deck-hand-action');click('#deckTabs .deck-tab:first-child');assert(root.querySelector('#save').disabled,'Every slot must be valid before saving');click('#deckTabs .deck-tab:nth-child(2)');click('#deckUndo');
// Undo is intentionally cleared on slot change; repair the slot by adding a card.
click('#deckPool [data-card="A"] + .deck-card-action');assert.equal(store.list[1].cards.length,8);
click('#useBtn');await Promise.resolve();await Promise.resolve();assert.equal(saves.at(-1).sel,1);assert.equal(store.sel,1);assert(!root.querySelector('#save').disabled);
click('#deckCur .deck-entry:nth-child(2) .deck-hand-action');click('#deckPool [data-card="B"] + .deck-card-action');rejectSave=true;click('#save');await Promise.resolve();await Promise.resolve();assert.equal(root.querySelector('#deckMsg').textContent,'save failed');assert(!root.querySelector('#save').disabled);assert.equal(store.list[1].cards.length,8);
store.list[1].cards=Array(8).fill('A');click('#editTab');
assert(root.querySelector('#deckPool [data-card="A"] + .deck-card-action').disabled);
click('#deckPool [data-card="A"]');assert.equal(zooms.at(-1),'A','Copy-limit cards can still enlarge');assert.equal(store.list[1].cards.length,8);
screen.destroy();assert.equal(root.children.length,0);
console.log('PASS: fixed Attune, full-deck replacement, removal/addition, scoped undo, all-slot validation, active deck persistence, failed save recovery');
