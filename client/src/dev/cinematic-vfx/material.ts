import * as T from 'three';
export interface Pose {x:number;y:number;w:number;h:number;rz?:number;ry?:number;rx?:number;glow?:number;burn?:number;mix?:number;alpha?:number;time?:number;color?:string;matrix?:DOMMatrix;formation?:number;}
const vert=`varying vec2 vUv;uniform float projected;uniform mat4 planeMatrix;uniform vec2 planeSize;uniform vec2 viewport;void main(){vUv=vec2(uv.x,1.-uv.y);if(projected>.5){vec4 p=planeMatrix*vec4((position.xy+.5)*planeSize,0.,1.);gl_Position=vec4(2.*p.x/viewport.x-p.w,p.w-2.*p.y/viewport.y,0.,p.w);}else{gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}}`;
const frag=`
precision highp float;
uniform sampler2D face;uniform sampler2D nextFace;uniform float blend;uniform float clock;uniform float charge;uniform float burn;uniform float opacity;uniform float formation;uniform vec3 tint;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec2 uv=vUv;vec4 a=texture2D(face,uv),b=texture2D(nextFace,uv);vec4 tex=mix(a,b,blend);
 float lum=dot(tex.rgb,vec3(.2126,.7152,.0722));
 float l2=dot(mix(texture2D(face,uv+vec2(.003,0)),texture2D(nextFace,uv+vec2(.003,0)),blend).rgb,vec3(.2126,.7152,.0722));
 float l3=dot(mix(texture2D(face,uv+vec2(0,.003)),texture2D(nextFace,uv+vec2(0,.003)),blend).rgb,vec3(.2126,.7152,.0722));
 float detail=clamp((abs(l2-lum)+abs(l3-lum))*12.,0.,1.);
 float n=noise(uv*vec2(12.,20.)+vec2(0.,clock*.3));
 float veins=pow(max(0.,1.-abs(sin(uv.x*36.+uv.y*17.+n*6.+clock*1.3))),20.);
 float sweep=exp(-pow((uv.y-uv.x*.22-fract(clock*.7))*11.,2.));
 vec2 inset=min(uv,1.-uv);float edge=exp(-min(inset.x,inset.y)*120.);
 vec3 rgb=tex.rgb*(1.+charge*.08)+tint*charge*(detail*.12+veins*.09+sweep*.08+edge*.30);
 float frontier=uv.y+n*.15-burn*1.21;
 float alive=smoothstep(0.,.022,frontier);
 float hot=exp(-abs(frontier-.016)*90.)*step(.001,burn);
 rgb=mix(rgb,rgb*vec3(.19,.09,.04),smoothstep(.15,.03,frontier)*step(.001,burn));
 rgb+=hot*(tint*.8+vec3(.6,.3,.07));
 float materialFront=formation*1.55-(uv.y*.80+abs(uv.x-.5)*.75+n*.25);
 float solid=smoothstep(-.04,.06,materialFront);
 float edgeMana=exp(-abs(materialFront)*32.)*(1.-step(.999,formation));
 rgb=mix(vec3(.015,.065,.14)+tint*(edge*.65+detail*.18+veins*.08),rgb,solid)+tint*edgeMana*1.05;
 gl_FragColor=vec4(rgb,tex.a*alive*opacity*mix(.20+edge*.18,1.,solid));
 #include <colorspace_fragment>
}`;
export class MaterialStage {
 private gl:T.WebGLRenderer|null=null;private fallback:HTMLCanvasElement|null=null;private scene=new T.Scene();private camera=new T.OrthographicCamera();private actors: {mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;side:T.Mesh<T.BoxGeometry,T.MeshBasicMaterial>;textures:T.Texture[]}[]=[];
 constructor(private root:HTMLElement){try{this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.gl.setPixelRatio(Math.min(devicePixelRatio,2));this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.setClearColor(0,0);root.append(this.gl.domElement);this.gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.useFallback();},{once:true});}catch{this.useFallback();}this.resize();}
 private useFallback(){if(this.fallback)return;this.gl?.domElement.remove();this.gl?.dispose();this.gl=null;this.fallback=document.createElement('canvas');this.root.append(this.fallback);parent.postMessage({type:'cinematic-vfx',fallback:true},location.origin);this.resize();}
 resize(){this.gl?.setSize(innerWidth,innerHeight);if(this.fallback){const d=Math.min(devicePixelRatio,2);this.fallback.width=innerWidth*d;this.fallback.height=innerHeight*d;this.fallback.style.width=innerWidth+'px';this.fallback.style.height=innerHeight+'px';this.fallback.getContext('2d')!.setTransform(d,0,0,d,0,0);}Object.assign(this.camera,{left:0,right:innerWidth,top:0,bottom:innerHeight,near:.1,far:3000});this.camera.position.z=1000;this.camera.updateProjectionMatrix();}
 add(a:HTMLCanvasElement|HTMLImageElement,b=a){const ta=new T.Texture(a),tb=new T.Texture(b);for(const t of[ta,tb]){t.needsUpdate=true;t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;}
 const material=new T.ShaderMaterial({vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{formation:{value:1},projected:{value:0},planeMatrix:{value:new T.Matrix4()},planeSize:{value:new T.Vector2()},viewport:{value:new T.Vector2()},face:{value:ta},nextFace:{value:tb},blend:{value:0},clock:{value:0},charge:{value:0},burn:{value:0},opacity:{value:1},tint:{value:new T.Color('#b5e9ff')}}});
 const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);const side=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#354453',transparent:true}));this.scene.add(side,mesh);this.actors.push({mesh,side,textures:[ta,tb]});return this.actors.length-1;}
 pose(index:number,p:Pose){const a=this.actors[index];if(!a)return;const alpha=p.alpha??1;a.mesh.visible=a.side.visible=alpha>.001;if(!a.mesh.visible)return;
 a.mesh.position.set(p.x,p.y,5+index*6);a.mesh.rotation.set(p.rx??0,p.ry??0,p.rz??0);a.mesh.scale.set(p.w,p.h,1);a.side.position.copy(a.mesh.position);a.side.position.z-=1.4;a.side.rotation.copy(a.mesh.rotation);a.side.scale.set(p.w*.985,p.h*.985,2.4);a.side.material.opacity=(p.burn??0)>0?0:alpha*Math.min(1,Math.abs(p.ry??0)*3+Math.abs(p.rx??0)*2);
 const u=a.mesh.material.uniforms;u.projected.value=p.matrix?1:0;if(p.matrix){u.planeMatrix.value.fromArray(p.matrix.toFloat32Array());u.planeSize.value.set(p.w,p.h);u.viewport.value.set(innerWidth,innerHeight);a.side.visible=false;a.mesh.frustumCulled=false;}u.formation.value=p.formation??1;u.clock.value=p.time??0;u.charge.value=p.glow??0;u.burn.value=p.burn??0;u.blend.value=p.mix??0;u.opacity.value=alpha;u.tint.value.set(p.color??'#b5e9ff');}
 render(){if(this.gl){this.gl.render(this.scene,this.camera);return;}const c=this.fallback?.getContext('2d');if(!c)return;c.clearRect(0,0,innerWidth,innerHeight);for(const a of this.actors){if(!a.mesh.visible)continue;const u=a.mesh.material.uniforms,w=a.mesh.scale.x,h=a.mesh.scale.y;c.save();if(u.projected.value){const m=new DOMMatrix(u.planeMatrix.value.elements),a=m.transformPoint(new DOMPoint()),b=m.transformPoint(new DOMPoint(w,0)),d=m.transformPoint(new DOMPoint(0,h));c.transform((b.x/b.w-a.x/a.w)/w,(b.y/b.w-a.y/a.w)/w,(d.x/d.w-a.x/a.w)/h,(d.y/d.w-a.y/a.w)/h,a.x/a.w,a.y/a.w);c.translate(w/2,h/2);}else{c.translate(a.mesh.position.x,a.mesh.position.y);c.rotate(a.mesh.rotation.z);}c.scale(Math.max(.06,Math.cos(a.mesh.rotation.y)),1);c.globalAlpha=u.opacity.value;c.beginPath();c.rect(-w/2,-h/2,w,h*(1-u.burn.value));c.clip();c.drawImage(a.textures[0].image as CanvasImageSource,-w/2,-h/2,w,h);c.globalAlpha*=u.blend.value;c.drawImage(a.textures[1].image as CanvasImageSource,-w/2,-h/2,w,h);c.restore();}}
 clearActors(){for(const a of this.actors){this.scene.remove(a.mesh,a.side);a.mesh.geometry.dispose();a.mesh.material.dispose();a.side.geometry.dispose();a.side.material.dispose();a.textures.forEach(t=>t.dispose());}this.actors=[];}
 dispose(){this.clearActors();this.gl?.dispose();this.gl?.domElement.remove();this.fallback?.remove();}
}
