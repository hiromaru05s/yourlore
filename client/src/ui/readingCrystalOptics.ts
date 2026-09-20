/** Small bounded optical pass for the authored gemstone, not a scene ray tracer.
 * The hull planes come from Blender. Six internal bounces preserve the changing
 * pavilion reflections missing from glTF's ordinary screen-space transmission.
 * Standard glTF materials remain intact for other viewers. Requires PMREM IBL.
 */
import * as THREE from 'three';
export function addCrystalOptics(material:THREE.MeshPhysicalMaterial,cut:{planes:number[][];center:number[];scale:number}) {
  const count=cut.planes.length,planes=cut.planes.map(p=>new THREE.Vector4(p[0],p[1],p[2],p[3]));
  material.envMapIntensity=1.6;
  material.userData.opticalCut={planes:count,bounces:6};
  material.onBeforeCompile=shader=>{
    shader.uniforms.crystalPlanes={value:planes};
    const varyings=`varying vec3 vCrystalLocal; varying vec3 vCrystalEye; varying vec3 vCrystalNormal; varying mat3 vCrystalBasis; varying float vCrystalScale;`;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+varyings).replace('#include <begin_vertex>',`#include <begin_vertex>
      mat4 crystalTransform=modelMatrix;
      #ifdef USE_INSTANCING
        crystalTransform*=instanceMatrix;
      #endif
      vCrystalBasis=mat3(crystalTransform);
      vCrystalScale=length(crystalTransform[0].xyz);
      vCrystalLocal=(position-vec3(${cut.center.join(',')}))/${cut.scale};
      vCrystalEye=((inverse(crystalTransform)*vec4(cameraPosition,1.0)).xyz-vec3(${cut.center.join(',')}))/${cut.scale};
      vCrystalNormal=normal;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+varyings+`\nuniform vec4 crystalPlanes[${count}];`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_pars_fragment>',`#include <transmission_pars_fragment>
      #if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV) && defined(USE_TRANSMISSION)
      vec3 crystalEnvironment(vec3 ray,float blur){
        vec3 direction=envMapRotation*normalize(vCrystalBasis*ray);
        return textureCubeUV(envMap,direction,blur).rgb*envMapIntensity;
      }
      vec3 traceCrystal(vec3 origin,vec3 incident,vec3 normalLocal){
        float ratio=ior;
        vec3 ray=refract(incident,normalLocal,1.0/ratio);
        vec3 pos=origin+ray*0.0003;
        vec3 throughput=vec3(1.0),radiance=vec3(0.0);
        float f0=pow((ratio-1.0)/(ratio+1.0),2.0);
        for(int bounce=0;bounce<6;bounce++){
          float distance=1000.0;vec3 exitNormal=vec3(0,1,0);
          for(int facet=0;facet<${count};facet++){
            vec4 p=crystalPlanes[facet];float alignment=dot(p.xyz,ray);
            if(alignment>0.00001){
              float d=(p.w-dot(p.xyz,pos))/alignment;
              if(d>0.00001&&d<distance){distance=d;exitNormal=p.xyz;}
            }
          }
          if(distance>900.0)break;
          float worldDistance=distance*${cut.scale}*vCrystalScale;
          throughput*=pow(max(attenuationColor,vec3(0.001)),vec3(worldDistance/max(attenuationDistance,0.001)));
          pos+=ray*distance;
          vec3 escaped=refract(ray,-exitNormal,ratio);
          float fresnel=f0+(1.0-f0)*pow(1.0-abs(dot(ray,exitNormal)),5.0);
          if(dot(escaped,escaped)>0.001){
            radiance+=throughput*(1.0-fresnel)*crystalEnvironment(escaped,roughness);
            throughput*=fresnel;
          }
          if(max(throughput.r,max(throughput.g,throughput.b))<0.005)break;
          ray=reflect(ray,exitNormal);pos+=ray*0.0003;
        }
        return radiance;
      }
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',`#include <transmission_fragment>
      #if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV) && defined(USE_TRANSMISSION)
        vec3 crystalIncident=normalize(vCrystalLocal-vCrystalEye);
        vec3 crystalNormal=normalize(vCrystalNormal);
        if(dot(crystalNormal,crystalIncident)>0.0)crystalNormal=-crystalNormal;
        vec3 optical=traceCrystal(vCrystalLocal,crystalIncident,crystalNormal);
        totalDiffuse=mix(totalDiffuse,optical*sqrt(diffuseColor.rgb),transmission);
      #endif
    `);
  };
  material.customProgramCacheKey=()=>`lore-crystal-cut-v2-${count}`;
}
