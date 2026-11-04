import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
const dom=new JSDOM('<body><div id="log"></div></body>',{url:'https://lore.test',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event','localStorage'])globalThis[k]=dom.window[k];
const dir=await mkdtemp('/tmp/lore-log-ui-');
try {
 await build({stdin:{contents:`export {GameLog} from './client/src/ui/log';export {setLang} from './client/src/i18n';export {createGame,reduce} from './client/src/shared/engine';export {battleLogEvents} from './client/src/shared/battleLog';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/ui.mjs',plugins:[{name:'inspection-boundary',setup(b){b.onResolve({filter:/cardInspection$/},()=>({path:'inspection',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const zoomCard=card=>{globalThis.__logInspections=(globalThis.__logInspections??[]).concat(card.id);};'}));}}]});
 const {GameLog,setLang,createGame,reduce,battleLogEvents}=await import(dir+'/ui.mjs');
 const el=document.querySelector('#log'),log=new GameLog(el);setLang('ja');
 const g=createGame({mode:'online',seed:42,starting:1,p0:{id:'a',name:'Alice'},p1:{id:'b',name:'Bob'}}).state;g.players[1].mana=5;
 const refreshed=reduce(g,{type:'refresh'});
 const append=events=>{for(const e of events)if(e.type==='turnHeader')log.turnHeader(e.turn,e.name,e.isBot,e.player===0);else if(e.type==='log'&&!e.rejected)log.line(e.html,e.htmlJa);};
 const history=[{type:'turnHeader',turn:3,name:'Bob',isBot:false,player:1},...battleLogEvents(refreshed.events),{type:'log',html:'몬스터 존이 가득 차 소환 실패',htmlJa:'モンスターゾーンが満杯で召喚できません'}];
 append(history);assert.match(el.textContent,/Bob.*マーケットをリロール/s);assert.equal(el.querySelectorAll('.log-card').length,refreshed.state.players[1].supply.filter(Boolean).length);assert.equal(el.querySelectorAll('.ln.opp').length,2);assert.match(el.textContent,/召喚できません/);
 const logCard=el.querySelector('.log-card');logCard.click();assert.equal(globalThis.__logInspections,undefined,'primary click does not inspect');
 logCard.dispatchEvent(new dom.window.MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));assert.deepEqual(globalThis.__logInspections,[logCard.dataset.card],'secondary click inspects');
 const text=el.textContent;log.clear();append(history);assert.equal(el.textContent,text,'replace after reconnect does not duplicate');
 setLang('en');assert.match(el.textContent,/rerolled the market/);setLang('ja');assert.equal(el.textContent,text,'language changes preserve history and localize card names');
 // Exercise the real controller methods without constructing the WebGL board.
 const source=await readFile('client/src/game/controller.ts','utf8');
 const start=source.indexOf('  protected restoreLog('),end=source.indexOf('  /** Play a batch',start);
 const methods=source.slice(start,end);
 await build({stdin:{contents:`export class LogController {${methods}}`,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:dir+'/controller.mjs'});
 const {LogController}=await import(dir+'/controller.mjs');
 const c=new LogController();Object.assign(c,{log,state:{cur:1},you:0,dead:false,queue:Promise.resolve()});
 log.clear();c.consumeLogs(history);assert.match(el.textContent,/召喚できません/,'controller retains resolved failure text');
 c.consumeLogs([{type:'log',html:'blocked',htmlJa:'拒否',rejected:true}]);assert(!el.textContent.includes('拒否'));
 // An older action queued ahead of reconnect must be replaced, then a new action appended.
 c.queue=c.queue.then(()=>c.consumeLogs(refreshed.events));c.restoreLog(history,true);c.restoreLog([{type:'log',html:'latest',htmlJa:'新しい行動'}],false);await c.queue;
 assert.equal(el.querySelectorAll('.log-card').length,refreshed.state.players[1].supply.filter(Boolean).length);assert(el.textContent.endsWith('新しい行動'));
 // A reconnected pre-rename journal uses current terms while preserving player names.
 log.clear();log.line('<span class="t">最大マナ</span> 최대 마나 +1','<span class="t">最大マナ</span> 最大マナ+1');
 for(const [lang,term] of [['ja','マナ水晶'],['en','mana crystals'],['ko','마나 수정']]){setLang(lang);assert(el.textContent.includes(term));assert.equal(el.querySelector('.t').textContent,'最大マナ','player name remains verbatim');}
 log.line('최대 마나 +1','最大マナ+1','max mana +1');setLang('en');assert(el.lastElementChild.textContent.includes('mana crystals'));
 log.dispose();console.log('PASS log UI: real controller filtering, opponent grouping, right-click inspection of localized cards, Japanese/English reroll text, queued reconnect replacement and later appends');
} finally {await rm(dir,{recursive:true,force:true});dom.window.close();}
