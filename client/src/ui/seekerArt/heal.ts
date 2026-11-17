// Each map measures the travel of the light in the coordinates of the breathing
// portrait. The filter derives the actual reflected light from each live pixel.
import {ease,envelope} from './ink';

export type LightStudy = {
  id:string; kind:'heal'; name:string; duration:number; color:string;
  exposure:(position:number,t:number)=>number;
};
export const band=(d:number,width:number)=>Math.exp(-.5*(d/width)**2);

export const healingRise:LightStudy={
  id:'H7',kind:'heal',name:'裾から昇る光',duration:1824,color:'#58db67',
  exposure:(p,t)=>{
    const front=-.11+1.29*ease(.02,.95,t);
    const d=p-front, tail=d+.14;
    return envelope(t,0,.15,.76,1)*(.89*band(d,.135)+.40*band(tail,.22));
  },
};

export function greenLightFilter(id:string){
  // Keep the hue and weave of the blue cloth under the diffuse reflection.
  // Warm pigments in the gold trim give a smaller, brighter specular response.
  return `<filter id="${id}" primitiveUnits="objectBoundingBox" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
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
}

export function configureGreenLight(filter:Element,study:LightStudy,field:string){
  filter.querySelector('feImage')!.setAttribute('href',field);
  filter.querySelector('[data-diffuse]')!.setAttribute('flood-color',study.color);
}
