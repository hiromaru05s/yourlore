import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><div id="app"></div></body>',{url:'http://localhost',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event});
const base={t:key=>key,esc:s=>String(s).replaceAll('<','&lt;'),onLangChange:()=>()=>{},loungeText:ja=>ja,homeIcon:()=>'<i></i>'};
async function load(name,deps){const source=(await fs.readFile(new URL(`../client/src/screens/${name}.ts`,import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const exports={};new Function('exports',...Object.keys(deps),js)(exports,...Object.values(deps));return exports;}
const root=document.querySelector('#app');const calls=[];
const app={root,user:{id:'local-guest-user',decks:null,botClears:['easy','normal','hard','hell']},rankedLobby:()=>calls.push('ranked'),onlineLobby:()=>calls.push('online'),botGame:d=>calls.push(d),storyGame:s=>calls.push('story:'+s),single:loc=>calls.push('single:'+loc.tab),deck:()=>calls.push('deck'),leaderboard:()=>calls.push('rank'),home(){}};
const npcBundle=await build({stdin:{contents:"export * from './client/src/shared/botNpcs';export {ARIES_ROUTE} from './client/src/shared/ariesStory';export {BOT_FIRST_CLEAR_EXP, BOT_REWARDS} from './client/src/shared/progression';export {STARTERS, DB, deckStoreForUser} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const npcModule={exports:{}};new Function('module','exports',npcBundle.outputFiles[0].text)(npcModule,npcModule.exports);const npcs=npcModule.exports;
let finishPortraits;
const portraitsReady = new Promise(resolve=>{finishPortraits=resolve;});
let warmups=0,cancelledWarmups=0,giftMounts=0,giftDisposals=0;
const inkInstances=[];
class HomeDuelInk {constructor(button,mode){this.button=button;this.canvas=document.createElement('canvas');this.mode=mode;this.disposed=false;inkInstances.push(this);}setMode(mode){this.mode=mode;}destroy(){this.disposed=true;}}
const buttonSource=(await fs.readFile(new URL('../client/src/ui/homeDuelButton.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'');
const buttonJS=ts.transpileModule(buttonSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const buttonDeps={HomeDuelInk,esc:base.esc,loungeText:base.loungeText,assetHints:new WeakMap(),homeDuelFrame:'/frame.webp',homeDuelImage:mode=>'/'+mode+'.webp',loadHomeDuelImage:async()=>{}};
const buttonModule={};new Function('exports',...Object.keys(buttonDeps),buttonJS)(buttonModule,...Object.values(buttonDeps));
const {mountHomeDuelButton}=buttonModule;
const {mountHome}=await load('home',{...base,mountHomeSeeker:()=>()=>{},decodeAsset:()=>portraitsReady,rosterPortraits:Object.fromEntries(npcs.BOT_NPCS.map(npc=>[npc.difficulty,'/roster/'+npc.id])),storyPortraits:['/luca','/rena','/aries'],ARIES_COMPLETED_KEY:'lore.story.aries.cleared.v1',ARIES_STARTER_NAMES:{ja:['アチューン','精鋭ゴブリン ×3','ゴブリンの起源','ゴブリンパーティー','ゴブリン鍛冶屋','イカロスの靴','イカロスの翼'],en:[],ko:[]},mountHomeDuelButton,BOT_FIRST_CLEAR_EXP:{easy:20,normal:35,hard:60,hell:120},mountDailyRewards:()=>()=>{},rewardProgressHtml:()=>'',mountGiftInbox:(receivedApp,button)=>{assert.equal(receivedApp,app);assert.equal(button.id,'homeGifts');assert.equal(button.parentElement,root.querySelector('#rankedMode').parentElement.parentElement,'Courier shares the mode controls column');giftMounts++;return()=>{giftDisposals++;}},firstClearLabel:n=>String(n),BOT_REWARDS:{easy:1500,normal:3000,hard:5000,hell:15000},scheduleGameWarmup:()=>{warmups++;return()=>{cancelledWarmups++;}},warmGame:async()=>{warmups++;},...npcs,getLang:()=> 'ja',api:{rankMe:async()=>null},homeRankHtml:()=>'',sanitizeDecks:()=>({sel:0,list:[{name:'Deck',cards:[]}]}),artUrl:{sm:id=>id}});
const home=mountHome(app);
const startButton=root.querySelector('#ranked');
assert.equal(startButton.dataset.mode,'ranked');
const rankedFrame=startButton.querySelector('.home-duel-frame').getAttribute('viewBox');
root.querySelector('#online').click();const normalFrame=startButton.querySelector('.home-duel-frame').outerHTML;
assert.equal(inkInstances[0].disposed,false,'Mode changes preserve the ink renderer');assert.equal(inkInstances.length,1);assert.equal(inkInstances[0].mode,'normal');
const singleButton=document.createElement('button');
const singleDuel=mountHomeDuelButton(singleButton);singleDuel.setMode('bot');
assert.equal(singleButton.querySelector('.home-duel-frame').outerHTML,normalFrame,'Single and normal reuse the same frame asset and geometry');singleDuel.destroy();
assert.equal(root.querySelector('#bot'),null,'Single is reached through the bottom navigation');
assert.equal(root.querySelectorAll('.lounge-mode-tabs button').length,2);
assert.notEqual(startButton.querySelector('.home-duel-frame').getAttribute('viewBox'),rankedFrame,'Ranked uses its distinct crimson inlay');
assert.equal(startButton.querySelectorAll('.home-duel-fallback').length,1,'Static pigment is available before WebGL and on unsupported devices');
const beforeRepeat=inkInstances.length;root.querySelector('#online').click();assert.equal(inkInstances.length,beforeRepeat,'Reselecting a mode does not allocate another renderer');
root.querySelector('#rankedMode').click();
assert.equal(giftMounts,1,'HOME mounts one gift inbox');
assert.equal(root.querySelector('.home-spirit-touch, .home-spirit-host, .home-companion-caption, .home-spirit-speech, #spiritTutorial'),null);
root.querySelector('#online').click();assert.deepEqual(calls,[],'Selecting a mode must not start matchmaking');
root.querySelector('#ranked').click();assert.deepEqual(calls,['online']);
root.querySelector('#rankedMode').click();root.querySelector('#ranked').click();assert.equal(calls.at(-1),'ranked');
assert.equal(warmups,1,'HOME prepares duel assets');
home.destroy();assert(inkInstances.every(i=>i.disposed));assert.equal(giftDisposals,1);assert.equal(cancelledWarmups,1);root.innerHTML='';
let idleMounts=0,idleDisposals=0;
const {mountSingleBattle:mountSingle}=await load('singleBattle',{
 ...base,...npcs,L:ja=>ja,getLang:()=> 'ja',cardName:card=>card.id,
 pageArrow:'/page-arrow.svg',ARIES_COMPLETED_KEY:'lore.story.aries.cleared.v1',
 mountHomeDuelButton,mountSingleIdle:()=>{idleMounts++;return()=>{idleDisposals++;};},
 storyPortraits:['/luca','/rena','/aries'],artUrl:{sm:id=>id},deckName:()=> 'Deck',
});
const single=mountSingle(app,{page:0});
for(const [index,difficulty] of npcs.SINGLE_DIFFICULTIES.entries()){
 assert.equal(root.querySelector('.sp-identity h1').textContent,npcs.botNpc(difficulty).name.ja);
 const before=calls.length;
 root.querySelector('.single-battle').click();assert.equal(calls.at(-1),difficulty);
 assert.equal(root.querySelector('button[data-story]').disabled,false);
 root.querySelector('[data-next]').click();
 assert.equal(calls.slice(before).filter(c=>npcs.SINGLE_DIFFICULTIES.includes(c)).length,1,'Page turns never launch another duel');
}
assert.equal(calls.at(-1),'single:story','the last NPC page returns to the chapter hub');
assert.equal(root.querySelector('.single-page').dataset.story,'false');
assert(root.querySelector('.sp-standing'));
root.querySelector('[data-training]').click();assert.equal(calls.at(-1),'single:training');
single.destroy();assert.equal(idleDisposals,idleMounts);
app.user.botClears=['hell'];
const locked=mountSingle(app);
assert.equal(root.querySelector('[data-next]').disabled,true);
assert.equal(root.querySelector('button[data-story]').disabled,false,'the story starts before NPC qualification');
assert(root.querySelector('#sp-unlock').textContent.includes('ルミ'));
root.querySelector('button[data-story]').click();assert.equal(calls.at(-1),'single:story');assert.equal(root.querySelector('.single-page').dataset.story,'false');
locked.destroy();assert(inkInstances.every(i=>i.disposed));assert.equal(idleDisposals,idleMounts);root.innerHTML='';
let resolveCollection;
const {mountShop}=await load('shop',{...base,starterCollection:()=>({}),renderShopStarters:host=>{host.textContent='daily starters';},pendingPurchase:()=>null,purchaseCollection:async()=>({}),isCardFrame:()=>false,mountShopFrames:host=>{host.textContent='frame accessories';return {update(){},dispose(){host.replaceChildren();}};},mountShopGacha:host=>{host.textContent='gacha scene';return Object.assign(()=>host.replaceChildren(),{update(){}});},api:{collection:()=>new Promise(r=>resolveCollection=r)}});
const shop=mountShop(app);
assert.deepEqual([...root.querySelectorAll('[data-category]')].map(b=>b.dataset.category),['gacha','starter','accessories']);
root.querySelector('[data-category="starter"]').click();assert.equal(root.querySelector('#shopStarters').textContent,'daily starters');assert(root.querySelector('.shop-gacha-active'));assert(root.querySelector('#shopGacha').hasAttribute('inert'));
root.querySelector('[data-category="accessories"]').click();assert.equal(root.querySelector('#shopFrames').textContent,'frame accessories');assert.equal(root.querySelector('[data-buy],#grid,[data-board-preview]'),null);
root.querySelector('[data-category="gacha"]').click();assert(!root.querySelector('#shopGacha').hasAttribute('inert'));
shop.destroy();root.innerHTML='';resolveCollection({credits:10,starterCards:{}});await Promise.resolve();await Promise.resolve();assert.equal(root.innerHTML,'','Late collection must not repaint a destroyed screen');dom.window.close();console.log('PASS: HOME mode selection, separate Single pages and progression, three shop tabs, inert hidden gacha, and late-response teardown');
