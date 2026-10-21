import * as T from 'three';

/** User-selected chest 01: a glass drop joined directly to the pearl body. */
export function buildDewFront(body:T.Group){
  const root=new T.Group();root.position.set(0,-.34,.46);root.name='front-dew';body.add(root);
  const add=(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=root)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  const mat=(color:number,metalness=0,roughness=.3)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const shape=(s:T.Shape,depth=.025)=>new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:4,curveSegments:32,steps:1});
  const sphere=(r:number,material:T.Material,x:number,y:number,z:number)=>add(new T.SphereGeometry(r,48,32),material,x,y,z);

    const outline=new T.Shape();outline.moveTo(0,.23);outline.bezierCurveTo(-.055,.15,-.152,.026,-.148,-.067);outline.bezierCurveTo(-.141,-.25,.142,-.25,.148,-.067);outline.bezierCurveTo(.152,.026,.055,.15,0,.23);
    const lip=add(shape(outline,.014),new T.MeshPhysicalMaterial({color:0xc5dedf,roughness:.3,clearcoat:.5}),0,0,-.012);lip.scale.set(1.07,1.035,1);
    const well=add(shape(outline,.012),mat(0x195f82,.22,.27),0,0,.005);well.scale.set(.89,.92,1);
    const profile=new T.SplineCurve([new T.Vector2(0,-.185),new T.Vector2(.112,-.13),new T.Vector2(.14,-.055),new T.Vector2(.104,.04),new T.Vector2(.039,.14),new T.Vector2(0,.218)]).getPoints(64);
    const drop=add(new T.LatheGeometry(profile,64),new T.MeshPhysicalMaterial({color:0x9ce8ee,transmission:.7,thickness:.16,roughness:.07,ior:1.36,attenuationColor:0x4babca,attenuationDistance:.42,clearcoat:1,envMapIntensity:1.1}),0,0,.052);drop.scale.z=.52;
    const seed=sphere(.055,new T.MeshPhysicalMaterial({color:0xddfff2,roughness:.18,emissive:0x3d98ac,emissiveIntensity:.25}),0,-.075,.069);seed.scale.set(.65,1,.35);

  lip.name='zeno-dew-rim';drop.name='zeno-dew-glass';seed.name='zeno-dew-seed';
  return root;
}
