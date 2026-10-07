import * as T from 'three';import {vertex,fragment} from './persistentFlightMaterial';import {motion,ease} from './persistentFlightMotion';
export type Anchor={x:number;y:number;w:number};
export class PersistentFlightRenderer{
 readonly gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-2.25,2.25,2.25,-2.25,.1,30);private mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;private textures:T.Texture[];private disposed=false;
 constructor(face:HTMLCanvasElement,tile:HTMLCanvasElement){this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:false});this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.setPixelRatio(1);this.camera.position.z=8;const ft=new T.CanvasTexture(face),tt=new T.CanvasTexture(tile);ft.colorSpace=tt.colorSpace=T.SRGBColorSpace;this.textures=[ft,tt];this.mesh=new T.Mesh(new T.PlaneGeometry(1.6,2.4),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,uniforms:{face:{value:ft},sourceRatio:{value:face.height/face.width},tile:{value:tt},time:{value:0},morph:{value:0},contact:{value:0}}}));this.scene.add(this.mesh);}
 render(ms:number,resolution:number){
  if(this.disposed)throw Error('Disposed');const m=motion(ms),u=this.mesh.material.uniforms;
  if(this.gl.domElement.width!==resolution)this.gl.setSize(resolution,resolution,false);
  u.time.value=ms/1000;u.morph.value=m.morph;u.contact.value=m.contact;
  this.gl.render(this.scene,this.camera);return this.gl.domElement;
 }
 point(ms:number,s:Anchor,d:Anchor){const m=motion(ms),p=m.p;return{x:s.x+(d.x-s.x)*p,y:s.y+(d.y-s.y)*p+m.lift*s.w,w:s.w+(d.w-s.w)*p};}
 trail(c:CanvasRenderingContext2D,ms:number,s:Anchor,d:Anchor){if(ms<270||ms>1190)return;const tail=Math.max(240,ms-170*(1-ease(890,1190,ms)));const a=this.point(tail,s,d),b=this.point(ms,s,d);if(Math.hypot(a.x-b.x,a.y-b.y)<1)return;c.save();c.lineCap='round';const grad=c.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,'#91caff00');grad.addColorStop(1,'#bfeaffb0');c.strokeStyle=grad;c.lineWidth=s.w*.065*(1-ease(980,1190,ms));c.shadowColor='#70c9ff';c.shadowBlur=9;c.beginPath();c.moveTo(a.x,a.y);for(let j=1;j<=12;j++){const q=this.point(tail+(ms-tail)*j/12,s,d);c.lineTo(q.x,q.y);}c.stroke();c.lineWidth=1;c.strokeStyle='#effcff99';c.shadowBlur=0;c.stroke();c.restore();}
 contact(c:CanvasRenderingContext2D,ms:number,d:Anchor){const m=motion(ms),hit=880,age=(ms-hit)/520;if(age<0||age>1)return;const energy=Math.sin(Math.PI*ease(0,.16,age))*(1-age)+m.contact*.45;c.save();c.translate(d.x,d.y);const gap=d.w*(.50+age*.035);c.strokeStyle='#88c8ef';c.lineWidth=Math.max(.7,d.w*.017)*(1-age);c.shadowColor='#88c8ef';c.shadowBlur=d.w*.11*(1-age);c.globalAlpha=.85*(1-age);c.beginPath();c.roundRect(-gap,-gap,gap*2,gap*2,d.w*.07);c.stroke();c.globalAlpha=energy*.18;c.fillStyle='#88c8ef';c.fillRect(-d.w*.49,-d.w*.49,d.w*.98,d.w*.98);c.restore();}
 stats(){return{geometries:this.gl.info.memory.geometries,textures:this.gl.info.memory.textures,programs:this.gl.info.programs?.length,calls:this.gl.info.render.calls};}
 dispose(){if(this.disposed)return;this.disposed=true;this.mesh.geometry.dispose();this.mesh.material.dispose();this.textures.forEach(t=>t.dispose());this.gl.dispose();this.gl.forceContextLoss();}
}
