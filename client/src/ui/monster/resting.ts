import type {Variant} from './catalog';
/** Same silhouette drop-shadow mechanism as attackerPulse, with a quieter green palette. */
export function ongoingFilter(v:Variant,t:number,reduced:boolean){
 const profiles=[
  {rgb:'91,185,124',base:3,spread:4,low:.27,high:.62,cycles:4},
  {rgb:'89,178,118',base:3,spread:5,low:.23,high:.53,cycles:2},
  {rgb:'53,154,102',base:2,spread:3,low:.32,high:.65,cycles:2},
  {rgb:'135,193,112',base:4,spread:5,low:.22,high:.50,cycles:2},
  {rgb:'95,180,127',base:4,spread:2,low:.42,high:.56,cycles:4},
  {rgb:'91,190,132',base:4,spread:4,low:.20,high:.43,cycles:2},
 ];
 const p=profiles[['A','B','C','D','E','F'].indexOf(v)],b=reduced?.5:.5-.5*Math.cos(t*Math.PI*2*p.cycles);
 return `drop-shadow(0 2px 4px #0009)${v==='F'?' drop-shadow(0 0 1.15px rgba(87,190,123,.55))':''} drop-shadow(0 0 ${p.base+p.spread*b}px rgba(${p.rgb},${p.low+(p.high-p.low)*b}))`;
}
