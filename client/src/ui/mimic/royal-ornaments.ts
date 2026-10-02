import * as T from 'three';
import {crown,metalReady} from './ornaments';
import {ease} from './motion';
import {windowAt,type RoyalId,type RoyalPose} from './motion';

const ivory=new T.MeshStandardMaterial({color:0xe3c897,roughness:.43,vertexColors:true});
function fang(){
 const curve=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(3,17,8),new T.Vector3(-2,45,6)]),g=new T.TubeGeometry(curve,28,8,16,false),p=g.getAttribute('position')as T.BufferAttribute,colors=new Float32Array(p.count*3);
 for(let i=0;i<=28;i++)for(let j=0;j<=16;j++){const n=i*17+j,u=i/28,c=curve.getPointAt(u),f=Math.pow(1-u,.7),grain=.88+.12*Math.sin(j*4+i*.4)**2;p.setXYZ(n,c.x+(p.getX(n)-c.x)*f,c.y+(p.getY(n)-c.y)*f,c.z+(p.getZ(n)-c.z)*f);const shade=(.48+.52*ease(0,.4,u))*grain;colors.set([shade,shade,shade],n*3);}
 g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();return new T.Mesh(g,ivory);
}
export class RoyalOrnaments {
 private root=new T.Group();private crown=crown();private fangs:T.Mesh[]=[];
 private blockers:T.Mesh[]=[];readonly ready:Promise<void>;
 constructor(scene:T.Scene,private id:RoyalId){
  scene.add(this.root);this.root.add(this.crown);
  if(id==='MIMIC_KING'){this.fangs=[fang(),fang()];this.root.add(...this.fangs);}
  this.ready=metalReady();
  for(let i=0;i<2;i++){const m=new T.Mesh(new T.PlaneGeometry(174,138),new T.MeshBasicMaterial({colorWrite:false,side:T.DoubleSide}));m.renderOrder=-1;scene.add(m);this.blockers.push(m);}
 }
 draw(t:number,p:RoyalPose,reduced:boolean,spine:T.Vector3[]){
  const second=this.id==='MIMIC_KING2',show=windowAt(t,560,860,2470,2780),turn=ease(640,2280,t)*Math.PI*4*(reduced?.12:1);
  this.root.visible=show>.0001;
  this.blockers[0].position.set(90,-70+p.gap*p.upper,0);this.blockers[0].rotation.z=-p.topAngle*Math.PI/180;
  this.blockers[1].position.set(90,-210-p.gap*(1-p.upper),0);this.blockers[1].rotation.z=-p.bottomAngle*Math.PI/180;
  if(!this.root.visible)return;
  const tip=spine[59],home=new T.Vector3(90,p.gap*p.upper-8,20),c=this.crown;
  c.position.copy(home);c.rotation.set(.12,turn,Math.sin(turn*.4)*.08);
  if(second){const lift=ease(1660,2110,t);c.position.copy(tip).lerp(home,lift);c.position.y+=Math.sin(lift*Math.PI)*105;c.position.z+=14;c.scale.setScalar(show*(.95+.45*lift));c.rotation.y=turn;}
  else{const drop=ease(820,1100,t);c.position.y+=130*(1-drop);c.scale.setScalar(show*(2-.65*drop));c.rotation.y=turn*(1-ease(1020,1170,t))+.3;}
  for(const [i,m]of this.fangs.entries()){m.position.set(i?157:23,-140-p.gap*(1-p.upper),14);m.scale.set((i?-1:1)*p.open,p.open,p.open);m.rotation.z=(i?1:-1)*.1;}
 }
 dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.blockers.forEach(m=>{m.geometry.dispose();(m.material as T.Material).dispose();m.removeFromParent();});this.root.removeFromParent();}
}
