// Snapshot the current game renderer, including its real typography and seals.
// This runs in an isolated headless page; no running game or source file is modified.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.basename(__dirname)==='source'?path.resolve(__dirname,'..'):path.resolve(__dirname,'../../docs/3d-assets/2026-09-21-blender-shelf');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1200}});page.on('pageerror',e=>console.error(e));
  await page.route('**/__shelf_card_reference__',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><body class="game"><script type="module">
  import '/client/src/styles/tokens.css';import '/client/src/styles/base.css';import '/client/src/styles/card.css';import '/client/src/styles/game.css';
  import {cardEl} from '/client/src/ui/cardView.ts';import {captureCardSurface,CARD_PADDING} from '/client/src/ui/cardSurface.ts';
  import {DB,FRAME_BACK} from '/client/src/shared/cards.ts';import {setLang} from '/client/src/i18n.ts';
  setLang('ja');const card=cardEl({...DB.GOLEM1,uid:'shelf-reference'},{fullArt:true});
  card.style.cssText='--cw:512px;--ch:800px;width:512px;height:800px;position:absolute;left:100px;top:100px;transform:none;transition:none';document.body.append(card);
  const art=card.querySelector('.card-art img');art.removeAttribute('srcset');art.removeAttribute('sizes');art.src='/art/cards/GOLEM1.webp';await art.decode();
  await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const surface=await captureCardSurface(card,FRAME_BACK,true);window.reference={png:surface.face.toDataURL('image/png'),width:surface.face.width,height:surface.face.height,padding:CARD_PADDING,id:'GOLEM1',name:card.querySelector('.card-name').textContent,ratio:.64};
  </script></body></html>`}));
  await page.goto('http://127.0.0.1:5198/__shelf_card_reference__');await page.waitForFunction(()=>window.reference,{},{timeout:30000});
  const {png,...meta}=await page.evaluate(()=>window.reference);
  const probes=await page.evaluate(async()=>{
   const im=new Image();im.src=window.reference.png;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
   const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height,points=new Set();
   const opaque=(x,y)=>data[(y*w+x)*4+3]>160,add=(x,y)=>points.add(x+','+y);
   for(let y=0;y<h;y+=12){let first=-1,last=-1;for(let x=0;x<w;x++)if(opaque(x,y)){if(first<0)first=x;last=x;}if(first>=0){add(first,y);add(last,y);}}
   for(let x=0;x<w;x+=12){let first=-1,last=-1;for(let y=0;y<h;y++)if(opaque(x,y)){if(first<0)first=y;last=y;}if(first>=0){add(x,first);add(x,last);}}
   for(let y=0;y<h;y+=48)for(let x=0;x<w;x+=48)if(opaque(x,y))add(x,y);
   return [...points].map(p=>{const[x,y]=p.split(',').map(Number);return[(x/w-.5)*.1364,(.5-y/h)*.198275];});
  });
  fs.writeFileSync(path.join(out,'web/textures/card-front.png'),Buffer.from(png.split(',')[1],'base64'));
  fs.writeFileSync(path.join(out,'reference/card-capture.json'),JSON.stringify({...meta,source:'Current cardEl + captureCardSurface; game code unchanged',texture_footprint_m:[.110*(1+2*meta.padding),.171875+.110*2*meta.padding]},null,2));
  fs.writeFileSync(path.join(out,'reference/card-visibility-probes.json'),JSON.stringify({source:'Alpha contour + opaque area of actual card capture',count:probes.length,blender_xy_m:probes},null,2));
  console.log(meta);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
