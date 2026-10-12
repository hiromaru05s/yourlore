import * as T from 'three';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {Pass} from 'three/examples/jsm/postprocessing/Pass.js';
const transparent=(o:T.Object3D)=>o instanceof T.Sprite||o instanceof T.Points||o instanceof T.Mesh&&(Array.isArray(o.material)?o.material.some(m=>m.transparent):o.material.transparent);
function without(scene:T.Scene,predicate:(o:T.Object3D)=>boolean,render:()=>void){
 const hidden:T.Object3D[]=[];scene.traverse(o=>{if(o.visible&&predicate(o)){hidden.push(o);o.visible=false}});
 try{render()}finally{hidden.forEach(o=>o.visible=true)}
}
/** Apply contact shading only to solid surfaces, before light and reward layers. */
export class OpaqueScenePass extends RenderPass{
 override render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget,delta=0,mask=false){without(this.scene,transparent,()=>super.render(renderer,write,read,delta,mask))}
}
export class ContactShadowPass extends SSAOPass{
 constructor(scene:T.Scene,camera:T.PerspectiveCamera){super(scene,camera,512,512,16);this.kernelRadius=.55;this.minDistance=.0002;this.maxDistance=.018;}
 override setSize(w:number,h:number){super.setSize(Math.round(w*.65),Math.round(h*.65))}
 override render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget,delta=0,mask=false){without(this.scene,transparent,()=>super.render(renderer,write,read,delta,mask))}
}
/** Keep the opaque depth buffer, so light remains occluded by real book geometry. */
export class TransparentScenePass extends Pass{
 constructor(public scene:T.Scene,public camera:T.Camera){super();this.needsSwap=false;}
 override render(renderer:T.WebGLRenderer,_write:T.WebGLRenderTarget,read:T.WebGLRenderTarget){
  const clear=renderer.autoClear,background=this.scene.background,shadows=renderer.shadowMap.autoUpdate;
  renderer.autoClear=false;this.scene.background=null;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(read);
  try{without(this.scene,o=>(o instanceof T.Mesh||o instanceof T.Sprite||o instanceof T.Points)&&!transparent(o),()=>renderer.render(this.scene,this.camera))}
  finally{renderer.autoClear=clear;this.scene.background=background;renderer.shadowMap.autoUpdate=shadows}
 }
}
