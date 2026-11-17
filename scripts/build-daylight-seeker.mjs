// Bake the deck editor's daylight painting into one transparent square crop.
// Usage: node scripts/build-daylight-seeker.mjs (from the repository root).
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='client/public/art/seekers/daylight-v1', size=256;
await mkdir(dir,{recursive:true});
const base=await sharp('client/public/art/seekers/faceless-v2/home-closeup-daylight.webp')
  .extract({left:159,top:0,width:700,height:700}).resize(size,size).ensureAlpha().raw().toBuffer();
const raw={width:size,height:size,channels:4};
await sharp(base,{raw}).webp({lossless:true}).toFile(dir+'/portrait.webp');
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>clamp(v)**2*(3-2*clamp(v));
const band=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
const knots=[[0,0],[.035,.08],[.095,.63],[.17,1],[.23,.94],[.34,.72],[.51,.31],[.68,.03],[.77,-.07],[.88,-.025],[1,0]];
function recoil(t){const j=knots.findIndex(([x])=>x>=t);if(j<=0)return 0;const [a,b]=knots[j-1],[c,d]=knots[j];return b+(d-b)*((t-a)/(c-a));}
function frame(kind,t){
 const data=Buffer.alloc(base.length),phase=t*2*Math.PI,hit=recoil(t);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,upper=1-smooth((v-.45)/.59),shoulders=band(v,.76,.22);
  let dx=0,dy=0;
  if(kind==='idle'){
   dx=5.5*upper*Math.sin(phase)+2.1*shoulders*(u-.5)*Math.sin(phase-.35);
   dy=-3.3*(.75*upper+.45*shoulders)*Math.sin(phase+.2)+1.6*(u-.5)*upper*Math.sin(phase);
  }else if(kind==='hurt'){
   dx=hit*(14*upper+4*shoulders);dy=hit*(5*upper+22*(u-.5)*shoulders);
  }
  const xx=Math.max(0,Math.min(size-1,x-dx)),yy=Math.max(0,Math.min(size-1,y-dy));
  const a=Math.floor(xx),b=Math.floor(yy),fx=xx-a,fy=yy-b,idx=(y*size+x)*4;
  const samples=[[a,b,(1-fx)*(1-fy)],[Math.min(size-1,a+1),b,fx*(1-fy)],[a,Math.min(size-1,b+1),(1-fx)*fy],[Math.min(size-1,a+1),Math.min(size-1,b+1),fx*fy]];
  let r=0,g=0,bl=0,alpha=0;
  for(const [sx,sy,weight] of samples){const i=(sy*size+sx)*4,w=weight*base[i+3];alpha+=w;r+=base[i]*w;g+=base[i+1]*w;bl+=base[i+2]*w;}
  if(alpha<.5)continue;
  r/=alpha;g/=alpha;bl/=alpha;
  data[idx]=Math.round(r);data[idx+1]=Math.round(g);data[idx+2]=Math.round(bl);data[idx+3]=Math.round(alpha);
 }
 return data;
}
const idle=Array.from({length:72},(_,i)=>frame('idle',i/72));
await sharp(Buffer.concat(idle),{raw:{...raw,height:size*idle.length,pageHeight:size}})
 .gif({delay:idle.map(()=>60),loop:0,colours:256,dither:0,effort:8,interFrameMaxError:1}).toFile(dir+'/idle.gif');
// The profile studio uses the stand-alone recoil sheet; duels deform the running GIF.
const tiles=Array.from({length:41},(_,i)=>({input:frame('hurt',i/40),raw,left:(i%8)*size,top:Math.floor(i/8)*size}));
await sharp({create:{width:size*8,height:size*6,channels:4,background:'#0000'}}).composite(tiles)
 .webp({quality:90,alphaQuality:100}).toFile(dir+'/hurt.webp');

// R/G are inverse displacement vectors. B encodes the journey of the light through
// this crop: distance up the folded cloth or distance from the impact side.
const packed={}, n=64;
for (const kind of ['heal','hurt']){
 const map=Buffer.alloc(n*n*3);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x+.5)/n,v=(y+.5)/n, hood=1-smooth((v-.44)/.52);
  const shoulders=band(v,.77,.18),cloth=1-smooth((v-.86)/.14);
  let dx,dy,travel;
  if(kind==='heal'){
   dx=(.45-u)*.50*shoulders-.09*hood;
   dy=.40*hood+.25*shoulders;
   travel=1-v+.16*(1-(2*u-1)**2)+.024*Math.sin(u*7+v*2);
  }else{
   dx=.44*hood+.21*shoulders;
   dy=.19*hood+(u-.38)*.95*shoulders;
   travel=(u+.4*(1-v))*.77;
  }
  const i=(y*n+x)*3;
  map[i]=Math.round(255*clamp(.5-dx*cloth));map[i+1]=Math.round(255*clamp(.5-dy*cloth));
  map[i+2]=Math.round(255*clamp(travel));
 }
 const png=await sharp(map,{raw:{width:n,height:n,channels:3}}).png({adaptiveFiltering:true}).toBuffer();
 packed[kind]='data:image/png;base64,'+png.toString('base64');
}
await writeFile('client/src/ui/seekerFields.json',JSON.stringify(packed,null,2)+'\n');
