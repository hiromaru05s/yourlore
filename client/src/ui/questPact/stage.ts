import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
/** Lighting of approved study 01, without the other prototype renderers. */
export class PactStage {
 readonly renderer:T.WebGLRenderer;readonly canvas:HTMLCanvasElement;readonly scene=new T.Scene();readonly camera=new T.PerspectiveCamera(34,1,.1,80);readonly root=new T.Group();
 private env:T.WebGLRenderTarget;private pm:T.PMREMGenerator;
 constructor(_face:HTMLCanvasElement,_overlay=false){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true});this.canvas=this.renderer.domElement;
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.toneMapping=T.ACESFilmicToneMapping;
  this.pm=new T.PMREMGenerator(this.renderer);const room=new RoomEnvironment();this.env=this.pm.fromScene(room,.04);room.dispose();this.scene.environment=this.env.texture;this.scene.environmentIntensity=.65;
  this.camera.position.set(0,.8,10.2);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight(0xf0f4ff,0x272b43,1.3));const key=new T.DirectionalLight(0xffedd7,2.7);key.position.set(-3,5,6);this.scene.add(key);const rim=new T.DirectionalLight(0xc7dcff,2);rim.position.set(4,1,-2);this.scene.add(rim);this.scene.add(this.root);
 }
 resize(w:number,h:number){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 dispose(){this.env.dispose();this.pm.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
