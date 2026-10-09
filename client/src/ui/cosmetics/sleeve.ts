import {livingFromUrl} from '../../shared/livingCosmetics';
import {animatedMaterial} from './living/materials';
import * as T from 'three';
import {themeFromUrl,type AtelierTheme} from '../../shared/atelierThemes';
export {themeFromUrl} from '../../shared/atelierThemes';
const phases=new Map<string,number>();
export const setSleevePhase=(id:string,seconds:number)=>{phases.set(id,seconds);};
const maps=new Map<string,T.DataTexture>();
/** Authored material regions: broad inset foil border, a central lens, and etched
 * veins. This mask describes manufacture; it never guesses metal from art color. */
function finishMap(t:AtelierTheme){let map=maps.get(t.id);if(map)return map;const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/(size-1),v=y/(size-1),dx=(u-.5)*2,dy=(v-.5)*2,r=Math.hypot(dx,dy*.8),edge=Math.min(u,1-u,v,1-v),border=Math.exp(-Math.pow((edge-.048)/.014,2));const lens=Math.max(0,1-r/.50);const vein=Math.exp(-Math.pow((dx-.11*Math.sin(dy*13))/.026,2))*(1-Math.min(1,Math.abs(dy)));
  const foil=Math.max(border,t.id==='silverflow'||t.id==='emberheart'?vein*.9:lens*.55),rough=t.surface==='leather'?.68:t.surface==='wood'?.46:t.surface==='stone'?.38:.24;const n=(x*17+y*37)%13/13;
  const i=(y*size+x)*4;data[i]=Math.round(255*foil);data[i+1]=Math.round(255*(rough*(1-foil*.65)+n*.025));data[i+2]=Math.round(255*(.08+foil*.85));data[i+3]=255;}
 map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;maps.set(t.id,map);return map;}
export function sleeveMaterial(texture:T.Texture):T.Material{
 const living=livingFromUrl(texture.userData.url||(texture.image as HTMLImageElement)?.currentSrc||(texture.image as HTMLImageElement)?.src);
 if(living){const m=animatedMaterial(living.variant,false,texture);m.onBeforeRender=()=>{m.uniforms.time.value=matchMedia('(prefers-reduced-motion: reduce)').matches?0:performance.now()/1000;};return m;}
 const theme=themeFromUrl(texture.userData.url||(texture.image as HTMLImageElement)?.currentSrc||(texture.image as HTMLImageElement)?.src);if(!theme)return new T.MeshBasicMaterial({map:texture,toneMapped:false});
 const map=finishMap(theme),material=new T.MeshPhysicalMaterial({name:'atelier-sleeve-'+theme.id,map:texture,color:0xc5c9cf,roughnessMap:map,metalnessMap:map,roughness:1,metalness:.75,clearcoat:theme.surface==='leather'?.12:.8,clearcoatRoughness:.16,iridescence:theme.id==='porcelain'?.35:0,envMapIntensity:.75,bumpMap:map,bumpScale:.0008});
 if(theme.motion){
  const active={value:1},time={value:0},tint={value:new T.Color(theme.accent)},mode=theme.motion==='emissive_pulse'?1:0;
  material.onBeforeCompile=shader=>{shader.uniforms.atelierActive=active;shader.uniforms.atelierTime=time;shader.uniforms.atelierTint=tint;shader.fragmentShader='uniform float atelierActive;uniform float atelierTime;uniform vec3 atelierTint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float axis=vMapUv.y*.72+vMapUv.x*.28;
   float sweep=pow(.5+.5*cos(6.283185*(axis-atelierTime/8.)),18.);
   float pulse=pow(.5+.5*sin(6.283185*(atelierTime/6.-vMapUv.y*.45+vMapUv.x*.18)),3.);
   float finish=texture2D(metalnessMap,vMetalnessMapUv).r;
   totalEmissiveRadiance+=atelierActive*atelierTint*finish*(.025+.5*${mode===1?'pulse':'sweep'});`);};
  material.customProgramCacheKey=()=>`atelier-sleeve-${mode}`;
  material.onBeforeRender=()=>{active.value=material.userData.atelierResting?0:1;time.value=phases.get(theme.id)??performance.now()/1000;};
 }
 return material;
}
/** The DOM draw back keeps native card text sharp. Foil is attached to that same
 * rigid plane, and is driven by the shared phase instead of restarting per draw. */
export function decorateDrawBack(back:HTMLElement,url:string){
 const theme=themeFromUrl(url);if(!theme)return()=>{};back.dataset.atelierSleeve=theme.id;
 const finish=document.createElement('div');finish.style.cssText='position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden';back.append(finish);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 return (now=performance.now(),tilt=0)=>{const phase=reduced.matches?0:(phases.get(theme.id)??now/1000),axis=theme.motion==='emissive_pulse'?50+22*Math.sin(phase*Math.PI/3):((phase/8)%1)*160-30;
 finish.style.background=theme.motion?`linear-gradient(${105+tilt*.3}deg,transparent ${axis-16}%,${theme.accent}77 ${axis}%,transparent ${axis+12}%)`:`linear-gradient(${110+tilt*.5}deg,transparent 20%,#ffffff25 46%,transparent 62%)`;
 finish.style.boxShadow=`inset 0 0 0 1px ${theme.metal}99,inset 0 0 5px ${theme.body}55`;finish.style.maskImage=`url(/cosmetics/atelier-v1/${theme.id}/finish-mask.svg)`;finish.style.maskSize='100% 100%';};
}
