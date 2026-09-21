import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-motion-v2-');
const dom=new JSDOM('<div id="cards"></div>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Element','Node','localStorage','navigator','Image'])Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
try {
 await build({stdin:{contents:`export {drawPaperCards} from './client/src/ui/paperDraw';export {drawMotion} from './client/src/ui/drawMotion';export {reformState} from './client/src/ui/deckReform';export {cardEl} from './client/src/ui/cardView';export {DB} from './client/src/shared/cards';export {setLang} from './client/src/i18n';export {riftState,riftCardPoint} from './client/src/ui/riftTransmute';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/motion.mjs'});
 const {drawPaperCards,drawMotion,reformState,cardEl,DB,setLang,riftState,riftCardPoint}=await import(dir+'/motion.mjs');
 for(let i=0;i<=1000;i++){
  const t=i/1000,draw=drawMotion(t,true),hidden=drawMotion(t,false),reform=reformState(t);
  assert(Object.values(draw).every(Number.isFinite));
  assert.equal(hidden.reveal,0,'opponent hand must never expose its front');
  assert(draw.travel>=0&&draw.travel<=1);if(i)assert(draw.travel>=drawMotion((i-1)/1000,true).travel);
  if(reform.destinationAlpha>0)assert.equal(reform.sourceAlpha,0,'only one stack exists during matter transfer');
  assert(reform.burst>=0&&reform.burst<=1);
 }
 const settled=drawMotion(1,true);assert.equal(settled.travel,1);assert.equal(settled.reveal,1);assert(Math.abs(settled.lift)+Math.abs(settled.bank)+Math.abs(settled.size)<1e-8,'native card handoff has no residual transform');
 assert.equal(reformState(0).sourceAlpha,1);assert.equal(reformState(0).destinationAlpha,0);assert.equal(reformState(1).destinationCharge,0);assert.equal(reformState(1).destinationAlpha,1);
 // Once coated, even diagonal rotation stays within the original reveal width.
 const center={x:400,y:400},width=200;
 for(let ms=780;ms<=1280;ms+=10){const corners=[[-100,-156.25],[100,-156.25],[100,156.25],[-100,156.25]].map(([x,y])=>riftCardPoint({x:center.x+x,y:center.y+y},center,width,riftState(ms)));assert(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))<=width);}
 // Every locale/card computes its own width-relative label. Adding other cards or
 // rerendering at another screen size must not change the label's local scale.
 for(const lang of ['ja','en','ko']){
  setLang(lang);
  const container=document.getElementById('cards'),cards=Object.values(DB).map((c,i)=>cardEl({...c,uid:'name-'+i},{size:'hand'}));container.replaceChildren(...cards);
  const labels=cards.map(c=>c.querySelector('.card-name')),sizes=labels.map(e=>e.style.fontSize);
  assert(sizes.every(s=>s.startsWith('calc(var(--cw) * ')));
  cards.forEach((card,i)=>{card.style.transform=`scale(${.3+(i%7)/5}) rotate(${i%40}deg)`;card.style.width=(30+i%180)+'px';});
  await new Promise(r=>setTimeout(r,30));assert.deepEqual(labels.map(e=>e.style.fontSize),sizes);
  const repeat=Object.values(DB).map((c,i)=>cardEl({...c,uid:'copy-'+i},{size:'mkt'}).querySelector('.card-name').style.fontSize);assert.deepEqual(repeat,sizes);
 }
 // A stalled image decode must not hold a cancelled animation or leave cards hidden.
 const container=document.getElementById('cards'),node=document.createElement('div');node.className='card';node.innerHTML='<img src="/pending.webp" class="private-art">';container.replaceChildren(node);
 Object.defineProperties(node,{offsetWidth:{value:100},offsetHeight:{value:156}});
 dom.window.HTMLImageElement.prototype.decode=()=>new Promise(()=>{});
 globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);globalThis.innerWidth=1280;globalThis.innerHeight=720;
 globalThis.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);globalThis.cancelAnimationFrame=clearTimeout;
 const origin={left:100,top:200,width:50,height:78};
 for(const reveal of [true,false]){
  const abort=new AbortController();let landed=false;
  const draw=drawPaperCards({cards:[node],origin,sleeve:'/back.webp',reveal,signal:abort.signal,onLand:()=>{landed=true;}});
  if(!reveal)assert.equal(document.querySelectorAll('.native-draw-layer .private-art').length,0);
  abort.abort();
  await Promise.race([draw,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('cancelled decode leaked')),150);timer.unref();})]);
  assert.equal(document.querySelectorAll('.native-draw-layer').length,0);assert.equal(landed,false);
 }
 console.log('PASS: native draw endpoints/privacy; disappearance before reconstruction; compact exile bounds; stable independent labels for all cards in JA/EN/KO');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
