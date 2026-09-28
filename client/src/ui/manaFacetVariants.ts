/** Five timing/scale studies of the user-selected facet material. No replacement FX. */
import * as T from 'three';
import type {FormationInput,FormationHandle,FormationPreview} from './manaFormationTypes';
import {createManaFormation,applyFormationBloom} from './manaFormation';
export const FACET_VARIANTS=[
 {id:'facet-swift',name:'小気味よく',en:'Quick focus',note:'少し大きく広がり、短い溜めから素早く一石へ。',peak:1.7,gather:460,hold:80,contract:340,tail:610,curve:'smooth'},
 {id:'facet-flow',name:'なめらかに',en:'Silken focus',note:'大きな結晶面を読ませながら、流れる速度で縮小して定着。',peak:2.2,gather:740,hold:120,contract:660,tail:610,curve:'smooth'},
 {id:'facet-snap',name:'溜めて、一気に',en:'Held impulse',note:'大きく組み上げた形を一拍見せ、加速して鋭く収斂。',peak:2.7,gather:700,hold:430,contract:320,tail:610,curve:'snap'},
 {id:'facet-grand',name:'大きく、ゆっくり',en:'Grand descent',note:'最も大きく展開。ゆっくり結晶面を畳み、小さな水晶へ着地。',peak:3.2,gather:1050,hold:200,contract:940,tail:610,curve:'smooth'},
 {id:'facet-pulse',name:'二段で収斂',en:'Double focus',note:'大きな形を一度締め、短い間を置いて最後の一段を収束。',peak:2.45,gather:560,hold:120,contract:850,tail:610,curve:'double'},
] as const;
export type FacetVariantId=typeof FACET_VARIANTS[number]['id'];
export const isFacetVariant=(value:unknown):value is FacetVariantId=>FACET_VARIANTS.some(v=>v.id===value);
export function facetSpec(id:FacetVariantId){return FACET_VARIANTS.find(v=>v.id===id)!;}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const smooth5=(n:number)=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
export function facetTiming(id:FacetVariantId){const v=facetSpec(id),end=v.gather+v.hold+v.contract;return {impact:end+140,duration:end+140+v.tail};}
/** A monotonic deformation: broad facet assembly -> held form -> exact final gemstone. */
export function facetConvergencePose(id:FacetVariantId,age:number,ordinal=0,count=1){
 const v=facetSpec(id),delay=count<=1?0:Math.min(140,(count-1)*35)*ordinal/(count-1);
 const t=Math.max(0,age-delay),contractStart=v.gather+v.hold;
 const p=clamp((t-contractStart)/v.contract);
 const contraction=v.curve==='snap'?smooth5(p**1.8):v.curve==='double'?p<.42?.62*smooth5(p/.42):p<.58?.62:.62+.38*smooth5((p-.58)/.42):smooth5(p);
 const scale=1+(v.peak-1)*(1-contraction);
 // Reveal all the approved facets before shrinking. The original shader clock is continuous.
 const virtualAge=t<v.gather?1160*smooth(t/v.gather):t<contractStart?1160+30*smooth((t-v.gather)/Math.max(1,v.hold)):p<1?1190+110*contraction:1300+900*smooth((t-contractStart-v.contract)/v.tail);
 return {scale,contraction,virtualAge:virtualAge+delay,lift:.023*(scale-1),spread:(count<=1?0:ordinal/(count-1)-.5)*.034*(scale-1),phase:t<v.gather?'展開':t<contractStart?'溜め':p<1?'収斂':'定着'};
}
export function createFacetConvergence(input:FormationInput,id:FacetVariantId):FormationHandle{
 const base=createManaFormation(input,'facets'),root=base.group,visual=new T.Group();visual.name='Expanded facets and their incoming light';
 // The setting stays in its real slot. Optical geometry, volume ribbons, edge light and dust move together.
 for(const child of [...root.children]){
  if(child.name==='forming-authored-setting'||child instanceof T.PointLight)continue;
  if(child instanceof T.Mesh&&child.geometry instanceof T.PlaneGeometry)continue;
  visual.add(child);
 }
 root.add(visual);
 return {group:root,update(age,worldScale){
  const p=facetConvergencePose(id,age,input.ordinal,input.count);
  base.update(p.virtualAge,worldScale*p.scale);
  visual.scale.setScalar(p.scale);
  // Scale around the same optical centre used by the authored crystal, then descend into the slot.
  visual.position.set(p.spread,p.lift+.0106*(1-p.scale),0);
  for(const child of root.children){if(child instanceof T.PointLight){child.intensity/=p.scale*p.scale;child.position.set(p.spread,.03+p.lift,0);}}
  // Opaque setting optics stay at board scale; expanding the crystal must not change their material.
  for(const child of root.children)if(child.name==='forming-authored-setting')child.castShadow=p.contraction===1;
  root.userData.progress*=p.contraction;root.userData.convergenceScale=p.scale;root.userData.convergencePhase=p.phase;root.userData.convergenceOffset=visual.position.toArray();
 },dispose:base.dispose};
}
export function facetPreview(id:FacetVariantId):FormationPreview{return {id,...facetTiming(id),create:input=>createFacetConvergence(input,id),postprocess:applyFormationBloom};}
