import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['client/src/ui/handPhysics.ts'],bundle:true,format:'esm',write:false});
const {holdPhysicalCard}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
function trial(strength,reduced=false){
 let callback=null,frame=0;globalThis.requestAnimationFrame=cb=>{callback=cb;return ++frame;};globalThis.cancelAnimationFrame=()=>{callback=null;};globalThis.matchMedia=()=>({matches:reduced});
 globalThis.document={documentElement:{dataset:{handPhysicsStrength:strength}},createElement:()=>({style:{},remove(){}})};
 const node={offsetWidth:80,offsetHeight:125,classList:{add(){}},style:{},append(){},getBoundingClientRect(){return {left:0,top:0,width:80,height:125};}};
 const start=performance.now();const motion=holdPhysicalCard(node,{left:50,top:500,width:100,height:156.25},{x:105,y:560},0,{width:100,height:156.25});let maximum=0,tail=0;
 for(let i=1;i<=150;i++){
  const t=i/60;motion.move(t<.45?105+t*750:442.5,560);
  const cb=callback;callback=null;cb?.(start+i*1000/60);
  const y=+node.style.transform.match(/rotateY\(([-\d.e]+)deg\)/)[1];maximum=Math.max(maximum,Math.abs(y));tail=y;
  assert(!node.style.transform.includes('NaN'));
 }
 assert(Math.abs(tail)<.15,'movement settles after stopping');
 assert(Math.abs(+node.style.transform.match(/scale\(([-\d.e]+)\)/)[1]-1)<.001,'retains production drag dimensions');
 motion.move(105,560,1.6,1);
 for(let i=151;i<=210;i++){const cb=callback;callback=null;cb?.(start+i*1000/60);}
 const heldReturnScale=+node.style.transform.match(/scale\(([-\d.e]+)\)/)[1];
 assert(Math.abs(heldReturnScale-1.6)<.001,'card regains hand size while pointer remains held');
 motion.move(440,400,1.6,0);
 for(let i=211;i<=270;i++){const cb=callback;callback=null;cb?.(start+i*1000/60);}
 assert(Math.abs(+node.style.transform.match(/scale\(([-\d.e]+)\)/)[1]-1)<.001,'moving back to the board restores field size');
 motion.dispose();assert.equal(callback,null,'dispose cancels RAF');return {strength,reduced,maximum,tail,heldReturnScale};
}
const soft=trial('soft'),strong=trial('strong'),reduced=trial('strong',true);assert(strong.maximum>soft.maximum*2.5);assert(strong.maximum<80);assert.equal(reduced.maximum,0);
console.log('hand physics: approved motion, settling, held-size return, reduced motion and RAF cleanup passed', {soft,strong,reduced});
