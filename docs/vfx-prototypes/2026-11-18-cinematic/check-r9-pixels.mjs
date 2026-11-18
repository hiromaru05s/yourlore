import sharp from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';import fs from 'node:fs/promises';
const dir=new URL('./qa/r9',import.meta.url).pathname,report=JSON.parse(await fs.readFile(dir+'/report.json','utf8'));const pixels=[];
for(const side of[0,1]){const r=report.checks.find(x=>x.side===side&&x.t===3.045).rect,region={left:Math.floor(r.x)-14,top:Math.floor(r.y)-14,width:Math.ceil(r.w)+28,height:Math.ceil(r.h)+28};const a=await sharp(`${dir}/side${side}-3.045.png`).extract(region).raw().toBuffer(),b=await sharp(`${dir}/side${side}-3.055.png`).extract(region).raw().toBuffer();let changed=0,max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}pixels.push({side,region,changedChannels:changed,maxDifference:max,meanDifference:sum/a.length});}
report.handoffPixels=pixels;await fs.writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(pixels);

if(pixels.some(p=>p.changedChannels!==0))throw new Error('Summon appearance changed at the former handoff');
