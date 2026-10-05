import * as T from 'three';
const vertexShader='varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
const blurFragment=`uniform sampler2D image;uniform vec2 stepUV;uniform float extract;varying vec2 uv0;
vec4 sampleLight(vec2 p){vec4 c=texture2D(image,p);if(extract>.5){float l=max(c.r,max(c.g,c.b));float e=max(0.,l-1.01)/max(l,.001);return vec4(c.rgb*e,c.a*e);}return c;}
void main(){vec4 c=sampleLight(uv0)*.227027; c+=(sampleLight(uv0+stepUV*1.384615)+sampleLight(uv0-stepUV*1.384615))*.316216;c+=(sampleLight(uv0+stepUV*3.230769)+sampleLight(uv0-stepUV*3.230769))*.070270;gl_FragColor=c;}`;
/** Separable Gaussian: retain a sharp source and scatter only HDR emission. */
export class EdgeBloom{
 readonly target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
 private horizontal=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
 private vertical=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 private blur=new T.ShaderMaterial({vertexShader,fragmentShader:blurFragment,depthTest:false,depthWrite:false,uniforms:{image:{value:this.target.texture},stepUV:{value:new T.Vector2()},extract:{value:1}}});
 private composite=new T.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,transparent:true,premultipliedAlpha:true,uniforms:{image:{value:this.target.texture},glow:{value:this.vertical.texture}},fragmentShader:`uniform sampler2D image;uniform sampler2D glow;varying vec2 uv0;void main(){vec4 b=texture2D(image,uv0),g=texture2D(glow,uv0);gl_FragColor=vec4(b.rgb+g.rgb*.70,min(1.,b.a+g.a*.42));}`});
 private quad=new T.Mesh(new T.PlaneGeometry(2,2),this.blur);
 constructor(){this.scene.add(this.quad);}
 begin(r:T.WebGLRenderer){
  const s=r.getDrawingBufferSize(new T.Vector2());
  if(this.target.width!==s.x||this.target.height!==s.y){this.target.setSize(s.x,s.y);this.horizontal.setSize(s.x,s.y);this.vertical.setSize(s.x,s.y);}
  r.setRenderTarget(this.target);r.setScissorTest(false);r.clear();
 }
 end(r:T.WebGLRenderer){
  r.setScissorTest(false);this.quad.material=this.blur;
  this.blur.uniforms.image.value=this.target.texture;this.blur.uniforms.extract.value=1;this.blur.uniforms.stepUV.value.set(1.6/this.target.width,0);
  r.setRenderTarget(this.horizontal);r.clear();r.render(this.scene,this.camera);
  this.blur.uniforms.image.value=this.horizontal.texture;this.blur.uniforms.extract.value=0;this.blur.uniforms.stepUV.value.set(0,1.6/this.target.height);
  r.setRenderTarget(this.vertical);r.clear();r.render(this.scene,this.camera);
  r.setRenderTarget(null);const size=r.getSize(new T.Vector2());r.setViewport(0,0,size.x,size.y);r.clear();this.quad.material=this.composite;r.render(this.scene,this.camera);
 }
 dispose(){this.target.dispose();this.horizontal.dispose();this.vertical.dispose();this.blur.dispose();this.composite.dispose();this.quad.geometry.dispose();}
}
