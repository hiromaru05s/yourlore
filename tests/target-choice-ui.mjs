import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Element','Node','MutationObserver','localStorage','navigator','CustomEvent','Event','Image','HTMLImageElement'])Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
globalThis.requestAnimationFrame=cb=>setTimeout(cb,0);globalThis.cancelAnimationFrame=clearTimeout;
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const dir=await mkdtemp('/tmp/lore-target-ui-');
try{
 await build({stdin:{contents:`export * from './client/src/ui/modal';export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/playIntent';export {setLang} from './client/src/i18n';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/ui.mjs',plugins:[{name:'no-animation',setup(b){b.onResolve({filter:/\/anim$/},()=>({path:'anim',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const bindZoom=()=>{};'}));}}]});
 const E=await import(dir+'/ui.mjs');const card=(id,uid=id)=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid});
 const g=E.createGame({mode:'online',seed:1,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;
 g.players[0].field=[];g.players[1].field=[{...card('M1','enemy'),tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0}];const sword=card('SELECTED_SWORD');g.players[0].hand=[sword];
 for(const lang of ['ja','ko','en']){
  E.setLang(lang);let result=E.reviewCast(g,0,sword,E.playIntent(g,0,sword));assert(document.querySelector('.cast-review .btn-gold').disabled);
  const target=document.querySelector('[data-choice="enemy"]');target.click();assert(!document.querySelector('.cast-review .btn-gold').disabled);assert(document.querySelector('.cast-review-caution').textContent.length>10);
  target.click();assert(document.querySelector('.cast-review .btn-gold').disabled);target.click();document.querySelector('.cast-review').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(await result,null);assert.equal(g.players[0].hand.length,1);
  result=E.reviewCast(g,0,sword,E.playIntent(g,0,sword));document.querySelector('[data-choice="enemy"]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.querySelector('.cast-review .btn-gold').click();assert.deepEqual(await result,['enemy']);
 }
 E.setLang('ja');let result=E.reviewCast(g,0,sword,E.playIntent(g,0,sword));E.closeOverlay();assert.equal(await result,null,'timeout/reconnect/replacement cancels instead of committing a stale dialog');
 const empty=structuredClone(g);empty.players[1].field=[];result=E.reviewCast(empty,0,sword,E.playIntent(empty,0,sword));assert(document.querySelector('.btn-gold').disabled);document.querySelector('.btn-ghost').click();assert.equal(await result,null);
 let picked='unset';E.cardPicker('対象選択',[g.players[1].field[0]],uid=>picked=uid,true,{confirm:true,label:()=> '相手'});document.querySelector('.picker-grid .card').click();assert.equal(picked,'unset','target click is not commitment');assert.equal(document.querySelector('.picker-owner').textContent,'相手');document.querySelector('.btn-gold').click();assert.equal(picked,'enemy');
 console.log('PASS real card UI: three languages, opponent warning, select/deselect, confirm, Escape, overlay replacement, no-target and pending-choice confirmation');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
