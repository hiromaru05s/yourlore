import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {grain,paperMap,physical,canvasMap} from './materials';
import {pageMaterial,themes} from './script';
import {leafPoint,coverAngle,bookmarkPoint} from './kinematics';
export interface Grimoire{root:T.Group;cover:T.Group;leaves:T.Mesh[];bands:T.Group[];bookmark:T.Mesh;glow:T.Mesh;finalPages:T.Mesh[];tick:(open:number,flutter:number,t:number,charge:number,color:T.Color,wake?:number)=>void}
export function makeBook(art:T.Texture,style=0,_detail=true):Grimoire{
 const root=new T.Group(),cover=new T.Group();const leatherGrain=grain(),edges=paperMap(true);
 const body=physical(themes[style].body,.05,.64);body.bumpMap=leatherGrain;body.bumpScale=.025;body.sheen=.22;body.sheenColor=new T.Color('#c4bdac');
 const metal=physical(themes[style].metal,.86,.29);metal.bumpMap=leatherGrain;metal.bumpScale=.006;
 const ink=physical(themes[style].body,.18,.44);const wake={value:0},clock={value:0};const sheets=Array.from({length:18},(_,i)=>pageMaterial(0,i,wake,clock));const paperMat=sheets[17].mat;
 const pageEdge=physical('#ede3c9',0,.88,edges);pageEdge.bumpMap=edges;pageEdge.bumpScale=.013;
 function mesh(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=root){const ob=new T.Mesh(g,m);ob.position.set(x,y,z);ob.castShadow=ob.receiveShadow=true;parent.add(ob);return ob}
 function round(w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=root,r=.035){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z,parent)}
 // Covers have rounded bevels, an overhanging lip and a separate convex leather spine.
 round(2.22,3.14,.115,body,0,0,-.265);round(2.06,3.00,.405,pageEdge,.023,-.002,-.01,root,.035);
 const spineGeo=new T.CylinderGeometry(.25,.25,3.13,28,1,false,Math.PI/2,Math.PI);const spine=mesh(spineGeo,body,-1.0,0,-.03);spine.rotation.y=0;
 for(const y of [-1.25,-.79,.79,1.25]){const ring=mesh(new T.TorusGeometry(.252,.016,6,24,Math.PI),metal,-1.0,y,-.03);ring.rotation.x=Math.PI/2;ring.rotation.z=Math.PI/2}
 cover.position.set(-1.11,0,.31);root.add(cover);round(2.22,3.14,.10,body,1.04,0,0,cover,.045);
 const face=physical('#ffffff',.06,.61,art);face.bumpMap=art;face.bumpScale=.015;face.roughness=.70;face.clearcoat=.09;
 // A dedicated material texture, never a sleeve/card picture pasted onto a box.
 const front=mesh(new T.PlaneGeometry(2.13,3.04,1,1),face,1.04,0,.053,cover);front.castShadow=false;
 const liner=pageMaterial(0,18,wake,clock).mat;liner.side=T.FrontSide;mesh(new T.PlaneGeometry(2.11,3.01),liner,1.04,0,-.054,cover).rotation.y=Math.PI;
 for(const side of [-1,1]){round(.012,2.97,.018,metal,1.04+side*1.02,0,.057,cover,.004);round(2.05,.01,.019,metal,1.04,side*1.46,.057,cover,.004)}
 // Small, curved corner protectors follow the binding instead of giant diamond ornaments.
 for(const x of [.08,2])for(const y of [-1.44,1.44]){const s=x<1?1:-1,e=y<0?1:-1;round(.16,.023,.035,metal,x+s*.06,y,.049,cover,.01);round(.023,.15,.035,metal,x,y+e*.06,.049,cover,.01)}
 const top=mesh(new T.PlaneGeometry(2.04,2.99,16,2),paperMat,.026,0,.200);top.castShadow=false;
 const leaves:T.Mesh[]=[];const reverse:T.Mesh[]=[];
 for(let i=0;i<8;i++){
  const g=new T.PlaneGeometry(2.05,2.99,48,8);const frontMat=sheets[i*2+1].mat;frontMat.side=T.FrontSide;const backMat=sheets[i*2].mat;backMat.side=T.BackSide;
  const leaf=mesh(g,frontMat,-1.002,0,0);leaf.frustumCulled=false;leaves.push(leaf);
  const back=new T.Mesh(g,backMat);back.castShadow=back.receiveShadow=true;leaf.add(back);reverse.push(back);
 }
 // Silk is stitched into the headband. It hangs behind the binding, not from the foot.
 const silk=canvasMap(256,1024,c=>{c.fillStyle='#223d59';c.fillRect(0,0,256,1024);for(let y=0;y<1024;y+=3){c.fillStyle=y%2?'#8ca6b226':'#0c203826';c.fillRect(0,y,256,1)}for(const x of [14,242]){c.fillStyle='#bba875';c.fillRect(x,0,3,1024)}for(let x=0;x<256;x+=4){c.fillStyle='#d1e1ed0d';c.fillRect(x,0,1,1024)}});
 const ribbonMat=physical('#ffffff',.02,.60,silk);ribbonMat.side=T.DoubleSide;ribbonMat.sheen=.75;ribbonMat.sheenColor=new T.Color('#8ba6bf');
 const bookmark=mesh(new T.PlaneGeometry(.080,3.5,4,64),ribbonMat,-.92,1.57,-.16);bookmark.frustumCulled=false;
 const stitch=mesh(new T.CylinderGeometry(.018,.018,.18,12),pageEdge,-.94,1.56,-.145);stitch.rotation.z=Math.PI/2;
 // Functional split clasp: only the seal variant shows these articulated parts.
 const bands:T.Group[]=[];for(let i=0;i<2;i++){const g=new T.Group();g.position.set(i?1.08:-1.08,.12,.14);root.add(g);const s=i?-1:1;round(.62,.19,.048,metal,s*.26,0,.18,g,.025);round(.42,.10,.05,ink,s*.22,0,.21,g,.012);const stud=mesh(new T.SphereGeometry(.042,12,8),metal,s*.49,0,.246,g);stud.scale.z=.5;bands.push(g)}
 // Trace the actual gold stamping: the same UVs supply the material and its mana response.
 const lineMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{art:{value:art},charge:{value:0},color:{value:new T.Color('#a8d7ed')},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D art;uniform float charge,time;uniform vec3 color;varying vec2 vUv;void main(){vec3 c=texture2D(art,vUv).rgb;float warm=smoothstep(.045,.16,c.r-c.b);float dark=1.-smoothstep(.42,.77,dot(c,vec3(.3,.6,.1)));float sweep=.45+.55*exp(-pow((vUv.y-fract(time*.19))*5.,2.));float a=warm*dark*charge*sweep*.8;gl_FragColor=vec4(color*1.5,a);}`});
 const eye=mesh(new T.PlaneGeometry(2.13,3.04),lineMat,1.04,0,.056,cover);eye.castShadow=false;
 cover.children.forEach(part=>part.position.x+=.07);
 return {root,cover,leaves,bands,bookmark,glow:eye,finalPages:[reverse[0],top],tick(open,_flutter,t,charge,color,awakening=0){
  wake.value=awakening;clock.value=t;cover.rotation.y=-coverAngle(open);
  for(let i=0;i<leaves.length;i++){
   const page=leaves[i],pos=page.geometry.attributes.position as T.BufferAttribute,uv=page.geometry.attributes.uv;
   for(let j=0;j<pos.count;j++){const q=leafPoint(open,i,uv.getX(j),uv.getY(j));pos.setXYZ(j,q.x,q.y,q.z)}
   pos.needsUpdate=true;page.geometry.computeVertexNormals();
  }
  const p=bookmark.geometry.attributes.position as T.BufferAttribute,uv=bookmark.geometry.attributes.uv;
  for(let i=0;i<p.count;i++){const u=uv.getX(i),v=1-uv.getY(i),q=bookmarkPoint(v,open,t);p.setXYZ(i,q.x+(u-.5)*.080,q.y,q.z+(u-.5)*Math.sin(v*4+t)*.010)}p.needsUpdate=true;bookmark.geometry.computeVertexNormals();lineMat.uniforms.charge.value=charge;lineMat.uniforms.color.value.copy(color);lineMat.uniforms.time.value=t;
 }};
}
