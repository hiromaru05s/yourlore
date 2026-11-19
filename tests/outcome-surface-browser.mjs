/** Regression: visible idle must win over the hidden poster; neither may stretch. */
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT??'/tmp/lore-defeat-preview-tools/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.route('**/surface-capture-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('http://127.0.0.1:5538/surface-capture-qa');
 const result=await page.evaluate(async()=>{
  const svg=body=>'data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">${body}</svg>`);
  const style=document.createElement('style');style.textContent=`.pt-ring,.avatar{display:block;position:relative;width:200px;height:140px}.pt-ring::after{content:'';position:absolute;left:0;top:0;width:200px;height:140px;background-image:url("${svg('')}")}.avatar{mask-image:url("${svg('<rect width="100" height="100" fill="white"/>')}")}.seeker-motion{width:100%;height:100%;object-fit:contain;opacity:0}.seeker-idle{position:absolute;left:30px;top:0;width:140px;height:140px;object-fit:contain}.seeker-idle[hidden]{display:none}`;document.head.append(style);
  document.body.innerHTML='<div class="portrait"><div class="pt-ring"><div class="avatar"><canvas class="seeker-motion" width="256" height="256" data-frame="0"></canvas><img class="seeker-idle"></div></div></div>';
  const root=document.querySelector('.portrait'),poster=root.querySelector('canvas'),img=root.querySelector('img');poster.getContext('2d').fillStyle='blue';poster.getContext('2d').fillRect(0,0,256,256);img.src=svg('<rect width="100" height="100" fill="red"/>');await img.decode();
  const {captureOutcomeSurface,captureCharacterSurface,characterAnchor}=await import('/src/ui/outcomeSurface.ts');
  const measure=async()=>{const cv=await captureOutcomeSurface(root,new AbortController().signal),ctx=cv.getContext('2d'),pixels=ctx.getImageData(0,0,768,768).data;let minX=768,minY=768,maxX=-1,maxY=-1;for(let y=0;y<768;y++)for(let x=0;x<768;x++){if(pixels[(y*768+x)*4+3]<250)continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return {center:[...ctx.getImageData(384,384,1,1).data],width:maxX-minX+1,height:maxY-minY+1,minX};};
  const live=await measure();
  const before=await captureCharacterSurface(root,new AbortController().signal),a=characterAnchor(root);
  const counter=document.createElement('span');counter.className='pt-hp';counter.style.cssText='position:absolute;left:-400px;top:-200px;width:90px;height:90px';counter.innerHTML='<b>999</b>';root.append(counter);
  const after=await captureCharacterSurface(root,new AbortController().signal),sameCharacter=before.toDataURL()===after.toDataURL(),sameAnchor=JSON.stringify(a)===JSON.stringify(characterAnchor(root));counter.remove();img.hidden=true;poster.style.opacity='1';const fallback=await measure();return {live,fallback,sameCharacter,sameAnchor};
 });
 assert(result.sameCharacter&&result.sameAnchor,'counter presence/value/position cannot affect character fracture surface or anchor');
 assert.deepEqual(result.live.center,[255,0,0,255],'visible animated image, not the hidden blue poster');
 assert.deepEqual(result.fallback.center,[0,0,255,255],'hidden idle uses loaded canvas fallback');
 for(const capture of [result.live,result.fallback]){assert.ok(Math.abs(capture.width-capture.height)<=1,'square artwork remains square in a wide avatar');assert.ok(capture.width>=525&&capture.width<=529,'140px artwork in 204px capture');assert.ok(capture.minX>=119&&capture.minX<=121,'centered at original position');}
 console.log('PASS displayed idle source + unchanged size/position + reduced-motion canvas fallback',JSON.stringify(result));
}finally{await browser.close();}
