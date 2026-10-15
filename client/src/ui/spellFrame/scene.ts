import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {makeFrameMask} from './mask';
import {EdgeBloom} from './bloom';
import {frameVertex,frameFragment} from './shader';
export interface FrameScene{draw(ms:number,reduced:boolean):void;dispose():void;}
type Slot={renderer:T.WebGLRenderer;scene:T.Scene;camera:T.OrthographicCamera;mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;bloom:EdgeBloom;ready:Promise<void>;timer?:ReturnType<typeof setTimeout>};
// One idle context retains compiled programs; simultaneous casts own separate slots.
// Masks never belong to the pool. They are released at the end of each cast.
const idle:Slot[]=[];
function destroy(slot:Slot){clearTimeout(slot.timer);slot.renderer.domElement.remove();slot.mesh.geometry.dispose();slot.mesh.material.dispose();slot.bloom.dispose();slot.renderer.dispose();slot.renderer.forceContextLoss();}
function create():Slot{
 const renderer=createWebGLRenderer({alpha:true,antialias:true});renderer.debug.checkShaderErrors=import.meta.env?.DEV??true;renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 const canvas=renderer.domElement;canvas.className='spell-frame-resonance';canvas.dataset.variant='03';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:-5%;width:110%;height:110%;z-index:8;pointer-events:none;border-radius:0;';renderer.setSize(64,100,false);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-.88,.88,1.375,-1.375,.1,10);camera.position.z=1;
 const mesh=new T.Mesh(new T.PlaneGeometry(1.76,2.75),new T.ShaderMaterial({vertexShader:frameVertex,fragmentShader:frameFragment,uniforms:{frameMask:{value:null},time:{value:0},reduced:{value:0}},transparent:true,depthWrite:false}));scene.add(mesh);const bloom=new EdgeBloom();
 const slot:Slot={renderer,scene,camera,mesh,bloom,ready:Promise.resolve()};
 slot.ready=(async()=>{renderer.setRenderTarget(bloom.target);await renderer.compileAsync(scene,camera);renderer.setRenderTarget(null);await bloom.prepare(renderer);bloom.begin(renderer);renderer.render(scene,camera);bloom.end(renderer);})();
 return slot;
}
function acquire(){let slot:Slot|undefined;while((slot=idle.pop())){clearTimeout(slot.timer);if(!slot.renderer.getContext().isContextLost())return slot;destroy(slot);}return create();}
function release(slot:Slot){slot.renderer.domElement.remove();slot.mesh.material.uniforms.frameMask.value=null;if(idle.length||slot.renderer.getContext().isContextLost()){destroy(slot);return;}idle.push(slot);slot.timer=setTimeout(()=>{const i=idle.indexOf(slot);if(i>=0){idle.splice(i,1);destroy(slot);}},30000);}
/** Compile under the duel loading cover, before any card's authored clock starts. */
export async function prepareFrameRenderer():Promise<void>{const slot=acquire();try{await slot.ready;release(slot);}catch(error){destroy(slot);throw error;}}
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{idle.splice(0).forEach(destroy);});
/** A child canvas inherits the native card's pose; its face is never replaced. */
export async function createFrameScene(card:HTMLElement):Promise<FrameScene>{
 const mask=await makeFrameMask(card);let slot:Slot;
 try{slot=acquire();}catch(error){mask.dispose();throw error;}
 let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;mask.dispose();release(slot);};
 try{
  await slot.ready;const {renderer:r,mesh:m,bloom:b,scene,camera}=slot;
  r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setSize(Math.max(1,card.offsetWidth*1.1),Math.max(1,card.offsetHeight*1.1),false);
  m.material.uniforms.frameMask.value=mask;m.material.uniforms.time.value=0;m.material.uniforms.reduced.value=0;
  // Upload the actual stencil/targets before exposing this cast's canvas.
  b.begin(r);r.render(scene,camera);b.end(r);const canvas=r.domElement;card.appendChild(canvas);
  return {draw(ms,reduced){if(disposed)return;m.material.uniforms.time.value=ms/1000;m.material.uniforms.reduced.value=reduced?1:0;b.begin(r);r.render(scene,camera);b.end(r);canvas.dataset.time=String(Math.round(ms));canvas.dataset.phase=ms<750?'ignition':ms<1500?'spread':'settle';},dispose};
 }catch(error){disposed=true;mask.dispose();destroy(slot);throw error;}
}
