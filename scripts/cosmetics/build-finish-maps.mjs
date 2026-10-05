/** Material-space microgeometry, not normals inferred from a painted sleeve. */
import fs from 'node:fs/promises';import sharp from 'sharp';import {transform} from 'esbuild';
const {code}=await transform(await fs.readFile('client/src/shared/atelierThemes.ts','utf8'),{loader:'ts',format:'esm'});const {THEMES}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const size=256;
for(const t of THEMES){const normal=Buffer.alloc(size*size*3),rough=Buffer.alloc(size*size*3);const surface=t.surface;
 const height=(x,y)=>surface==='wood'?.2*Math.sin(x*.37+Math.sin(y*.027)*2)+.05*Math.sin(x*1.7+y*.08):surface==='leather'?.14*Math.sin(x*.8)*Math.cos(y*.9)+.08*Math.sin(x*1.7+y*.7):surface==='glass'?.1*Math.sin(x*.12+y*.08):surface==='stone'?.08*Math.sin(x*.19+y*.23)+.05*Math.cos(x*.7-y*.6):.035*Math.sin(x*.1)*Math.cos(y*.1);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*3,dx=(height(x+1,y)-height(x-1,y))*1.8,dy=(height(x,y+1)-height(x,y-1))*1.8,len=Math.hypot(dx,dy,1);normal[i]=Math.round(127.5-dx/len*127.5);normal[i+1]=Math.round(127.5-dy/len*127.5);normal[i+2]=Math.round(127.5+127.5/len);const base=surface==='leather'?.86:surface==='wood'?.66:surface==='stone'?.55:surface==='porcelain'?.27:.22,r=Math.round(255*(base+height(x,y)*.14));rough[i]=rough[i+1]=rough[i+2]=r;}
 const dir='client/public/cosmetics/atelier-v1/'+t.id;for(const [name,data]of[['surface-normal',normal],['surface-roughness',rough]])await sharp(data,{raw:{width:size,height:size,channels:3}}).webp({lossless:true}).toFile(dir+'/'+name+'.webp');
}
console.log('8 authored material normal/roughness pairs');
