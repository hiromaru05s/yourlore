import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5265')+'/frame-material-five.html');
 const result=await page.evaluate(async()=>{
  const {CardFrameMaterial}=await import('/src/ui/cardFrameMaterial.ts'),{cardEl}=await import('/src/ui/cardView.ts'),{STARTERS}=await import('/src/shared/cards.ts');
  const card=cardEl({...STARTERS.STARTER_MANA,uid:'lifecycle'},{frame:'default'});document.body.append(card);const before=card.getBoundingClientRect().toJSON();
  const live=new CardFrameMaterial();await live.attach(card,2,()=>true);live.draw(1,true);const layer=card.querySelector('.card-frame-material'),initial=layer.toDataURL(),after=card.getBoundingClientRect().toJSON();live.gl.getExtension('WEBGL_lose_context').loseContext();await new Promise(r=>setTimeout(r,50));live.draw(2,true);const retained=layer.toDataURL()===initial;live.dispose();const removed=card.querySelectorAll('.card-frame-material').length===0;
  const original=HTMLCanvasElement.prototype.getContext;let fallback;try{HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'?null:original.call(this,kind,...args);};fallback=new CardFrameMaterial();}finally{HTMLCanvasElement.prototype.getContext=original;}
  await fallback.attach(card,1,()=>true);fallback.draw(3,true);const canvas=card.querySelector('.card-frame-material'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)opaque++;fallback.dispose();const cancelled=new CardFrameMaterial();await cancelled.attach(card,0,()=>false);const none=card.querySelectorAll('.card-frame-material').length===0;cancelled.dispose();card.remove();return{before,after,retained,removed,opaque,none};
 });assert.deepEqual(result.before,result.after);assert(result.retained&&result.removed&&result.none);assert(result.opaque>1000);console.log('PASS frame geometry, context-loss last pixels, static GPU fallback, cancellation and disposal',result.opaque);
}finally{await browser.close();}
