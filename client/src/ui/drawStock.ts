import {DRAW_THICKNESS_RATIO} from './cardThickness';
import * as T from 'three';
const FOCAL=1200;
const Y=new T.Matrix4().makeScale(1,-1,1);
export type StockPose={x:number;y:number;z:number;pitch:number;yaw:number;bank:number;scale:number};
/** The same camera and transform order as the native face's CSS 3D plane. */
export function stockMatrix(p:StockPose,width:number,height:number){
 const css=new T.Matrix4().makeTranslation(p.x-width/2,p.y-height/2,p.z)
  .multiply(new T.Matrix4().makeRotationZ(p.bank*Math.PI/180))
  .multiply(new T.Matrix4().makeRotationY(p.yaw*Math.PI/180))
  .multiply(new T.Matrix4().makeRotationX(p.pitch*Math.PI/180))
  .scale(new T.Vector3(p.scale,p.scale,p.scale));
 return css.premultiply(Y).multiply(Y);
}
export function createStockGeometry(w:number,h:number,depth=w*DRAW_THICKNESS_RATIO){
 const x=-w/2,y=-h/2,r=w*.052,s=new T.Shape();
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const bevel=w*.004,g=new T.ExtrudeGeometry(s,{depth:depth-bevel*2,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:4});
 g.translate(0,0,-depth+bevel);return g;
}
interface DrawStage {add(w:number,h:number):{update(p:StockPose,visible:boolean,glow:number):void;remove():void};render():void;release():void;}
let shared:{stage:DrawStage;refs:number}|null=null;
/** One small scene shared by simultaneous player/opponent draws; no art textures. */
export function acquireDrawStage():DrawStage|null{
 if(shared){shared.refs++;return shared.stage;}
 if(typeof WebGL2RenderingContext==='undefined')return null;
 let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
 const width=innerWidth,height=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height);renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 const canvas=renderer.domElement;canvas.className='draw-stock-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:125';document.body.append(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(2*Math.atan(height/(2*FOCAL))*180/Math.PI,width/height,1,3000);camera.position.z=FOCAL;
 scene.add(new T.HemisphereLight(0xe8f2ff,0x283247,2));
 const light=new T.DirectionalLight(0xfff1d5,2);light.position.set(-width*.3,height*.7,800);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-width;light.shadow.camera.right=width;light.shadow.camera.top=height;light.shadow.camera.bottom=-height;light.shadow.camera.far=2400;light.shadow.bias=-.0003;scene.add(light);
 const ground=new T.Mesh(new T.PlaneGeometry(width*2,height*2),new T.ShadowMaterial({opacity:.24}));ground.position.z=-18;ground.receiveShadow=true;scene.add(ground);
 const paper=new T.MeshStandardMaterial({color:0xb9b8af,metalness:.08,roughness:.55});
 const edge=new T.MeshStandardMaterial({color:0x879ab2,metalness:.4,roughness:.33});
 const ink=new T.LineBasicMaterial({color:0x182b42,transparent:true,opacity:.7});
 let disposed=false;const owners=new Set<T.Group>();
 const disposeObject=(group:T.Group)=>{group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m!==paper&&m!==edge&&m!==ink)m.dispose();});}});scene.remove(group);owners.delete(group);};
 const stage:DrawStage={
  add(w,h){const group=new T.Group();group.matrixAutoUpdate=false;group.visible=false;scene.add(group);owners.add(group);
   const depth=w*DRAW_THICKNESS_RATIO,body=new T.Mesh(createStockGeometry(w,h,depth),[edge,paper]);body.castShadow=true;group.add(body);
   // A dark, fine laminated seam makes the material read at grazing angles.
   const pts: T.Vector3[]=[];const r=w*.052;for(const [cx,cy,a] of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,90],[-w/2+r,-h/2+r,180],[w/2-r,-h/2+r,270]])for(let i=0;i<=5;i++){const angle=(a+i*18)*Math.PI/180;pts.push(new T.Vector3(cx+r*Math.cos(angle),cy+r*Math.sin(angle),-depth*.52));}
   const seam=new T.LineLoop(new T.BufferGeometry().setFromPoints(pts),ink);group.add(seam);
   const rimMat=new T.LineBasicMaterial({color:0xa1e9ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false});const rim=new T.LineLoop(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(p.x,p.y,.03))),rimMat);group.add(rim);
   return {update(p,visible,glow){if(disposed)return;group.visible=visible;group.matrix.copy(stockMatrix(p,width,height));rimMat.opacity=glow*.8;},remove(){if(owners.has(group))disposeObject(group);}};
  },
  render(){if(!disposed)renderer.render(scene,camera);},
  release(){if(!shared||--shared.refs>0)return;disposed=true;shared=null;for(const group of [...owners])disposeObject(group);paper.dispose();edge.dispose();ink.dispose();ground.geometry.dispose();ground.material.dispose();light.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 };
 shared={stage,refs:1};return stage;
}
