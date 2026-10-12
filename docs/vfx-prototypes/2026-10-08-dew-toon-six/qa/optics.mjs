import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{const p=await browser.newPage();await p.goto('http://127.0.0.1:55170/dew-toon-six.html?paused=1');await p.waitForFunction(()=>window.dewToon?.state.frames>0);
const result=await p.evaluate(async()=>{
 const {Glass:Previous}=await import('/src/dev/dew-liquid-five/glass.ts'),{Glass:Current}=await import('/src/dev/dew-toon-six/glass.ts');const a=new Previous(),b=new Current(),bg=document.createElement('canvas'),read=document.createElement('canvas');bg.width=640;bg.height=370;read.width=read.height=200;const c=bg.getContext('2d'),r=read.getContext('2d');c.fillStyle='#eae5de';c.fillRect(0,0,640,370);for(let x=0;x<640;x+=32){c.fillStyle=x%64?'#697c6b':'#cdcabb';c.fillRect(x,0,8,370)}const pixels=im=>{r.clearRect(0,0,200,200);r.drawImage(im,0,0);return r.getImageData(0,0,200,200).data};let maximumDifference=0,cases=0;
 for(let shape=0;shape<5;shape++)for(const time of [0,.8,1.8,3.4]){const old=pixels(a.draw(bg,320,185,270,shape,time,false,200)),now=pixels(b.draw(bg,320,185,270,shape,time,false,200,-1));for(let i=0;i<old.length;i++)maximumDifference=Math.max(maximumDifference,Math.abs(old[i]-now[i]));cases++}a.dispose();b.dispose();return{cases,maximumDifference};});
if(result.maximumDifference>1)throw Error('Transparent optical baseline changed: '+JSON.stringify(result));await fs.writeFile(new URL('optics.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close()}
