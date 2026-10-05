import * as T from 'three';
import {makeFrameMask} from './mask';
import {EdgeBloom} from './bloom';
import {frameVertex,frameFragment} from './shader';
export interface FrameScene{draw(ms:number,reduced:boolean):void;dispose():void;}
/** A child canvas inherits the native card's pose; its face is never replaced. */
export async function createFrameScene(card:HTMLElement):Promise<FrameScene>{
 const mask=await makeFrameMask(card);
 let renderer:T.WebGLRenderer|undefined,bloom:EdgeBloom|undefined,mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>|undefined;
 let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;renderer?.domElement.remove();mesh?.geometry.dispose();mesh?.material.dispose();mask.dispose();bloom?.dispose();renderer?.dispose();renderer?.forceContextLoss();};
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  const canvas=renderer.domElement;canvas.className='spell-frame-resonance';canvas.dataset.variant='03';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:-5%;width:110%;height:110%;z-index:8;pointer-events:none;border-radius:0;';
  renderer.setSize(Math.max(1,card.offsetWidth*1.1),Math.max(1,card.offsetHeight*1.1),false);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-.88,.88,1.375,-1.375,.1,10);camera.position.z=1;
  mesh=new T.Mesh(new T.PlaneGeometry(1.76,2.75),new T.ShaderMaterial({vertexShader:frameVertex,fragmentShader:frameFragment,uniforms:{frameMask:{value:mask},time:{value:0},reduced:{value:0}},transparent:true,depthWrite:false}));scene.add(mesh);bloom=new EdgeBloom();renderer.compile(scene,camera);
  card.appendChild(canvas);
  const r=renderer,m=mesh,b=bloom;
  return {draw(ms,reduced){if(disposed)return;m.material.uniforms.time.value=ms/1000;m.material.uniforms.reduced.value=reduced?1:0;b.begin(r);r.render(scene,camera);b.end(r);canvas.dataset.time=String(Math.round(ms));canvas.dataset.phase=ms<750?'ignition':ms<1500?'spread':'settle';},dispose};
 }catch(error){dispose();throw error;}
}
