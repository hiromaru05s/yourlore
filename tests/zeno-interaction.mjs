import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['client/src/ui/zenoInteraction.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {createZenoTurn,bindZenoInteraction,ZENO_TURN_LIMIT}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for(const side of [-1,1]){
 const t=createZenoTurn();t.drag(side*10000,side*10000,400,400);
 for(let i=0;i<120;i++){const p=t.tick(1/60);assert(Math.abs(p.yaw)<=ZENO_TURN_LIMIT.yaw&&Math.abs(p.pitch)<=ZENO_TURN_LIMIT.pitch);}
 const p=t.tick(1/60);assert(Math.abs(p.yaw-side*Math.PI/6)<.001&&Math.abs(p.pitch-side*Math.PI/18)<.001);
 t.release();for(let i=0;i<240;i++)t.tick(1/60);assert(Math.abs(t.tick(1/60).yaw)<.001,'Returns smoothly to front');
}
class Target extends EventTarget {
 style={touchAction:'manipulation'};tagName='BUTTON';capture=null;
 setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
 getBoundingClientRect(){return {width:400,height:400};}
}
const target=new Target();let greetings=0,wakes=0;
const send=(type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,isPrimary:true,button:0,clientX:0,clientY:0,detail:1},props);target.dispatchEvent(e);};
const cleanup=bindZenoInteraction(target,createZenoTurn(),()=>greetings++,()=>wakes++);
send('pointerdown');send('pointerup');send('click');assert.equal(greetings,1);
send('pointerdown');send('pointermove',{clientX:200});send('pointerup');send('click');assert.equal(greetings,1,'Dragging must not greet');
send('pointerdown');send('pointercancel');send('click');assert.equal(greetings,1,'Cancellation must not greet');
send('click',{detail:0});assert.equal(greetings,2,'Keyboard activation works after canceled gesture');
send('pointerdown');send('pointermove',{pointerId:2,clientX:200});send('pointerup');send('click');assert.equal(greetings,3,'Other fingers are ignored');
cleanup();send('click');assert.equal(greetings,3);assert.equal(target.style.touchAction,'manipulation');assert.equal(target.capture,null);assert(wakes>0);
console.log('PASS rotation bounds, release, tap, drag suppression, cancel, keyboard, multitouch and cleanup');
