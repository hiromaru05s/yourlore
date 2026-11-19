import * as THREE from 'three';
import {createWebGLRenderer} from '../webglRenderer';
import {createFringeLayers} from './fringeMatte';

export const DUEL_WIND_SECONDS=2.4;
import {duelWindKey,duelWindRoot,duelWindPoster} from './windAssets';
export {duelWindKey,duelWindRoot,duelWindPoster,DUEL_WIND_BACKGROUND} from './windAssets';

/** The GIF baker and live opening share these exact wind fields and clock. */
export function createDuelWind(){
 const images=new Map<string,HTMLImageElement>(),textures=new Map<string,THREE.Texture>();
 let renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene,camera:THREE.Camera,material:THREE.ShaderMaterial,mesh:THREE.Mesh;
 let disposed=false;
 async function load(avatars:readonly (string|null)[]){
  const keys=[...new Set(avatars.map(duelWindKey).filter((key):key is 'lumi'|'seeker'|'noel'|'vera'=>key!==null))];
  const layers:string[]=[...keys,...keys.filter(key=>key!=='seeker').map(key=>key+'-forehead'),...keys.filter(key=>key==='noel'||key==='vera').map(key=>key+'-fringe')];
  await Promise.all(layers.map(async key=>{
   const img=new Image();img.src=key.includes('-')?`${duelWindRoot(key.split('-')[0])}/${key}.png`:duelWindPoster(key);
   try{await img.decode();if(disposed)return;images.set(key,img);const tex=new THREE.Texture(img);tex.colorSpace=THREE.NoColorSpace;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=false;tex.premultiplyAlpha=key.endsWith('-fringe');tex.needsUpdate=true;textures.set(key,tex);}catch{/* Existing adopted portrait remains a fallback. */}
  }));
  if(disposed||!textures.size)return;
  const lumi=images.get('lumi');
  if(lumi){const layers=createFringeLayers(lumi);for(const [key,canvas] of [['lumi-matte',layers.matte],['lumi-fringe',layers.foreground]] as const){const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.NoColorSpace;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=false;tex.premultiplyAlpha=key==='lumi-fringe';textures.set(key,tex);}}

  try{
   renderer=createWebGLRenderer({alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
   renderer.setPixelRatio(1);renderer.setSize(896,896,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
   scene=new THREE.Scene();camera=new THREE.Camera();
   material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,
    uniforms:{uImage:{value:null},uUnder:{value:null},uMatte:{value:null},uFringe:{value:null},uForeheadReady:{value:0},uTime:{value:0},uLumi:{value:0},uKind:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`
     precision highp float;varying vec2 vUv;uniform sampler2D uImage,uUnder,uMatte,uFringe;uniform float uTime,uLumi,uForeheadReady,uKind;
     // Source-art boundaries follow the free cape only. Everything to their right
     // (head, shoulder attachment, torso, sleeves, gloves and book) is immutable.
     float clothEdge(float y){
      // Noel's sleeve starts farther left; Vera's cape ends above her gloves.
      if(uKind>1.5){
       if(uKind<2.5)return mix(.29,.17,smoothstep(.53,.87,y));
       return mix(mix(.38,.43,smoothstep(.49,.62,y)),.18,smoothstep(.70,.86,y));
      }
      float seeker=.32;
      seeker=mix(seeker,.48,smoothstep(.42,.52,y));
      seeker=mix(seeker,.31,smoothstep(.52,.67,y));
      seeker=mix(seeker,.22,smoothstep(.67,.79,y));
      seeker=mix(seeker,.16,smoothstep(.86,.98,y));
      float lumi=.32;
      lumi=mix(lumi,.46,smoothstep(.44,.56,y));
      lumi=mix(lumi,.31,smoothstep(.56,.72,y));
      lumi=mix(lumi,.22,smoothstep(.72,.84,y));
      lumi=mix(lumi,.12,smoothstep(.87,.96,y));
      return mix(seeker,lumi,uLumi);
     }
     float freeCloth(vec2 p){
      return (1.-smoothstep(clothEdge(p.y)-.18,clothEdge(p.y),p.x))
       *smoothstep(.39,.50,p.y)*(1.-smoothstep(.94,1.02,p.y));
     }
     float hairTips(vec2 p){
      if(uKind>1.5){
       float endY=uKind<2.5?.40:.48;
       float edge=uKind<2.5?(.64-.12*smoothstep(.14,.25,p.y)):(.66-.10*smoothstep(.18,.30,p.y));
       return (1.-smoothstep(.30,edge,p.x))*smoothstep(.015,.09,p.y)*(1.-smoothstep(endY-.09,endY,p.y));
      }
      // Only the locks and ribbon behind the head. Scalp, ear and face are anchored.
      float rootEdge=.59-.07*smoothstep(.20,.29,p.y);
      return (1.-smoothstep(.27,rootEdge,p.x))*smoothstep(.035,.13,p.y)
       *(1.-smoothstep(.33,.43,p.y))*uLumi;
     }
     float looseHood(vec2 p){
      if(uKind>1.5)return 0.;
      // Back fabric and crown folds yield slightly; the dark aperture and front rim stay rigid.
      float edge=.72-.19*smoothstep(.10,.30,p.y);
      return (1.-smoothstep(edge-.17,edge,p.x))*smoothstep(.025,.085,p.y)
       *(1.-smoothstep(.30,.43,p.y))*(1.-uLumi);
     }
     void main(){
      float phase=uTime*6.28318530718/${DUEL_WIND_SECONDS};
      vec2 p=(vec2(vUv.x,1.-vUv.y)-.5)/.88+.5;
      // No whole-image rotation, translation, breathing or sleeve warp.
      // A broad vertical fold travels toward the loose left edge, anchored at the shoulder.
      float weight=freeCloth(p);
      float wave=(.031*sin(phase*2.+p.x*7.-p.y*2.)+.007*sin(phase*3.+p.x*11.+p.y*2.))
       *(.85+.15*sin(phase-.4));
      vec2 source=p-vec2(0.,weight*wave);
      // Guard the source as well: the wave must never pull a fixed arm into the cape.
      float sourceWeight=freeCloth(source);
      source=p-vec2(0.,min(weight,sourceWeight)*wave);
      // Faster delayed motion at the hair's free ends conveys headwind resistance.
      float hair=hairTips(p);
      vec2 hairWave=vec2(.008*sin(phase*2.+p.x*5.),
       .024*sin(phase*3.+p.x*7.-p.y*2.)+.006*sin(phase*5.+p.x*10.))*(.80+.20*sin(phase));
      vec2 hairSource=p-hair*hairWave;
      source-=min(hair,hairTips(hairSource))*hairWave;
      // Stiffer, heavier hood: small folds travel through cloth without collapsing head volume.
      float hood=looseHood(p);
      vec2 hoodWave=vec2(.0055*sin(phase*2.+p.y*5.),
       .014*sin(phase*2.+p.x*6.)+.004*sin(phase*3.+p.x*9.));
      vec2 hoodSource=p-hood*hoodWave;
      source-=min(hood,looseHood(hoodSource))*hoodWave;
      if(any(lessThan(source,vec2(0.)))||any(greaterThan(source,vec2(1.)))){gl_FragColor=vec4(0.);return;}
      vec4 color=texture2D(uImage,vec2(source.x,1.-source.y));
      if(uLumi>.5&&uForeheadReady>.5){
       vec4 under=texture2D(uUnder,vec2(p.x,1.-p.y));
       vec2 oldMatte=texture2D(uMatte,vec2(p.x,1.-p.y)).rg;

       float frontPhase=phase*3.-(p.y-.17)*7.;
       float bend=smoothstep(.18,.315,p.y)*smoothstep(.715,.75,p.x)*(1.-smoothstep(.795,.82,p.x));
       if(bend>.000001){
       color=mix(color,under,oldMatte.g);
       vec2 q=p+bend*vec2(.005+.004*sin(frontPhase),.0025+.002*sin(frontPhase-.65));
       vec4 lock=texture2D(uFringe,vec2(q.x,1.-q.y));
       // Premultiplied foreground over a stationary forehead: no additive RGB or skin-coloured halo.
       color.rgb=lock.rgb+color.rgb*(1.-lock.a);
       }
      }
      if(uKind>1.5&&uForeheadReady>.5){
       // Registered, authored hair layers preserve every painted tip and dark contour.
       // The stationary clean forehead replaces the entire old lock, not colour-keyed fragments.
       float area=smoothstep(uKind<2.5?.70:.67,uKind<2.5?.73:.705,p.x)*(1.-smoothstep(.807,.825,p.x))
         *smoothstep(.20,.245,p.y)*(1.-smoothstep(uKind<2.5?.35:.40,uKind<2.5?.375:.42,p.y));
       vec4 clean=texture2D(uUnder,vec2(p.x,1.-p.y));
       float bend=smoothstep(.18,.33,p.y)*smoothstep(.69,.74,p.x)*(1.-smoothstep(.822,.844,p.x));
       float f=phase*3.-p.y*7.;
       vec2 q=p+bend*vec2(.004+.004*sin(f),.002+.002*sin(f-.65));
       vec4 fringe=texture2D(uFringe,vec2(q.x,1.-q.y));
       float alpha=fringe.a+clean.a*(1.-fringe.a);
       vec4 composed=vec4((fringe.rgb+clean.rgb*clean.a*(1.-fringe.a))/max(alpha,.00001),alpha);
       color=mix(color,composed,area);
      }
      gl_FragColor=color;
     }`});
   mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
  }catch{renderer?.dispose();renderer=undefined;}
 }
 function frame(avatar:string|null|undefined,seconds:number,reduced=false):HTMLCanvasElement|HTMLImageElement|null{
  const key=duelWindKey(avatar);if(!key)return null;
  const img=images.get(key);if(!img)return null;
  if(!renderer)return img;
  material.uniforms.uImage.value=textures.get(key);material.uniforms.uTime.value=reduced?0:Math.max(0,seconds)%DUEL_WIND_SECONDS;
  material.uniforms.uUnder.value=textures.get(key+'-forehead')??textures.get(key);
  material.uniforms.uMatte.value=textures.get(key+'-matte')??textures.get(key);
  material.uniforms.uFringe.value=textures.get(key+'-fringe')??textures.get(key);
  material.uniforms.uForeheadReady.value=textures.has(key+'-forehead')&&(key==='lumi'||textures.has(key+'-fringe'))?1:0;
  material.uniforms.uKind.value=key==='noel'?2:key==='vera'?3:key==='lumi'?1:0;
  material.uniforms.uLumi.value=key==='lumi'?1:0;renderer.domElement.dataset.duelPortrait=key;renderer.render(scene,camera);return renderer.domElement;
 }
 function dispose(){disposed=true;for(const tex of textures.values())tex.dispose();textures.clear();images.clear();if(renderer){mesh?.geometry.dispose();material?.dispose();renderer.dispose();renderer.forceContextLoss();renderer=undefined;}}
 return {load,frame,dispose};
}
