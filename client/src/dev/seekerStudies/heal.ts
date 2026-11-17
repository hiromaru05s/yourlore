// Each map measures the travel of the light in the coordinates of the breathing
// portrait. The filter derives the actual reflected light from each live pixel.
import {clamp,ease,envelope} from '../../ui/seekerArt/ink';

type LightStudy = {
  id:string; kind:'heal'; name:string; duration:number; color:string;
  distance:(x:number,y:number)=>number;
  exposure:(position:number,t:number)=>number;
};
const band=(d:number,width:number)=>Math.exp(-.5*(d/width)**2);

export const greenStudies:LightStudy[]=[
  {
    id:'H7',kind:'heal',name:'裾から昇る光',duration:1824,color:'#58db67',
    distance:(x,y)=>.09+.75*(1-y)+.09*(1-(2*x-1)**2),
    exposure:(p,t)=>{
      const front=-.11+1.29*ease(.02,.95,t);
      const d=p-front, tail=d+.14;
      return envelope(t,0,.15,.76,1)*(.89*band(d,.135)+.40*band(tail,.22));
    },
  },
  {
    id:'H8',kind:'heal',name:'斜めからの反射光',duration:1880,color:'#78d475',
    distance:(x,y)=>.05+.57*x+.32*y+.075*Math.sin(y*3.8+x*.8),
    exposure:(p,t)=>{
      const d=p-(-.12+1.34*ease(.01,.94,t));
      return envelope(t,0,.18,.73,1)*(.82*band(d,.105)+.35*band(d+.10,.19));
    },
  },
  {
    id:'H9',kind:'heal',name:'胸元に灯る光',duration:2050,color:'#48d778',
    distance:(x,y)=>Math.hypot((x-.445)*1.06,(y-.775)*.91),
    exposure:(p,t)=>{
      const breath=envelope(t,0,.40,.53,1);
      const width=.09+.28*ease(.10,.53,t)-.13*ease(.66,.97,t);
      const core=envelope(t,.02,.24,.39,.78);
      return breath*.94*band(p,width)+core*.45*band(p,.12);
    },
  },
];

const namespace='http://www.w3.org/2000/svg';
const maps=new Map<string,string>();
let nextId=0;
function distanceMap(study:LightStudy){
  const cached=maps.get(study.id);
  if(cached)return cached;
  const size=96,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=4*(y*size+x);
    pixels.data[i]=Math.round(255*clamp(study.distance((x+.5)/size,(y+.5)/size)));
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const url=canvas.toDataURL();maps.set(study.id,url);return url;
}

export function createGreenLight(image:HTMLImageElement){
  const id='seeker-green-light-'+(++nextId);
  const svg=document.createElementNS(namespace,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
  // Keep the hue and weave of the blue cloth under the diffuse reflection.
  // Warm pigments in the gold trim give a smaller, brighter specular response.
  svg.innerHTML=`<filter id="${id}" primitiveUnits="objectBoundingBox" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0"/>
    <feComponentTransfer result="exposure"><feFuncA type="table" tableValues="0 0"/></feComponentTransfer>
    <feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .55 .90 .69 0 .035"/>
    <feComposite in2="SourceAlpha" operator="in"/><feComposite in2="exposure" operator="in" result="lit"/>
    <feFlood data-diffuse=""/><feComposite in2="lit" operator="in" result="diffuse"/>
    <feGaussianBlur stdDeviation=".035"/>
    <feComponentTransfer result="spill"><feFuncA type="linear" slope=".57"/></feComponentTransfer>
    <feComposite in="SourceGraphic" in2="spill" operator="over" result="ambient"/>
    <feBlend in="diffuse" in2="ambient" mode="screen" result="fabric"/>
    <feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.70 .48 -.66 0 -.19"/>
    <feComposite in2="lit" operator="in" result="litGold"/><feFlood flood-color="#c9efaf" flood-opacity=".46" result="sheenColor"/>
    <feComposite in="sheenColor" in2="litGold" operator="in" result="sheen"/>
    <feBlend in="sheen" in2="fabric" mode="screen"/>
  </filter>`;
  image.after(svg);
  const field=svg.querySelector('feImage')!,curve=svg.querySelector('feFuncA')!,diffuse=svg.querySelector('[data-diffuse]')!;
  let last='';
  function paint(study:LightStudy,t:number){
    if(last!==study.id){
      field.setAttribute('href',distanceMap(study));diffuse.setAttribute('flood-color',study.color);last=study.id;
    }
    const samples=Array.from({length:48},(_,i)=>clamp(study.exposure(i/47,t)).toFixed(3));
    curve.setAttribute('tableValues',samples.join(' '));
    image.style.filter=`url(#${id})`;
    image.dataset.playing=study.id;
  }
  function clear(){
    if(image.dataset.playing){image.style.removeProperty('filter');delete image.dataset.playing;}
  }
  return {paint,clear,destroy(){clear();svg.remove();}};
}
