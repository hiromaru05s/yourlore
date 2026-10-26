import * as T from 'three';

/** Approved 01 ivory highlight, on the authored metal rails only. */
export function createRiftFrameHighlight(root:HTMLElement,model:T.Group){
 const strength={value:new T.Vector2()};
 const originals:Array<{mesh:T.Mesh;material:T.Material|T.Material[];clones:T.Material[]}>=[];
 model.traverse(node=>{
  if(!(node instanceof T.Mesh))return;
  const materials=Array.isArray(node.material)?node.material:[node.material];
  if(!materials.some(m=>/WarmSilver|ChampagneBrass/.test(m.name)))return;
  const replacements=materials.map(material=>{
   if(!(material instanceof T.MeshStandardMaterial)||!/WarmSilver|ChampagneBrass/.test(material.name))return material;
   const clone=material.clone(),brass=/ChampagneBrass/.test(material.name);
   clone.onBeforeCompile=shader=>{
    shader.uniforms.riftFrameStrength=strength;
    shader.vertexShader='varying vec3 riftFrameLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nriftFrameLocal=position;');
    shader.fragmentShader='varying vec3 riftFrameLocal; uniform vec2 riftFrameStrength;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     float rz=abs(riftFrameLocal.z);
     // The GLB combines all board metal. Its rail vertices are in this meter-space region.
     // The brass height excludes the perimeter trim and the lower mounting plates.
     float region=step(.640,riftFrameLocal.x)*step(riftFrameLocal.x,.785)*step(.052,rz)*step(rz,.416)*step(${brass?'.021':'.010'},riftFrameLocal.y)*step(riftFrameLocal.y,.030);
     float amount=(riftFrameLocal.z>0.?riftFrameStrength.x:riftFrameStrength.y)*region;
     vec3 tint=vec3(1.,.88,.66);
     float edgeLight=.62+.38*pow(1.-abs(normal.z),1.5);
     diffuseColor.rgb=mix(diffuseColor.rgb,tint,amount*.13);
     totalEmissiveRadiance+=tint*amount*.53*edgeLight;
    `);
   };
   clone.customProgramCacheKey=()=>`rift-frame-ivory-v1-${brass}`;
   return clone;
  });
  originals.push({mesh:node,material:node.material,clones:replacements.filter((m,i)=>m!==materials[i])});
  node.material=Array.isArray(node.material)?replacements:replacements[0];
 });
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let last=0,disposed=false;
 return {
  tick(now:number):boolean{
   if(disposed)return false;
   const dt=Math.min(.05,last?Math.max(0,(now-last)/1000):1/60);last=now;let changed=false;
   for(const [index,side]of ['me','opp'].entries()){
    const element=root.querySelector<HTMLElement>('#rift-'+side);
    const active=!!element&&(element.matches(':hover')||element.matches(':focus-visible'));
    const previous=strength.value.getComponent(index),target=Number(active);
    let value=reduced.matches?target:T.MathUtils.damp(previous,target,active?14:9,dt);
    if(Math.abs(value-target)<.001)value=target;
    if(value!==previous){changed=true;strength.value.setComponent(index,value);}
   }
   return changed;
  },
  dispose(){
   if(disposed)return;disposed=true;
   for(const entry of originals){entry.mesh.material=entry.material;entry.clones.forEach(material=>material.dispose());}
  },
 };
}
