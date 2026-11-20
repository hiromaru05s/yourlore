// Trace the physical stock from the default sleeve alpha. No artwork is altered.
import sharp from 'sharp';
import fs from 'node:fs/promises';
const {data,info}=await sharp('client/public/frames/sleeve_default.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const rows=[];
for(let y=0;y<info.height;y++){
 let left=info.width,right=-1;
 for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){left=Math.min(left,x);right=x;}
 if(right>=left)rows.push({y,left,right});
}
const sampled=rows.filter((r,i)=>i===0||i===rows.length-1||i%8===0);
const outline=[...sampled.map(r=>[r.left/info.width,r.y/info.height]),...sampled.toReversed().map(r=>[(r.right+1)/info.width,r.y/info.height])];
await fs.writeFile('client/src/ui/cardStockOutline.json',JSON.stringify(outline.map(p=>p.map(v=>+v.toFixed(6))))+'\n');
console.log({vertices:outline.length,top:rows[0].y,bottom:rows.at(-1).y});
