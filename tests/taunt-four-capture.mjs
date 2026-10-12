import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='docs/vfx-prototypes/2026-10-12-taunt-four/qa/revision-2';await fs.mkdir(out+'/frames',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>console.log('ERROR',e.message));
try{
 console.log('Capture browser ready');
 await page.goto('http://127.0.0.1:5471/taunt-four-board.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.tauntBoard?.state.ready,{},{timeout:180000});
 const inspect=()=>[...document.querySelectorAll('.zone-mon .card')].map(n=>({uid:n.dataset.uid,inline:n.getAttribute('style'),opacity:getComputedStyle(n).opacity,visibility:getComputedStyle(n).visibility,ancestors:[n.parentElement,n.parentElement.parentElement,n.closest('.prow')].map(p=>({class:p.className,opacity:getComputedStyle(p).opacity,visibility:getComputedStyle(p).visibility})),rect:{x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}}));
 console.log('Board ready');const before=await page.evaluate(inspect);await page.screenshot({path:out+'/board-idle.png',timeout:120000});await page.evaluate(async()=>{await tauntBoard.configure({variant:0,side:1,card:'SHIELD_TITAN',result:5});tauntBoard.seek(460);});const after=await page.evaluate(inspect);console.log('DOM AUDIT',JSON.stringify({before,after}));await fs.writeFile(out+'/board-dom.json',JSON.stringify({before,after},null,2));
 await page.goto('http://127.0.0.1:5471/taunt-four.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.tauntStudy?.state.ready,{},{timeout:180000});
 // Deterministic normal-speed timeline, 30 rendered frames per second.
 for(let frame=0;frame<=45;frame++){
  const data=await page.evaluate(({frame})=>{tauntStudy.seek(Math.min(1000,frame*1000/30));const c=document.createElement('canvas');c.width=1320;c.height=1100;const x=c.getContext('2d');x.fillStyle='#e9e6dc';x.fillRect(0,0,c.width,c.height);document.querySelectorAll('article canvas').forEach((source,i)=>{const dx=(i%2)*660,dy=Math.floor(i/2)*550;x.drawImage(source,dx,dy,660,500);x.fillStyle='#434945';x.font='18px sans-serif';x.fillText(['01  TWIN AEGIS','02  QUICKSILVER MANE','03  LIONHEART','04  OBSIDIAN BASTION'][i],dx+28,dy+527);});return c.toDataURL('image/png').split(',')[1];},{frame});
  await fs.writeFile(out+'/frames/'+String(frame).padStart(3,'0')+'.png',Buffer.from(data,'base64'));
 }
 await page.evaluate(()=>{document.querySelector('#dark').checked=true;document.querySelector('#dark').dispatchEvent(new Event('change'));tauntStudy.seek(480);});await page.screenshot({path:out+'/dark-comparison.png',fullPage:true,timeout:120000});
 console.log('CAPTURE COMPLETE');
}finally{await browser.close();}
