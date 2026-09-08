/** Procedural library furniture and reusable thin, rounded card stock. */
import * as T from 'three';

export interface PileModel { group:T.Group; cards:T.Group; top:T.Object3D; }
const RATIO=1/.64;
function rounded(w:number,h:number,r:number):T.Shape {
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
/** Same 0.64 proportions/rounded stock as the moving PaperCard, with fewer
 * vertices for resting stacks. The sleeve is shared, never per-card geometry. */
export function cardStock(map:T.Texture, face?:T.Texture):T.Group {
  const g=new T.Group();g.name='card-stock';
  const shape=rounded(1,RATIO,.045);
  const edge=new T.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false,curveSegments:4});edge.translate(0,0,-.004);
  const stock=new T.Mesh(edge,new T.MeshStandardMaterial({color:0xccbea5,roughness:.85}));stock.castShadow=true;stock.receiveShadow=true;g.add(stock);
  const skin=(texture:T.Texture,back:boolean)=>{
    const geo=new T.ShapeGeometry(shape,4),p=geo.getAttribute('position'),uv=geo.getAttribute('uv');
    for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)+.5,p.getY(i)/RATIO+.5);
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({map:texture,roughness:.56,metalness:.035,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.12}));
    mesh.name=back?'stock-back':'stock-front';
    mesh.position.z=back?-.0045:.0045;if(back)mesh.rotation.y=Math.PI;
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  };
  skin(face||map,false);skin(map,true);return g;
}
/** Sculpted archive tray: broad silhouette first, bevels catch the table light. */
export function makePile(count:number,shelf:boolean,sleeve:T.Texture,face?:T.Texture):PileModel {
  const group=new T.Group(),cards=new T.Group();group.add(cards);
  let top:T.Object3D=new T.Object3D();group.add(top);
  const navy=new T.MeshPhysicalMaterial({color:0x162c43,roughness:.34,metalness:.3,clearcoat:.6,clearcoatRoughness:.3});
  const dark=new T.MeshStandardMaterial({color:0x0a1522,roughness:.72});
  const brass=new T.MeshStandardMaterial({color:0xc3aa76,roughness:.36,metalness:.76});
  const ivory=new T.MeshStandardMaterial({color:0xd0cab8,roughness:.65,metalness:.1});
  const add=(geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0)=>{
    const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  const plate=(w:number,d:number,h:number,y:number,mat:T.Material,r=.13)=>{
    const geo=new T.ExtrudeGeometry(rounded(w,d,r),{depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.016,bevelSegments:3,curveSegments:6});
    const m=add(geo,mat,0,y,0);m.rotation.x=-Math.PI/2;return m;
  };
  const bead=(x:number,y:number,z:number)=>{
    const m=add(new T.IcosahedronGeometry(.065,1),brass,x,y,z);m.scale.y=.5;
  };
  if(!shelf) {
    // A recessed draw well like a bound folio, with a visible layered stock edge.
    plate(1.28,1.92,.065,.035,dark);
    plate(1.25,1.89,.035,.1,brass);
    plate(1.17,1.81,.06,.14,navy);
    plate(1.035,1.65,.015,.205,dark,.06);
    for(const x of [-.53,.53])for(const z of [-.82,.82])bead(x,.23,z);
    const n=Math.min(count,20),height=Math.min(count,40)*.019;
    for(let i=0;i<n;i++) {
      const card=cardStock(sleeve);card.rotation.set(-Math.PI/2,0,Math.sin(i*7)*.007);
      card.position.set(Math.sin(i*5)*.005,.23+(n<=1?0:i/(n-1)*height),Math.cos(i*3)*.005);
      cards.add(card);top=card;
    }
    if(!n)top.position.y=.23;
    return {group,cards,top};
  }
  // Carved sweeping bookends replace the rectangular cage. Cards remain the
  // main silhouette; ornament lives on the cradle, never over their artwork.
  plate(1.93,1.35,.075,.03,dark);
  plate(1.91,1.32,.035,.11,brass);
  plate(1.81,1.23,.1,.15,navy);
  plate(1.64,1.08,.025,.26,dark);
  const wing=new T.Shape();
  wing.moveTo(-.6,.2);wing.lineTo(.58,.2);wing.lineTo(.58,.42);
  wing.bezierCurveTo(.4,.39,.2,.42,.1,.67);
  wing.bezierCurveTo(-.08,1.02,-.3,1.16,-.53,1.08);
  wing.quadraticCurveTo(-.64,.72,-.6,.2);
  for(const x of [-.88,.88]) {
    const geo=new T.ExtrudeGeometry(wing,{depth:.08,bevelEnabled:true,bevelSize:.035,bevelThickness:.03,bevelSegments:3,curveSegments:12});
    const m=add(geo,navy,x,0,0);m.rotation.y=Math.PI/2;
    // Inlaid graceful brass line follows the sculpted wing, with a pale finial.
    const path=new T.CatmullRomCurve3([new T.Vector3(x,.31,.55),new T.Vector3(x,.43,.25),new T.Vector3(x,.82,-.16),new T.Vector3(x,1.05,-.46)]);
    add(new T.TubeGeometry(path,24,.019,6,false),brass);
    const stone=add(new T.OctahedronGeometry(.1),ivory,x,1.085,-.47);stone.scale.set(.65,1,.65);
  }
  // Low curved front rail, layered brass edging and a small celestial clasp.
  const rail=new T.Shape();rail.moveTo(-.85,.28);rail.lineTo(.85,.28);rail.lineTo(.85,.43);
  rail.quadraticCurveTo(0,.29,-.85,.43);rail.closePath();
  add(new T.ExtrudeGeometry(rail,{depth:.055,bevelEnabled:true,bevelThickness:.018,bevelSize:.015,bevelSegments:3}),brass,0,0,.56);
  const clasp=add(new T.OctahedronGeometry(.115),brass,0,.36,.64);clasp.scale.set(1,.8,.35);
  const inset=add(new T.OctahedronGeometry(.064),new T.MeshPhysicalMaterial({color:0x9ed3e0,metalness:.25,roughness:.23,clearcoat:1}),0,.36,.69);inset.scale.z=.25;
  const n=Math.min(count,12);
  for(let i=0;i<n;i++) {
    const card=cardStock(sleeve,i===n-1?face:undefined);
    card.rotation.set(-.18,0,Math.PI/2);
    card.position.set((i-(n-1)/2)*.009,.83+(n-1-i)*.012,-.38+i*.071);
    cards.add(card);top=card;
  }
  if(!n)top.position.set(0,.83,.2);
  return {group,cards,top};
}
