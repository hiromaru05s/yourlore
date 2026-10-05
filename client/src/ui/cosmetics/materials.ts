import {dressFurniture} from './furniture';
import {setSleevePhase} from './sleeve';
import * as T from 'three';
import type {CosmeticPreviewAdapter} from '../cosmeticPreviewBridge';
import {asset,type AtelierTheme} from '../../shared/atelierThemes';
export type Wearer='self'|'opponent'|'both';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** The same two material presets are shared by every surface. Masks follow
 * actual engraved color/UV detail; nothing leaves the physical object. */
const fragment=`uniform sampler2D art;uniform sampler2D boardDepth;uniform vec2 viewport;uniform float useDepth;uniform vec3 tint;uniform float time;uniform float mode;uniform float sleeve;varying vec2 vUv;
void main(){if(useDepth>.5&&gl_FragCoord.z>texture2D(boardDepth,gl_FragCoord.xy/viewport).r+.000008)discard;vec3 tex=texture2D(art,vUv).rgb;float hi=max(tex.r,max(tex.g,tex.b)),lo=min(tex.r,min(tex.g,tex.b));
float silver=tex.r;
float ember=tex.r;
float mask=mix(tex.r,mix(silver,ember,mode),sleeve);
float axis=vUv.y*.72+vUv.x*.28;float sweep=pow(.5+.5*cos(6.283185*(axis-time/8.)),18.);
float pulse=pow(.5+.5*sin(6.283185*(time/6.-vUv.y*.45+vUv.x*.18)),3.);
float gain=mix(.025+.8*sweep,.025+.85*pulse,mode);float a=mask*gain;
if(a<.008)discard;gl_FragColor=vec4(tint,a);
#include <colorspace_fragment>
}`;
// Keep the image on horizontal upholstery. Vertical walls use a separate
// solid material, preventing the picture from stretching up the shelf lip.
function mapLining(mesh:T.Mesh,color:string){
 const geo=mesh.geometry,pos=geo.getAttribute('position'),normal=geo.getAttribute('normal'),uv=geo.getAttribute('uv');
 geo.computeBoundingBox();const box=geo.boundingBox!;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-box.min.x)/(box.max.x-box.min.x),(pos.getZ(i)-box.min.z)/(box.max.z-box.min.z));
 uv.needsUpdate=true;
 const top:number[]=[],walls:number[]=[],indices=geo.index;
 for(let i=0;i<(indices?.count??pos.count);i+=3){
  const face=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);
  (face.every(j=>Math.abs(normal.getY(j))>.7)?top:walls).push(...face);
 }
 geo.setIndex([...top,...walls]);geo.clearGroups();geo.addGroup(0,top.length,0);geo.addGroup(top.length,walls.length,1);
 // Planar UVs deliberately collapse on vertical faces; they have no normal map
 // and do not need tangent generation (which would create zero-area tangents).
 const floor=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
 mesh.material=[floor,new T.MeshStandardMaterial({name:'02_lining_wall',color,roughness:.72,metalness:.025})];
}
export function createAtelierMaterials(role:'all'|'furniture'|'sleeve'='all'):CosmeticPreviewAdapter&{
 select(theme:AtelierTheme|null,wearer:Wearer):Promise<void>;setMotion(on:boolean):void;seek(seconds:number):void;
 info():{theme:string|null;wearer:Wearer;motion:boolean;surfaces:number;phase:number;textures:number};
}{
 let theme:AtelierTheme|null=null,wearer:Wearer='self',revision=0,epoch=0,disposed=false,playing=true,seconds=0,lastTime=0,force=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),scene=new T.Scene();
 const textureFiles=role==='sleeve'?['finish-mask.svg']:['body.webp','lining.webp','inlay-mask.webp','finish-mask.svg','surface-normal.webp','surface-roughness.webp'];
 let requested=new Set<string>();
 const maps=new Map<string,T.Texture>(),pending=new Map<string,Promise<T.Texture>>();
 const overlays=new Set<{source:T.Mesh;mesh:T.Mesh;material:T.ShaderMaterial}>();
 const invalidate=()=>{force=true;window.dispatchEvent(new Event('lore:layout'));};
 async function texture(url:string){const old=maps.get(url);if(old)return old;const p=pending.get(url);if(p)return p;const next=new T.TextureLoader().loadAsync(url).then(t=>{if(disposed){t.dispose();pending.delete(url);return t;}t.colorSpace=url.includes('/surface-')?T.NoColorSpace:T.SRGBColorSpace;t.anisotropy=8;t.flipY=false;maps.set(url,t);pending.delete(url);return t;});pending.set(url,next);return next;}
 function selected(el:HTMLElement){return !!theme&&(wearer==='both'||(el.id.startsWith('pile-my')?wearer==='self':wearer==='opponent'));}
 const overlay=(source:T.Mesh,map:T.Texture,isSleeve:boolean)=>{
  const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{boardDepth:{value:null},viewport:{value:new T.Vector2()},useDepth:{value:0},art:{value:map},tint:{value:new T.Color(theme!.accent)},time:{value:seconds},mode:{value:theme!.motion==='emissive_pulse'?1:0},sleeve:{value:isSleeve?1:0}},transparent:true,blending:T.AdditiveBlending,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
  const geometry=isSleeve&&source.name!=='stock-front'?source.geometry.clone():source.geometry;if(geometry!==source.geometry)geometry.setDrawRange(0,source.geometry.groups[0]?.count??Infinity);
  const mesh=new T.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;scene.add(mesh);const entry={source,mesh,material};overlays.add(entry);return()=>{scene.remove(mesh);material.dispose();if(geometry!==source.geometry)geometry.dispose();overlays.delete(entry);};
 };
 const mediaChange=()=>{force=true;};reduced.addEventListener('change',mediaChange);
 return {
  get revision(){return revision;},
  async select(next,side){const token=++epoch;requested=new Set(next?textureFiles.map(f=>asset(next,f)):[]);if(theme?.id===next?.id&&wearer===side)return;if(next)await Promise.all([...requested].map(texture));if(disposed||token!==epoch)return;theme=next;wearer=side;revision++;seconds=performance.now()/1000;lastTime=0;invalidate();},
  setMotion(on){playing=on;lastTime=0;force=true;},seek(t){seconds=Math.max(0,t);lastTime=0;force=true;},
  info(){return{theme:theme?.id??null,wearer,motion:!!theme?.motion&&playing&&!reduced.matches,surfaces:overlays.size,phase:seconds,textures:maps.size};},
  applyFurniture(model,el){
   el.dataset.atelierMaterial=selected(el)?theme!.id:"default";
   if(!selected(el)||role==='sleeve')return;
   model.traverse(o=>{if(!(o instanceof T.Mesh))return;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(old=>{
    if(!(old instanceof T.MeshStandardMaterial))return old;
    const part=old.name.slice(0,2),body=part==='01',lining=part==='02';if(!body&&!lining&&part!=='03'&&part!=='04')return old;

    if(body||lining){const m=new T.MeshPhysicalMaterial({name:old.name,map:maps.get(asset(theme!,body?'body.webp':'lining.webp')),color:theme!.id==='porcelain'?0xc2d0d8:0xffffff,metalness:lining?.025:theme!.surface==='stone'?.14:.06,roughness:lining?.62:theme!.surface==='leather'?.8:theme!.surface==='wood'?.52:.3,clearcoat:lining?0:theme!.surface==='lacquer'||theme!.surface==='glass'?.55:.18,clearcoatRoughness:.22,roughnessMap:body?maps.get(asset(theme!,'surface-roughness.webp')):old.roughnessMap,normalMap:body?maps.get(asset(theme!,'surface-normal.webp')):old.normalMap,normalScale:new T.Vector2(.45,.45)});old.dispose();return m;}
    old.color.set(part==='03'?theme!.metal:theme!.inlay);old.roughness=part==='03'?.32:.24;old.metalness=.8;return old;
   });if(mats.length===1){o.material=(o.material as T.Material[])[0];if(o.material.name.startsWith('02'))mapLining(o,theme!.lining);}});
   dressFurniture(model,theme!,el.classList.contains('pile--shelf'));
  },
  decoratePile(pile,el){
   const removers:Array<()=>void>=[];
   if(selected(el)&&theme?.motion){
    const furniture=pile.group.children.find(n=>n!==pile.cards&&n!==pile.top&&n.type==='Group');
    if(role!=='sleeve')furniture?.traverse(o=>{if(o instanceof T.Mesh){const m=Array.isArray(o.material)?o.material[0]:o.material;if(m.name.startsWith('01'))removers.push(overlay(o,maps.get(asset(theme!,'inlay-mask.webp'))!,false));if(m.name.startsWith('02')&&o.geometry.groups.length)removers.push(overlay(o,maps.get(asset(theme!,'finish-mask.svg'))!,true));}});
    if(role!=='furniture'&&el.classList.contains('pile--deck')){const top=pile.top.getObjectByName('stock-front');if(top instanceof T.Mesh){const m=top.material as T.MeshBasicMaterial;if(m.map)removers.push(overlay(top,maps.get(asset(theme!,'finish-mask.svg'))!,true));}}
   }
   return()=>{removers.forEach(f=>f());};
  },
  tick(now){
   const active=!!theme?.motion&&playing&&!reduced.matches;
   if(lastTime&&active)seconds+=Math.min(50,now-lastTime)/1000;lastTime=now;
   if(theme)setSleevePhase(theme.id,seconds);for(const o of overlays)o.material.uniforms.time.value=seconds;
   const update=active||force;force=false;return update;
  },
  render(renderer,camera,depth){
   // Only two sets can be equipped; stale maps are released after a replacement
   // frame so no visible material still owns a disposed texture.
   const keep=new Set(theme?textureFiles.map(f=>asset(theme!,f)):[]);
   for(const[url,map]of maps)if(!keep.has(url)&&!requested.has(url)){map.dispose();maps.delete(url);}
   if(!theme?.motion||reduced.matches)return;
   for(const o of overlays){o.material.uniforms.boardDepth.value=depth??null;o.material.uniforms.useDepth.value=depth&&o.source.name!=='stock-front'?1:0;renderer.getDrawingBufferSize(o.material.uniforms.viewport.value);o.source.updateWorldMatrix(true,false);o.mesh.matrix.copy(o.source.matrixWorld);let visible=true;for(let n:T.Object3D|null=o.source;n;n=n.parent)if(!n.visible)visible=false;o.mesh.visible=visible;}
   if(depth)renderer.clearDepth();renderer.render(scene,camera);

  },
  dispose(){if(disposed)return;disposed=true;epoch++;reduced.removeEventListener('change',mediaChange);for(const o of overlays){o.material.dispose();if(o.mesh.geometry!==o.source.geometry)o.mesh.geometry.dispose();scene.remove(o.mesh);}overlays.clear();maps.forEach(m=>m.dispose());maps.clear();},
 };
}
