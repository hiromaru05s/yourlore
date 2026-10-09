import * as T from 'three';
import {makeMaterial} from './approved-material';
import {createRiftIdleMaterial} from '../../../client/src/ui/riftIdleMaterial';
import {mountRiftApertures} from '../../../client/src/ui/riftAperture';
const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
const reference=makeMaterial(2),current=createRiftIdleMaterial(),geometry=new T.PlaneGeometry(2,2),quad=new T.Mesh(geometry,current);scene.add(quad);
const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true})!;
const parent=new T.Group();let handle=mountRiftApertures(parent);const material=(parent.children[0] as T.Mesh).material as T.ShaderMaterial;
(window as any).riftQA={
 parity(){const cases=[];for(const [w,h] of [[96,160],[192,320]])for(const t of [0,.25,1,2.5,5,10,17]){
 renderer.setSize(w,h);canvas.width=w;canvas.height=h;
 const pixels=[reference,current].map(m=>{m.uniforms.time.value=t;quad.material=m;renderer.render(scene,camera);context.drawImage(renderer.domElement,0,0);return context.getImageData(0,0,w,h).data;});let sum=0,max=0;
 for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);sum+=d;max=Math.max(max,d);}cases.push({w,h,t,mae:sum/pixels[0].length,max});}return cases;},
 tick(t:number){return {changed:handle.tick(t),time:material.uniforms.time.value,meshes:parent.children.length};},
 hidden(value:boolean){Object.defineProperty(document,'hidden',{configurable:true,value});},
 dispose(){handle.dispose();handle.dispose();return {meshes:parent.children.length,changed:handle.tick(9999)};},
 cycles(){for(let i=0;i<12;i++){const h=mountRiftApertures(parent);h.tick(i*1000);h.dispose();}return parent.children.length;},
 close(){reference.dispose();current.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();}
};
