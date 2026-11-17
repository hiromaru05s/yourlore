// Bake the deck editor's daylight painting into one transparent square crop.
// Usage: node scripts/build-daylight-seeker.mjs (from the repository root).
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const dir='client/public/art/seekers/daylight-v1', size=256;
await mkdir(dir,{recursive:true});
const base=await sharp('client/public/art/seekers/faceless-v2/home-closeup-daylight.webp')
  .extract({left:150,top:0,width:700,height:700}).resize(size,size).ensureAlpha().raw().toBuffer();
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
  if((kind==='heal'||kind==='mana') && t>0 && t<1){
   // Green rises around the volume of the mantle; blue follows its gilt seams outward from the clasp.
   const luma=(.25*r+.54*g+.21*bl)/255,reflect=.18+.82*clamp((luma-.03)*3);
   const gold=clamp((r-bl)/70),rad=Math.hypot((u-.46)*.9,v-.78),envelope=Math.sin(Math.PI*t);
   let amount,color;
   if(kind==='heal'){
    const height=v-.11*(1-(2*u-1)**2)+.022*Math.sin(7*u+3*t),front=1.18-1.45*smooth(t/.69),back=1.27-1.64*smooth((t-.44)/.56);
    amount=reflect*(.86*smooth((height-front+.09)/.18)*(1-smooth((height-back+.1)/.2))+.52*band(height,front,.10)*envelope);color=[.37,.98,.27];
   }else{
    amount=(.11+.76*gold+.30*reflect)*band(rad,.93*(1-(1-t)**1.55),.096)*Math.min(t*12,1)*(1-t*t)+gold*.60*band(t,.36,.24)*clamp(1-rad);
    color=[.36,.83,1];
   }
   [r,g,bl]=[r,g,bl].map((c,i)=>c+(255-c)*color[i]*clamp(amount));
  }
  data[idx]=Math.round(r);data[idx+1]=Math.round(g);data[idx+2]=Math.round(bl);data[idx+3]=Math.round(alpha);
 }
 return data;
}
const idle=Array.from({length:72},(_,i)=>frame('idle',i/72));
await sharp(Buffer.concat(idle),{raw:{...raw,height:size*idle.length,pageHeight:size}})
 .gif({delay:idle.map(()=>60),loop:0,colours:256,dither:0,effort:8,interFrameMaxError:1}).toFile(dir+'/idle.gif');
for(const [kind,count] of [['hurt',41],['mana',57],['heal',57]]){
 const tiles=Array.from({length:count},(_,i)=>({input:frame(kind,i/(count-1)),raw,left:(i%8)*size,top:Math.floor(i/8)*size}));
 await sharp({create:{width:size*8,height:size*Math.ceil(count/8),channels:4,background:'#0000'}}).composite(tiles)
  .webp({quality:90,alphaQuality:100}).toFile(dir+'/'+kind+'.webp');
}
