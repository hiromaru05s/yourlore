/** Mechanical sprite extraction/registration only. Source art is imagegen output. */
import sharp from 'sharp';
import fs from 'node:fs/promises';
const base = 'docs/characters/2026-10-12-hooded';
const out = 'client/public/art/seekers/hooded-v1';
const actions = ['idle','mana','heal','hurt','heavy','defeat','victory'];
const runs = values => {
  const result=[]; let start=-1;
  values.forEach((value,i)=>{if(value&&start<0)start=i;if(!value&&start>=0){result.push([start,i-1]);start=-1;}});
  if(start>=0)result.push([start,values.length-1]);return result;
};
const manifest={version:1,cell:128,columns:8,rows:7,actions,anchor:{x:64,ground:110},characters:{}};
for(const [gender,color] of [['male','blue'],['female','red']]){
  const source=`${base}/source/${gender}.png`;
  const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const dark=(x,y)=>{const i=(y*info.width+x)*info.channels;return Math.min(data[i],data[i+1],data[i+2])<195;};
  const ys=Array.from({length:info.height},(_,y)=>Array.from({length:info.width},(_,x)=>dark(x,y)).filter(Boolean).length>3);
  const rows=runs(ys).filter(([a,b])=>b-a>30);
  if(rows.length!==7)throw Error(`${gender}: expected 7 rows, found ${rows.length}`);
  const cells=rows.map(([top,bottom])=>{
    const xs=Array.from({length:info.width},(_,x)=>{for(let y=top;y<=bottom;y++)if(dark(x,y))return true;return false;});
    const cols=runs(xs).filter(([a,b])=>b-a>15);
    if(cols.length!==8)throw Error(`${gender}: expected 8 columns, found ${cols.length}`);
    return cols.map(([left,right])=>{
      let first=bottom,last=top;
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(dark(x,y)){first=Math.min(first,y);last=Math.max(last,y);}
      let footLeft=right,footRight=left;
      for(let y=last-12;y<=last;y++)for(let x=left;x<=right;x++)if(dark(x,y)){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
      return {left:left-2,top:first-2,width:right-left+5,height:last-first+5,anchorX:(footLeft+footRight)/2-left+2,anchorY:last-first+2};
    });
  });
  const heights=cells[0].map(c=>c.height-4).sort((a,b)=>a-b),scale=84/heights[4];
  const frames=[];
  for(let row=0;row<7;row++)for(let col=0;col<8;col++){
    // Exact same neutral pixels at every transition; defeat remains on its authored knee.
    const neutral=(col===0)||(col===7&&row!==5);
    const box=neutral?cells[0][0]:cells[row][gender==='male'&&row===5&&col===7?6:col];
    const width=Math.round(box.width*scale),height=Math.round(box.height*scale);
    const sprite=await sharp(source).extract({left:box.left,top:box.top,width:box.width,height:box.height}).resize(width,height,{kernel:'nearest'}).toBuffer();
    const left=Math.round(64-box.anchorX*scale),top=Math.round(110-box.anchorY*scale);
    if(left<8||top<8||left+width>120||top+height>120)throw Error(`Unsafe margin ${gender} ${row} ${col}: ${left},${top},${width},${height} ${JSON.stringify(box)}`);
    const frame=await sharp({create:{width:128,height:128,channels:3,background:'#ffffff'}}).composite([{input:sprite,left,top}]).png().toBuffer();
    frames.push({input:frame,left:col*128,top:row*128});
  }
  await sharp({create:{width:1024,height:896,channels:3,background:'#fff'}}).composite(frames).webp({lossless:true}).toFile(`${out}/${color}.webp`);
  await sharp(frames[0].input).webp({lossless:true}).toFile(`${out}/${color}-portrait.webp`);
  manifest.characters[color]={gender,source,scale,cells,atlas:`${color}.webp`,poster:`${color}-portrait.webp`,frameCount:56};
}
await fs.writeFile(`${base}/registration.json`,JSON.stringify(manifest,null,2)+'\n');
console.log('Registered 112 frames at 128px; neutral endpoints shared, feet at y110.');
