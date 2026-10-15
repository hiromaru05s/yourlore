import * as T from 'three';
import {createWebGLRenderer} from '../../webglRenderer';
import {gachaFromUrl,type GachaVariant} from '../../../shared/gachaCosmetics';
import {animatedMaterial} from './materials';
import './sleeves.css';
/** Share one offscreen renderer per board. Native hand and draw transforms own
 * the card; the animated surface remains inside its fixed, readable outline. */
export function createDomSleeves(root:HTMLElement){
 let renderer:T.WebGLRenderer|undefined;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-.5,.5,.5,-.5,.1,10);camera.position.z=1;
 const geometry=new T.PlaneGeometry(1,1),materials=new Map<GachaVariant,T.ShaderMaterial>();
 const plane=new T.Mesh(geometry);scene.add(plane);(plane.material as T.Material).dispose();
 const painted=new WeakMap<HTMLCanvasElement,string>(),managed=new Map<HTMLElement,HTMLCanvasElement>();
 function remove(el:HTMLElement,c:HTMLCanvasElement){c.remove();el.classList.remove('gacha-trio-back');managed.delete(el);}
 return {tick(time:number){
  const targets=new Map<GachaVariant,HTMLElement[]>();
  // Flights are body-level layers. Resolve their own back URL instead of using
  // the current player's selection, so mixed equipment stays independent.
  const nodes=[...root.querySelectorAll<HTMLElement>('.card--back'),...document.querySelectorAll<HTMLElement>('.native-draw-layer .draw-stock-back,.native-draw-layer .card--back')];
  for(const el of nodes){const theme=gachaFromUrl(el.style.backgroundImage);if(!theme)continue;const list=targets.get(theme.variant)??[];list.push(el);targets.set(theme.variant,list);}
  for(const [el,c]of managed)if(!el.isConnected||!gachaFromUrl(el.style.backgroundImage))remove(el,c);
  if(!targets.size)return;
  renderer??=createWebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  if(renderer.domElement.width!==384){renderer.setSize(384,600);renderer.setPixelRatio(1);}
  for(const [v,els]of targets){
   let material=materials.get(v);if(!material){material=animatedMaterial(v);materials.set(v,material);}
   const stamp=v+':'+time;
   const dirty=els.filter(el=>!managed.has(el)||painted.get(managed.get(el)!)!==stamp);
   if(!dirty.length)continue;
   plane.material=material;material.uniforms.time.value=time;renderer.render(scene,camera);
   for(const el of dirty){let c=managed.get(el);if(!c){c=document.createElement('canvas');c.className='gacha-trio-surface';c.width=384;c.height=600;c.setAttribute('aria-hidden','true');el.classList.add('gacha-trio-back');el.append(c);managed.set(el,c);}c.getContext('2d')!.drawImage(renderer.domElement,0,0);painted.set(c,stamp);}
  }

 },dispose(){for(const [el,c]of managed)remove(el,c);geometry.dispose();materials.forEach(m=>m.dispose());renderer?.dispose();renderer?.forceContextLoss();renderer=undefined;}};
}
