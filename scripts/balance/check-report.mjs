import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
const root=process.argv[2],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{runScripts:'dangerously',virtualConsole:vc});
const w=dom.window,d=w.document,r=JSON.parse(fs.readFileSync(root+'/results.json'));
const count=()=>d.querySelectorAll('#rows tr').length;
assert.equal(count(),240);assert(d.title.includes('v47'));assert(!d.body.textContent.includes('{{VERSION}}'));
for(const [view,n]of [['starters',33],['factor',r.factor.length],['builds',r.builds.length],['quests',r.quests.length]]){d.querySelector(`[data-view=${view}]`).click();assert.equal(count(),n,view);}
d.querySelector('[data-view=market]').click();const input=d.querySelector('#query');input.value='魔王';input.dispatchEvent(new w.Event('input'));assert.equal(count(),1);assert(d.querySelector('#rows').textContent.includes('TDE4'));
input.value='';input.dispatchEvent(new w.Event('input'));d.querySelector('[data-sort=cost]').click();const before=d.querySelector('#rows tr').textContent;d.querySelector('[data-sort=cost]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));assert.notEqual(d.querySelector('#rows tr').textContent,before);
d.querySelector('[data-view=pairs]').click();assert(count()>0&&count()<=500);const min=d.querySelector('#minn');min.value='1';min.dispatchEvent(new w.Event('change'));assert.equal(count(),500);assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: report tabs, counts, Japanese search, keyboard sorting, pair filtering and script execution');dom.window.close();
