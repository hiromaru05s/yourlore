import {band,healingRise,configureGreenLight,greenLightFilter,type LightStudy} from '../../ui/seekerArt/heal';
import {clamp,ease,envelope} from '../../ui/seekerArt/ink';
export const greenStudies:LightStudy[]=[
  healingRise,
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
let nextId=0;
export function createGreenLight(image:HTMLImageElement){
  const id='seeker-green-light-'+(++nextId);
  const svg=document.createElementNS(namespace,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
  svg.innerHTML=greenLightFilter(id);
  image.after(svg);
  const curve=svg.querySelector('feFuncA')!;
  let last='';
  function paint(study:LightStudy,t:number){
    if(last!==study.id){
      configureGreenLight(svg,study);last=study.id;
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
