import * as T from 'three';
import {DentalArch} from './geometry';
import {BITE,pose,ease,type Id} from './catalog';
/** Selected 01 only. Preview uses the same DentalArch and pose. */
export class VampireRig{
 readonly group=new T.Group();readonly ready=Promise.resolve();readonly points=Array.from({length:4},()=>new T.Vector2());readonly gaps=new T.Vector4();
 pressure=0;wound=0;count=4;lowerClearance=0;focus=0;impact=0;
 private study=new DentalArch();private bounds=new T.Box3();private tip=new T.Vector3();private anchors:T.Vector2[]=[];
 constructor(){const s=this.study;this.group.add(s.group);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).transparent=true;});s.update(pose(BITE.hit+30));this.group.updateWorldMatrix(true,true);this.anchors=s.contacts.map(c=>{const t=c.mesh.localToWorld(c.tip.clone());return new T.Vector2(t.x,t.y);});}
 draw(_id:Id,_v:number,ms:number,h:number){const p=pose(ms),b=BITE,s=this.study;this.group.visible=ms<b.release;this.group.position.set(0,0,h+4);this.pressure=p.pressure;this.wound=p.wound;
  this.focus=(.70+.30*p.grow)*(1-ease(b.hold+50,b.release+150,ms));this.impact=ease(b.hit,b.hit+12,ms)*(1-ease(b.hit+24,b.hit+105,ms));
  s.group.position.z=0;s.update(p);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).opacity=1-ease(.80,1,p.retract);});this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);s.group.position.z=Math.max(0,h+3-this.bounds.min.z);this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);this.lowerClearance=this.group.visible?this.bounds.min.z:0;
  for(let i=0;i<4;i++){const c=s.contacts[i];c.mesh.localToWorld(this.tip.copy(c.tip));if(ms>=b.hit)this.points[i].copy(this.anchors[i]);else this.points[i].set(this.tip.x,this.tip.y);this.gaps.setComponent(i,p.gap);}
 }
 dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.group.clear();}
}
export type BiteGeometry=Pick<VampireRig,'group'|'ready'|'points'|'gaps'|'pressure'|'wound'|'count'|'lowerClearance'|'focus'|'impact'|'draw'|'dispose'>;
