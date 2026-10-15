import * as T from 'three';
import {ease,mix,designs,type Variant} from './catalog';
import {materials,head,weapon,scuteGeometry,membraneWing,talon} from './sculpt';
export type Origins={dragon:T.Vector3;mate:T.Vector3;target:T.Vector3};
const UP=new T.Vector3(0,0,1),AXIS_Y=new T.Vector3(0,1,0),INSET=new T.Vector3(.84,.84,1),SEGMENTS=112,RADIAL=16,ROWS=48,COLS=5;
const tmp=new T.Object3D(),frame=new T.Matrix4(),right=new T.Vector3(),tangent=new T.Vector3(),up=new T.Vector3(),yaxis=new T.Vector3();

export class SculptedSpiral {
  root=new T.Group();private m;private dragonHead;private spear;private skin:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  private scales:T.InstancedMesh;private rims:T.InstancedMesh;private spine:T.InstancedMesh;private belly:T.InstancedMesh;
  private wings:T.Group[]=[];private claws:T.Group[]=[];private points=Array.from({length:SEGMENTS+2},()=>new T.Vector3());
  private normals=Array.from({length:SEGMENTS+1},()=>new T.Vector3());private sides=Array.from({length:SEGMENTS+1},()=>new T.Vector3());
  private radii=new Float32Array(SEGMENTS+1);
  constructor(readonly variant:Variant){
    this.m=materials(variant);this.dragonHead=head(variant,this.m);this.spear=weapon(variant,this.m);
    const geo=new T.BufferGeometry(),indices:number[]=[];for(let i=0;i<SEGMENTS;i++)for(let j=0;j<RADIAL;j++){const a=i*RADIAL+j,b=i*RADIAL+(j+1)%RADIAL;indices.push(a,b,a+RADIAL,b,b+RADIAL,a+RADIAL);}
    geo.setIndex(indices);geo.setAttribute('position',new T.BufferAttribute(new Float32Array((SEGMENTS+1)*RADIAL*3),3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(new Float32Array((SEGMENTS+1)*RADIAL*3),3).setUsage(T.DynamicDrawUsage));this.skin=new T.Mesh(geo,this.m.skin);this.skin.castShadow=this.skin.receiveShadow=true;this.skin.frustumCulled=false;
    const scute=scuteGeometry(variant);this.scales=new T.InstancedMesh(scute,this.m.scale,ROWS*COLS);this.rims=new T.InstancedMesh(scute,this.m.edge,ROWS*COLS);
    this.belly=new T.InstancedMesh(scute,this.m.ivory,ROWS);this.spine=new T.InstancedMesh(new T.ConeGeometry(2.8,12,5),this.m.ivory,ROWS);
    for(const inst of [this.scales,this.rims,this.spine,this.belly]){inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.frustumCulled=false;inst.castShadow=inst.receiveShadow=true;}
    this.root.add(this.skin,this.scales,this.rims,this.belly,this.spine,this.dragonHead.root,this.spear);
    if(variant===2){this.wings=[membraneWing(this.m,-1),membraneWing(this.m,1)];this.root.add(...this.wings);}
    this.claws=[talon(this.m,-1),talon(this.m,1)];this.root.add(...this.claws);
  }
  get contactPoint(){
    this.spear.updateMatrixWorld(true);
    return this.spear.localToWorld(new T.Vector3(0,this.variant===1?132:this.variant===2?140:this.variant===4?145:146,0)).toArray();
  }
  private absorption(u:number,t:number) {
    const h=designs[this.variant].hit;
    switch(this.variant){
      case 0:return ease(h-220+(1-u)*200,h+150+(1-u)*180,t);
      case 1:return ease(h-140+u*40,h+260+u*80,t);
      case 2:return ease(h-190+u*240,h+140+u*210,t);
      case 3:return ease(h-220+u*350,h+90+u*300,t);
      case 4:return ease(h-40,h+270,t);
    }
  }
  private path(u:number,t:number,o:Origins,out:T.Vector3){
    const v=this.variant,d=designs[v],rise=ease(210,1000,t),coil=ease(v===4?600:700,v===1?1550:v===2?1780:1900,t),tight=ease(2140,d.hit-80,t),sink=this.absorption(u,t);
    const travel=ease(460,1320,t),lead=-.75+coil*(v===1?4.6:v===2?6.1:v===4?5.1:5.4);
    let x=0,y=0,z=0;
    if(v===3){const a=lead-u*Math.PI*3.6; x=Math.cos(a)*69; y=105-u*230; z=80+Math.sin(a)*48;}
    else {const turns=v===1?1.62:v===2?1.45:v===4?1.78:1.85;const a=lead-u*Math.PI*turns;
      const r=(v===1?96:v===2?112:v===4?100:103)*(1-u*.22);
      x=Math.cos(a)*r;y=Math.sin(a)*r*(v===1?.85:1.15);z=80+Math.sin(a+.5)*32+u*10;
      if(v===2){const old=x;x=x*.9+y*.3;y=y*.85-old*.3;z+=20*Math.sin(u*Math.PI);}
      if(v===4){y*=.9;x*=1+.05*Math.sin(ease(1860,2200,t)*Math.PI);}
    }
    // The body starts as a low, continuous relief within the dragon card.
    const flatX=Math.sin(u*5.8)*43,flatY=100-u*210;
    out.copy(o.dragon).lerp(o.target,travel);
    out.x+=mix(flatX,x,rise)*(1-tight*.46)*(1-sink);
    out.y+=mix(flatY,y,rise)*(1-tight*.38)*(1-sink);
    out.z+=mix(2,z,rise)*(1-sink);
    out.lerp(o.target,sink);
  }
  update(t:number,o:Origins,knight:boolean){
    const v=this.variant,d=designs[v];this.root.visible=t>210&&t<d.hit+410;if(!this.root.visible)return;
    const rise=ease(210,900,t),tight=ease(2140,d.hit-80,t),roar=ease(1710,1940,t)*(1-ease(2240,2500,t));
    const broad=v===1?22:v===3?12:v===4?23:18;
    for(let i=0;i<=SEGMENTS+1;i++)this.path(i/SEGMENTS,t,o,this.points[i]);
    const pos=this.skin.geometry.attributes.position as T.BufferAttribute,nrm=this.skin.geometry.attributes.normal as T.BufferAttribute;
    for(let i=0;i<=SEGMENTS;i++){
      const u=i/SEGMENTS; tangent.subVectors(this.points[i],this.points[i+1]).normalize();right.crossVectors(UP,tangent).normalize();up.crossVectors(tangent,right).normalize();this.normals[i].copy(up);this.sides[i].copy(right);
      const growth=ease(210+u*260,780+u*240,t),localSink=this.absorption(u,t),r=(.08+broad*Math.pow(1-u,.72)*( .9+.1*Math.sin(u*8)))*growth*(1-localSink);
      this.radii[i]=r;
      for(let j=0;j<RADIAL;j++){const a=j/RADIAL*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),k=i*RADIAL+j;pos.setXYZ(k,this.points[i].x+r*(right.x*ca+up.x*sa*.84),this.points[i].y+r*(right.y*ca+up.y*sa*.84),this.points[i].z+r*(right.z*ca+up.z*sa*.84));nrm.setXYZ(k,right.x*ca+up.x*sa,right.y*ca+up.y*sa,right.z*ca+up.z*sa);}
    }
    pos.needsUpdate=nrm.needsUpdate=true;
    for(let row=0;row<ROWS;row++){
      const u=(row+.3)/ROWS,ix=Math.min(SEGMENTS,Math.floor(u*SEGMENTS)),p=this.points[ix],r=this.radii[ix],growth=ease(210+u*260,780+u*240,t)*(1-this.absorption(u,t));
      tangent.subVectors(p,this.points[ix+1]).normalize();yaxis.copy(tangent).negate();
      for(let col=0;col<COLS;col++){
        const a=Math.PI*(.12+col*.19);up.copy(this.sides[ix]).multiplyScalar(Math.cos(a)).addScaledVector(this.normals[ix],Math.sin(a));right.crossVectors(yaxis,up).normalize();frame.makeBasis(right,yaxis,up);tmp.quaternion.setFromRotationMatrix(frame);
        tmp.position.copy(p).addScaledVector(up,r*.92);const armour=v===1?1+ease(1350+row*10,1680+row*10,t)*.25:1;
        tmp.scale.set((r/13)*armour,(v===3?1.2:1.4)*growth,(v===1?1.5:1)*growth);
        // Stagger alternate columns so scales overlap like a surface, not a row of beads.
        tmp.position.addScaledVector(tangent,col%2?-3*growth:0);tmp.updateMatrix();this.rims.setMatrixAt(row*COLS+col,tmp.matrix);
        tmp.position.addScaledVector(up,.65*growth);tmp.scale.multiply(INSET);tmp.updateMatrix();this.scales.setMatrixAt(row*COLS+col,tmp.matrix);
      }
      up.copy(this.normals[ix]).negate();right.crossVectors(yaxis,up).normalize();frame.makeBasis(right,yaxis,up);tmp.quaternion.setFromRotationMatrix(frame);tmp.position.copy(p).addScaledVector(up,r*.84);tmp.scale.set(r/7,1.15*growth,.45*growth);tmp.updateMatrix();this.belly.setMatrixAt(row,tmp.matrix);
      tmp.position.copy(p).addScaledVector(this.normals[ix],r*.86+4*growth);tmp.quaternion.setFromUnitVectors(AXIS_Y,this.normals[ix]);tmp.scale.setScalar(growth*(.65+.65*(1-u)));if(v===1)tmp.scale.y*=.75;if(v===4)tmp.scale.y*=1.6;tmp.updateMatrix();this.spine.setMatrixAt(row,tmp.matrix);
    }
    for(const inst of [this.scales,this.rims,this.spine,this.belly])inst.instanceMatrix.needsUpdate=true;
    tangent.subVectors(this.points[0],this.points[2]).normalize();right.crossVectors(UP,tangent).normalize();up.crossVectors(tangent,right).normalize();yaxis.copy(tangent).negate();frame.makeBasis(right,yaxis,up);
    this.dragonHead.root.quaternion.setFromRotationMatrix(frame);this.dragonHead.root.position.copy(this.points[0]);this.dragonHead.root.scale.setScalar(rise*(1-this.absorption(0,t))*(v===3?.86:v===4?1.3:1.16));this.dragonHead.jaw.rotation.x=-(v===4?.35:.2)*roar;
    for(const [i,claw]of this.claws.entries()){const ix=14;claw.position.copy(this.points[ix]).addScaledVector(this.sides[ix],(i?1:-1)*this.radii[ix]*.7);tangent.subVectors(this.points[ix],this.points[ix+1]).normalize();yaxis.copy(tangent).negate();frame.makeBasis(this.sides[ix],yaxis,this.normals[ix]);claw.quaternion.setFromRotationMatrix(frame);claw.scale.setScalar(rise*(1-this.absorption(ix/SEGMENTS,t))*(v===3?.65:1));}
    for(const [i,w]of this.wings.entries()){const ix=25;w.position.copy(this.points[ix]);tangent.subVectors(this.points[ix],this.points[ix+1]).normalize();yaxis.copy(tangent).negate();frame.makeBasis(this.sides[ix],yaxis,this.normals[ix]);w.quaternion.setFromRotationMatrix(frame);w.rotateY((i?1:-1)*(.32+.7*tight-.22*Math.sin(ease(700,1750,t)*Math.PI)));const s=rise*(1-this.absorption(ix/SEGMENTS,t))*(.7+.25*ease(650,1200,t));w.scale.set((i?1:-1)*s,s,s);}
    const wRise=ease(320,1050,t),move=ease(680,1500,t),thrust=ease(d.hit-300,d.hit,t),settle=ease(d.hit,d.hit+350,t);
    this.spear.position.copy(o.mate).lerp(o.target,move);this.spear.position.z+=mix(6,(v===1?132:v===2?140:v===4?145:146)*(knight?1.04:1),wRise)*(1-settle);
    this.spear.rotation.set(mix(-.22,-Math.PI/2,thrust),0,(v===2?-.6:.18)*(1-thrust));this.spear.scale.setScalar(wRise*(1-settle)*(knight?1.04:1));
  }
}
