import sharp from 'sharp';import fs from 'node:fs/promises';import crypto from 'node:crypto';
const base='docs/ui-rework/2026-09-27-game-presentation';const {assets}=JSON.parse(await fs.readFile(base+'/imagegen-prompts.json'));
await fs.mkdir(base+'/generated',{recursive:true});await fs.mkdir('client/public/art/seekers/v2',{recursive:true});await fs.mkdir('client/public/ui/passives/v1',{recursive:true});
const manifest=[];
for(const a of assets){const original=`${base}/generated/${a.key}.png`;await fs.copyFile(a.source,original);const out=a.type==='seeker'?`client/public/art/seekers/v2/${a.key}.webp`:`client/public/ui/passives/v1/${a.key}.webp`;await sharp(original).resize(a.type==='seeker'?1024:96,a.type==='seeker'?1024:96).webp({quality:a.type==='seeker'?86:94}).toFile(out);const bytes=await fs.readFile(out);manifest.push({key:a.key,path:out,original,...await sharp(out).metadata(),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
for(const path of ['art/lounge/stage-v1/stage','art/lounge/v1/library'])await sharp(`client/public/${path}.png`).webp({quality:87}).toFile(`client/public/${path}.webp`);
// Derive the true aperture from the frame alpha. Close tiny antialias gaps,
// flood the center opening and dilate 8 source pixels under the opaque rails.
for(const name of ['self','opp']){
 const {data,info}=await sharp(`client/public/art/biblion/refined/portrait-${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width:w,height:h}=info,N=w*h;
 const wall=new Uint8Array(N);for(let i=0;i<N;i++)wall[i]=data[i*4+3]>100?1:0;
 let closed=new Uint8Array(N);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)n+=wall[(y+dy)*w+x+dx];closed[y*w+x]=n?1:0;}
 if(name==='opp')for(let step=0;step<14;step++){const next=closed.slice();for(let i=w+1;i<N-w-1;i++)if(closed[i])next[i-1]=next[i+1]=next[i-w]=next[i+w]=1;closed=next;}
 const seen=new Uint8Array(N),queue=new Int32Array(N);let tail=1,head=0;queue[0]=Math.floor(h/2)*w+Math.floor(w/2);seen[queue[0]]=1;
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!seen[j]&&!closed[j]){seen[j]=1;queue[tail++]=j;}}
 if(tail<N*.15||tail>N*.78)throw Error(`Frame ${name} has an open boundary: ${tail/N}`);
 const rgba=Buffer.alloc(N*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let inside=seen[y*w+x];if(!inside)for(let d=-(name==='opp'?20:8);d<=(name==='opp'?20:8)&&!inside;d++)if(x+d>=0&&x+d<w&&seen[y*w+x+d]||y+d>=0&&y+d<h&&seen[(y+d)*w+x])inside=1;const i=(y*w+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=255;rgba[i+3]=inside?255:0;}
 await sharp(rgba,{raw:{width:w,height:h,channels:4}}).resize(512,512).png().toFile(`client/public/art/seekers/v2/mask-${name}.png`);console.log('mask',name,tail/N);
}
await fs.writeFile(base+'/assets.json',JSON.stringify(manifest,null,2));console.log('assets',manifest.length,'bytes',manifest.reduce((n,a)=>n+a.bytes,0));
