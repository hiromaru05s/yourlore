import {assetBatch} from './assetBatch';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {ease} from './kinematics';
export type RewardKind='sleeve'|'furniture'|'avatar'|'mixed';
type Shape=Exclude<RewardKind,'mixed'>;
export const rewardLabels:Record<RewardKind,string>={sleeve:'スリーブ',furniture:'墓地＆デッキ置き場',avatar:'キャラクターアバター',mixed:'すべての種類'};
const assets=['/cosmetics/v2/sleeve-ivory.webp','/cosmetics/v2/sleeve-astral.webp','/cosmetics/v2/sleeve-verdant.webp','/frames/sleeve_compass.webp','/frames/sleeve_prism.webp','/cosmetics/v2/sleeve-crimson.webp',new URL('./assets/avatar-red.png',import.meta.url).href,new URL('./assets/avatar-blue.png',import.meta.url).href];
const field=`float field=variant<.5?p.y*.72+abs(p.x-.5)*.36:variant<1.5?1.-max(abs(p.x-.5)*2.,abs(p.y-.5)*2.):abs(p.x-.5)*1.8;
 float boundary=1.-smoothstep(reveal-.05,reveal+.02,field);
 if(boundary<.002)discard;
 float rim=exp(-pow((field-reveal)*29.,2.))*step(.001,reveal)*(1.-smoothstep(.95,1.08,reveal));`;
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`varying vec2 vUv;uniform sampler2D art;uniform float reveal,charge,variant,portrait;
void main(){
 vec2 p=vUv,b=abs(vUv-.5)-vec2(.467,.477);float edge=portrait>.5?length(vUv-.5)-.486:length(max(b,0.))-.021;
 if(edge>0.)discard;
 ${field}
 // Portrait atlas has two expressions. Use only the approved idle half.
 vec2 uv=portrait>.5?vec2(vUv.x*.5,vUv.y):vUv;
 vec3 color=pow(texture2D(art,uv).rgb,vec3(2.2));
 float trim=smoothstep(-.015,-.006,edge);
 if(portrait>.5)color=mix(color,vec3(.51,.40,.23),trim);
 color=mix(color,vec3(.28,.71,1.)*3.,rim*.8);
 gl_FragColor=vec4(color+vec3(.13,.53,.88)*charge*(.12+trim*2.),boundary);
}`;
interface Item {root:T.Group;sleeve:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;avatar:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;furniture:T.Group}
export class Rewards{
 root=new T.Group();items:Item[]=[];ready:Promise<void>;kind:RewardKind='sleeve';featured='ivory';
 cardTextures:T.Texture[]=[];
 uniforms={reveal:{value:0},charge:{value:0},variant:{value:0}};textures:T.Texture[]=[];furnitureAspect=1.45;
 constructor(scene:T.Scene){
  scene.add(this.root);
  this.ready=assetBatch([assetBatch(assets.map(url=>new T.TextureLoader().loadAsync(url))),new GLTFLoader().loadAsync('/models/reading-board/v1/deck-place.glb'),new GLTFLoader().loadAsync('/models/reading-board/v1/shelf.glb')]).then(([textures,deck,grave])=>{
   this.textures=textures;textures.forEach(t=>{t.colorSpace=T.NoColorSpace;t.anisotropy=8});
   // Reuse the actual board furniture, with its depth, cloth, wood, feet and metal trim.
   const assembly=new T.Group();deck.scene.position.set(-.087,0,.023);grave.scene.position.set(.093,.014,-.024);assembly.add(deck.scene,grave.scene);assembly.rotation.set(.91,-.25,-.08);assembly.updateMatrixWorld(true);
   const bounds=new T.Box3().setFromObject(assembly),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());this.furnitureAspect=size.x/size.y;
   const model=new T.Group();assembly.traverse(o=>{
    if(!(o instanceof T.Mesh))return;
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-center.y,-center.z);geo.scale(1/size.x,1/size.x,1/size.x);
    const makeMaterial=(source:T.MeshStandardMaterial)=>{
     const mat=source.clone();mat.transparent=true;
     mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 rewardPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nrewardPosition=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 rewardPosition;uniform float reveal,charge,variant;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nvec2 p=vec2(rewardPosition.x+.5,rewardPosition.y*${this.furnitureAspect.toFixed(8)}+.5);${field}`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.18,.65,1.)*(rim*3.5+charge*.10);diffuseColor.a*=boundary;');
     };mat.customProgramCacheKey=()=>`gacha-furniture-${this.furnitureAspect}`;return mat;
    };
    const mesh=new T.Mesh(geo,Array.isArray(o.material)?o.material.map(makeMaterial):makeMaterial(o.material));model.add(mesh);
   });
   for(let i=0;i<10;i++){
    const plane=(portrait:boolean)=>new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,uniforms:{...this.uniforms,art:{value:textures[portrait?6+i%2:i%6]},portrait:{value:portrait?1:0}}}));
    const root=new T.Group(),sleeve=plane(false),avatar=plane(true),furniture=model.clone(true);root.add(sleeve,avatar,furniture);this.root.add(root);this.items.push({root,sleeve,avatar,furniture});
   }
   // The loaded sources are temporary; baked geometries are owned by the scene.
   assembly.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}});
  });
 }
 kindAt(i:number):Shape{return this.kind==='mixed'?(['furniture','avatar','sleeve'] as Shape[])[i%3]:this.kind}
 aspect(kind:Shape){return kind==='sleeve'?.70:kind==='avatar'?1:this.furnitureAspect}
 size(frameW:number,frameH:number,kind=this.kindAt(0)) {const aspect=this.aspect(kind),height=Math.min(frameH*.64,frameW*.75/aspect);return {width:height*aspect,height}}
 pose(i:number,seconds:number,frameW:number,frameH:number,count:number,reduced=false){
  const kind=this.kindAt(i),aspect=this.aspect(kind),base=this.size(frameW,frameH,kind);
  if(count!==10)return {width:base.width,height:base.height,x:0,y:0};
  // The light divides before solid forms appear, so unlike shapes never overlap as a stack.
  const cols=frameW/frameH<.8?2:5,rows=10/cols;
  const fan=reduced?1:ease(14.75,16.10,seconds),cellW=frameW*.86/cols,cellH=frameH*.68/rows;
  const h=Math.min(cellH*.90,cellW*.90/aspect);
  return {width:T.MathUtils.lerp(base.width,h*aspect,fan),height:T.MathUtils.lerp(base.height,h,fan),x:(i%cols-(cols-1)/2)*cellW*fan,y:((rows-1)/2-Math.floor(i/cols))*cellH*fan};
 }
 render(seconds:number,variant:number,camera:T.Camera,end:T.Vector3,right:T.Vector3,up:T.Vector3,front:T.Vector3,frameW:number,frameH:number,count:number,rarity:string,reveal:number,charge:number,reduced:boolean){
  this.uniforms.reveal.value=reveal;this.uniforms.charge.value=charge;this.uniforms.variant.value=variant;

  const picks=rarity==='R'?[3,4,3,4,3,4,3,4,3,4]:rarity==='SR'?[2,5,3,4,2,3,4,5,3,4]:[0,1,2,3,4,5,3,2,4,1];
  if(rarity==='SSR')picks[0]=Math.max(0,['ivory','astral','verdant','compass','prism','crimson'].indexOf(this.featured));
  for(let i=0;i<this.items.length;i++){
   const {root,sleeve,avatar,furniture}=this.items[i],kind=this.kindAt(i);
   root.visible=i<count&&reveal>0;if(!root.visible)continue;
   sleeve.visible=kind==='sleeve';avatar.visible=kind==='avatar';furniture.visible=kind==='furniture';sleeve.material.uniforms.art.value=this.cardTextures[i]??this.textures[picks[i]];
   const pose=this.pose(i,seconds,frameW,frameH,count,reduced),w=pose.width,h=pose.height;
   root.position.copy(end).addScaledVector(right,pose.x).addScaledVector(up,pose.y).addScaledVector(front,-.006*i);root.quaternion.copy(camera.quaternion);
   sleeve.scale.set(w,h,1);avatar.scale.set(w,h,1);furniture.scale.setScalar(w);
   // A small settling turn lets the furniture's thickness read, without spinning portraits.
   furniture.rotation.y=(1-ease(16.4,18.4,seconds))*.20;
  }
 }
}
