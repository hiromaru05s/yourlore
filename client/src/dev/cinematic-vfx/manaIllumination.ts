import * as T from 'three';
import type {ManaVariant} from './manaSummon';
const vertex=`uniform mat4 planeMatrix;uniform vec2 size;uniform vec2 viewport;varying vec2 vUv;void main(){vUv=uv;vec4 p=planeMatrix*vec4((position.x+.5)*size.x,(.5-position.y)*size.y,0.,1.);gl_Position=vec4(2.*p.x/viewport.x-p.w,p.w-2.*p.y/viewport.y,0.,p.w);}`;
const fragment=`precision highp float;uniform sampler2D face;uniform float clock;uniform float variant;uniform float charge;uniform float conversion;varying vec2 vUv;
float H(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float N(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(H(i),H(i+vec2(1.,0.)),f.x),mix(H(i+vec2(0.,1.)),H(i+1.),f.x),f.y);}float F(vec2 p){return N(p)*.6+N(p*2.07+3.1)*.28+N(p*4.13-1.4)*.12;}
float A(vec2 p){return smoothstep(.60,.98,texture2D(face,clamp(p,0.,1.)).a);}
void main(){vec2 uv=vUv;vec4 tex=texture2D(face,uv);float t=clock;
 float a=A(uv),nearby=0.,wide=0.,inside=1.;
 for(int i=0;i<8;i++){float angle=float(i)*.785398;vec2 d=vec2(cos(angle),sin(angle));nearby=max(nearby,A(uv+d*.003));inside=min(inside,A(uv+d*.003));wide=max(wide,A(uv+d*.014));}
 float rim=max(0.,nearby-inside),halo=max(0.,wide-a);
 float n=F(uv*vec2(18.,30.)+vec2(t*.6,-t*1.4));
 float perimeter=atan((uv.y-.5)*1.4,uv.x-.5),head=pow(.5+.5*cos(perimeter-t*7.),18.)+pow(.5+.5*cos(perimeter-t*7.+3.14159),22.);
 float peak=smoothstep(1.72,1.79,t)*(1.-smoothstep(1.90,2.22,t));
 float scanCenter=mix(-.3,1.4,smoothstep(.80,1.16,t));float scan=exp(-pow((uv.x*.35+(1.-uv.y)-scanCenter)*18.,2.))*(1.-smoothstep(1.14,1.27,t));
 float l=dot(tex.rgb,vec3(.2126,.7152,.0722));float adjacent=dot(texture2D(face,uv+vec2(.002)).rgb,vec3(.2126,.7152,.0722));float etch=min(1.,abs(l-adjacent)*7.);
 float weave=pow(.5+.5*sin(uv.y*26.+uv.x*8.+n*1.5-t*5.),20.);
 float energy=rim*charge*(.10+head*.66+n*.14)+halo*charge*(.08+head*.10)+a*scan*charge*.38+peak*(rim*.62+halo*.11);
 if(variant>.5)energy+=a*weave*conversion*.13+a*etch*conversion*.09;
 float body=a*conversion*(.62+l*.20);float opacity=clamp(energy+body,0.,.82);
 vec3 mineral=mix(vec3(.012,.065,.12),vec3(.16,.40,.55),l)+vec3(.025,.06,.075)*n;vec3 color=mix(mineral,vec3(.68,.89,1.),clamp(energy*2.+scan*.3,0.,1.));
 gl_FragColor=vec4(color,opacity);
 #include <colorspace_fragment>
}`;
export class ManaIllumination{
 private texture?:T.Texture;
 private mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,uniforms:{face:{value:null},clock:{value:0},variant:{value:0},charge:{value:0},conversion:{value:0},planeMatrix:{value:new T.Matrix4()},size:{value:new T.Vector2()},viewport:{value:new T.Vector2()}}}));
 constructor(scene:T.Scene){scene.add(this.mesh);this.mesh.frustumCulled=false;this.mesh.visible=false;this.mesh.renderOrder=110;}
 prepare(surface:HTMLCanvasElement|HTMLImageElement){this.texture?.dispose();this.texture=new T.Texture(surface);this.texture.colorSpace=T.SRGBColorSpace;this.texture.minFilter=T.LinearFilter;this.texture.magFilter=T.LinearFilter;this.texture.needsUpdate=true;this.mesh.material.uniforms.face.value=this.texture;}
 render(matrix:DOMMatrix,w:number,h:number,t:number,variant:ManaVariant,charge:number,conversion:number){this.mesh.visible=charge>.001;const u=this.mesh.material.uniforms;u.clock.value=t;u.variant.value=variant==='weave'?1:0;u.charge.value=charge;u.conversion.value=conversion;u.planeMatrix.value.fromArray(matrix.toFloat32Array());u.size.value.set(w,h);u.viewport.value.set(innerWidth,innerHeight);}
 hide(){this.mesh.visible=false;}
 dispose(){this.texture?.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.removeFromParent();}
}
