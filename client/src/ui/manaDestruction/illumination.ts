import {clamp,smooth} from './catalog';
export type Skin={frames:HTMLCanvasElement[];lit:HTMLCanvasElement};
// Selected 01 only. Spatial terms are independent of the card and animation clock.
// Cache them without changing the approved pixel equations or palette.
const fields=new Map<number,Float64Array>();
function field(w:number,h:number){
 let values=fields.get(h);if(values)return values;
 values=new Float64Array(w*h*6);const ridge=(d:number,width:number)=>Math.exp(-d*d/(width*width));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/w,v=y/h,k=(y*w+x)*6,ex=Math.max(Math.abs(u-.5)-.363,0),ey=Math.max(Math.abs(v-.5)-.400,0);
  const edge=Math.min(u-.098,.902-u,v-.061,.939-v),branch=Math.sin(u*19+Math.sin(v*8)*1.8)+Math.sin(v*23-u*7)*.48;
  values[k]=clamp((.039-Math.hypot(ex,ey))*w);values[k+1]=edge;values[k+2]=1-v;
  values[k+3]=ridge(edge-.008,.018)*.9*.66+ridge(edge-.009,.0035)*.62;
  values[k+4]=ridge(branch,.17)*.43*.66+ridge(branch,.035)*.42*.62;
  values[k+5]=.22+(.5+.5*Math.sin(v*9-u*5))*.34;
 }
 fields.set(h,values);if(fields.size>4)fields.delete(fields.keys().next().value!);return values;
}
export function makeSkin(face:HTMLCanvasElement,_mode:number,finalOnly=false):Skin{
 const w=192,h=Math.round(w*face.height/face.width),input=document.createElement('canvas');input.width=w;input.height=h;
 const ctx=input.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(face,0,0,w,h);
 const art=ctx.getImageData(0,0,w,h).data,spatial=field(w,h),frames:HTMLCanvasElement[]=[];
 for(let frame=finalOnly?28:0;frame<=28;frame++){
  const t=frame/28,arrive=smooth(.04,.80,t),release=smooth(.68,1,t),charge=smooth(.05,.28,t),final=smooth(.72,1,t);
  const out=document.createElement('canvas');out.width=w;out.height=h;
  const c=out.getContext('2d',{willReadFrequently:true})!,pixels=c.createImageData(w,h),data=pixels.data;
  for(let p=0;p<w*h;p++){
   const k=p*4,q=p*6,mask=spatial[q],lum=(art[k]*.2126+art[k+1]*.7152+art[k+2]*.0722)/255;
   const travel=smooth(-.10,.12,arrive*1.5-spatial[q+2]),fill=travel*smooth(-.08,.16,arrive*.52-spatial[q+1]);
   const coverage=clamp(fill*.73+final*.54)*mask,bright=clamp((travel*spatial[q+3]+fill*spatial[q+4])*charge)*(.78+lum*.22)*mask;
   const shade=clamp(spatial[q+5]+lum*.20+release*.12),light=bright*.91;
   data[k]=(art[k]*(1-coverage)+(18+shade*62)*coverage)*(1-light)+221*light;
   data[k+1]=(art[k+1]*(1-coverage)+(57+shade*118)*coverage)*(1-light)+249*light;
   data[k+2]=(art[k+2]*(1-coverage)+(100+shade*129)*coverage)*(1-light)+255*light;
   data[k+3]=art[k+3]*(1-final)+mask*255*final;
  }
  c.putImageData(pixels,0,0);frames.push(out);
 }
 return{frames,lit:frames[frames.length-1]};
}
