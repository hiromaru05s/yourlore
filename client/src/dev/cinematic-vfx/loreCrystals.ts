import * as T from 'three';
import {ease,lerp,type Rect,type Point} from './direction';

// A record separates along engraved cleavage planes. Each piece has thickness,
// its original print coordinates, a dark mineral body and a moving specular face.
const cells:number[][][]=[
 [[0,0],[.48,0],[.41,.28],[0,.37]],
 [[.48,0],[1,0],[1,.34],[.61,.44],[.41,.28]],
 [[0,.37],[.41,.28],[.61,.44],[.34,.63],[0,.57]],
 [[1,.34],[1,.69],[.63,.75],[.34,.63],[.61,.44]],
 [[0,.57],[.34,.63],[.28,1],[0,1]],
 [[.34,.63],[.63,.75],[.73,1],[.28,1]],
 [[.63,.75],[1,.69],[1,1],[.73,1]],
];
const vertex=`uniform float conversion;varying vec2 vUv;varying vec3 vNormal;varying vec3 vPosition;void main(){vUv=uv;vNormal=normalize(normalMatrix*normalize(mix(vec3(0.,0.,1.),normal,conversion)));vPosition=position;vec3 p=position;p.z*=conversion;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragment=`precision highp float;uniform sampler2D face;uniform float clock;uniform float conversion;uniform float opacity;uniform float piece;varying vec2 vUv;varying vec3 vNormal;varying vec3 vPosition;
void main(){vec4 print=texture2D(face,vUv);if(print.a<.025)discard;
 vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.5,.65,1.3));float diffuse=.32+.68*abs(dot(n,light));
 float spec=pow(max(0.,dot(n,normalize(vec3(sin(clock*2.+piece)*.8,-.45,1.)))),85.);
 float grain=sin(vUv.x*580.+vUv.y*900.)*sin(vUv.y*690.);float lamina=pow(.5+.5*sin(vUv.x*24.+vUv.y*43.+piece),16.);
 float sweep=exp(-pow((vUv.y+vUv.x*.36-clock*.56+piece*.07)*26.,2.));
 float front=conversion*1.5-(vUv.y*.7+abs(vUv.x-.5)*.65);float solid=smoothstep(-.10,.08,front);float hot=exp(-abs(front)*45.)*step(.001,conversion)*(1.-step(.999,conversion));
 vec3 mineral=mix(vec3(.004,.023,.058),vec3(.025,.15,.27),diffuse)+vec3(.025,.18,.3)*lamina*.18;
 vec3 color=mix(print.rgb,mineral,solid*.96)*(.8+.2*diffuse)+vec3(.35,.72,.94)*(spec*.55+sweep*.16+grain*.003)*solid;
 float vein=pow(.5+.5*sin(vUv.x*53.+vUv.y*21.+sin(vUv.y*37.)*.6),60.);color+=vec3(.10,.37,.60)*vein*solid*.35;
 float rim=pow(1.-abs(n.z),2.);color+=vec3(.10,.47,.72)*rim*solid*.5;
 color+=vec3(.74,.88,.96)*hot*.7+vec3(.88,.71,.40)*spec*.13*solid;
 gl_FragColor=vec4(color,print.a*opacity);#include <colorspace_fragment>
}`.replace(';#include',';\n#include');
export class LoreCrystals{
 private group=new T.Group();private texture?:T.Texture;
 private pieces:Array<{mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;cx:number;cy:number}>=[];
 constructor(scene:T.Scene){scene.add(this.group);this.group.visible=false;}
 prepare(surface:HTMLCanvasElement|HTMLImageElement){this.clear();this.texture=new T.Texture(surface);this.texture.colorSpace=T.SRGBColorSpace;this.texture.needsUpdate=true;this.texture.minFilter=T.LinearFilter;
  for(let i=0;i<cells.length;i++){const poly=cells[i],cx=poly.reduce((s,p)=>s+p[0],0)/poly.length,cy=poly.reduce((s,p)=>s+p[1],0)/poly.length;const vertices:number[]=[],texels:number[]=[];
   const tri=(a:number[],b:number[],c:number[])=>{for(const p of[a,b,c]){vertices.push(p[0]-cx,p[1]-cy,p[2]);texels.push(p[0],1-p[1]);}};
   for(let j=0;j<poly.length;j++){
    const a=poly[j],b=poly[(j+1)%poly.length],ai=[lerp(cx,a[0],.87),lerp(cy,a[1],.87),.045],bi=[lerp(cx,b[0],.87),lerp(cy,b[1],.87),.045];
    tri([cx,cy,.085],ai,bi);tri([...a,0],ai,bi);tri([...a,0],bi,[...b,0]);tri([...a,-.035],[...a,0],[...b,0]);tri([...a,-.035],[...b,0],[...b,-.035]);tri([cx,cy,-.035],[...b,-.035],[...a,-.035]);
   }
   const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geom.setAttribute('uv',new T.Float32BufferAttribute(texels,2));geom.computeVertexNormals();
   const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{face:{value:this.texture},clock:{value:0},conversion:{value:0},opacity:{value:1},piece:{value:i}}});
   const mesh=new T.Mesh(geom,mat);mesh.renderOrder=20+i;mesh.frustumCulled=false;this.group.add(mesh);this.pieces.push({mesh,cx,cy});
  }
 }
 render(t:number,hero:Rect,dest:Rect,project:(x:number,y:number)=>Point){this.group.visible=t>=.80&&t<2.08;if(!this.group.visible)return;
  this.pieces.forEach(({mesh,cx,cy},i)=>{const launch=1.04+i*.010,q=ease(launch,1.82+i*.010,t),opening=ease(.83,1.16,t)*(1-q),target=project(cx-.5,(cy-.5)*hero.h/hero.w);
   const x=hero.x+(cx-.5)*hero.w,y=hero.y+(cy-.5)*hero.h;
   const fold=ease(.95,1.27,t)*(1-ease(1.67,1.99,t));
   const fan=(cx-.5)*hero.w*(.09*opening-.96*fold);
   mesh.position.set(lerp(x+fan,target.x,q),lerp(y+(cy-.5)*hero.h*(.06*opening-.93*fold),target.y,q)-Math.sin(q*Math.PI)*hero.w*.12,40+i);
   const scale=lerp(1,dest.w/hero.w,q)*(1-.23*Math.sin(q*Math.PI));mesh.scale.set(hero.w*scale*(1-.67*fold),hero.h*scale*(1-.45*fold),hero.w*scale*(1-ease(1.84+i*.010,1.94+i*.010,t)));
   mesh.rotation.set(Math.sin(q*Math.PI)*(.26+(i%3)*.10),Math.sin(q*Math.PI)*(i%2?-.36:.36),Math.sin(q*Math.PI)*(i-3)*.045);
   const u=mesh.material.uniforms;u.clock.value=t;u.conversion.value=ease(.83,1.22,t);u.opacity.value=ease(.80,.87,t)*(1-ease(1.84+i*.010,1.94+i*.010,t));
  });
 }
 hide(){this.group.visible=false;}
 clear(){for(const {mesh} of this.pieces){this.group.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}this.pieces=[];this.texture?.dispose();this.texture=undefined;}
 dispose(){this.clear();this.group.removeFromParent();}
}
