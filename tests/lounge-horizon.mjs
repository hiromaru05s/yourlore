import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body></body>',{pretendToBeVisual:true});
const {window}=dom;Object.assign(globalThis,{window,document:window.document,HTMLElement:window.HTMLElement});
let frames=new Map(),frameId=0,observers=[],animations=[],reduced=false;
globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.matchMedia=()=>({matches:reduced});
globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
window.Element.prototype.animate=function(keyframes,options){const animation={target:this,keyframes,options,cancelled:false,cancel(){this.cancelled=true}};animations.push(animation);return animation};
const source=await fs.readFile(new URL('../client/src/ui/loungeNavMotion.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {mountLoungeNavMotion}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function fixture(active='cards'){
 const nav=document.createElement('nav');nav.innerHTML=['home','deck','cards'].map(key=>`<button data-nav="${key}" ${active===key?'aria-current="page"':''}><span>icon</span><span>${key}</span></button>`).join('');document.body.append(nav);
 nav.getBoundingClientRect=()=>({left:0,width:300});[...nav.children].forEach((b,i)=>b.getBoundingClientRect=()=>({left:i*100,width:100}));return nav;
}
function flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn())}
let nav=fixture(),dispose=mountLoungeNavMotion(nav,'home');flush();assert.equal(animations.length,2);assert.equal(animations[0].options.duration,360);
observers.at(-1).callback([{contentRect:{width:300}}]);assert(animations.every(a=>!a.cancelled),'initial ResizeObserver delivery must not cancel entrance');
let navigated=0;const buttons=[...nav.querySelectorAll('button')];buttons.forEach(b=>b.onclick=()=>navigated++);buttons[0].focus();buttons[0].dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(document.activeElement,buttons[1]);assert.equal(navigated,0,'arrow focus must not bypass leave confirmation');assert.equal(nav.querySelector('[aria-current]').dataset.nav,'cards');
dispose();assert(observers.at(-1).disconnected);assert(animations.every(a=>a.cancelled));nav.remove();
animations=[];nav=fixture();dispose=mountLoungeNavMotion(nav,'home');dispose();flush();assert.equal(animations.length,0,'destroy before first frame must prevent late animation');nav.remove();
reduced=true;nav=fixture();dispose=mountLoungeNavMotion(nav,'home');flush();assert.equal(animations.length,0);assert.equal(nav.querySelector('.horizon-cursor').style.left,'200px');dispose();nav.remove();
reduced=false;nav=fixture('profile');dispose=mountLoungeNavMotion(nav,'cards');flush();assert(nav.querySelector('.horizon-cursor').hidden);dispose();nav.remove();
console.log('PASS horizon route feedback, initial resize, teardown, reduced motion, and guarded keyboard focus');
