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
    mesh.position.z=back?-.0045:.0045;if(back)mesh.rotation.y=Math.PI;
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  };
  skin(face||map,false);skin(map,true);return g;
}
export function makePile(count:number,shelf:boolean,sleeve:T.Texture,face?:T.Texture):PileModel {
  const group=new T.Group(),cards=new T.Group();group.add(cards);
  let top:T.Object3D=new T.Object3D();group.add(top);
  if(!shelf) {
    const n=Math.min(count,20),height=Math.min(count,50)*.011;
    for(let i=0;i<n;i++) {
      const card=cardStock(sleeve);card.rotation.set(-Math.PI/2,0,Math.sin(i*7)*.013);
      card.position.set(Math.sin(i*5)*.009,.016+(n<=1?0:i/(n-1)*height),Math.cos(i*3)*.009);
      cards.add(card);top=card;
    }
    return {group,cards,top};
  }
  // Low white-stone plinth, navy enamel cradle, brass rails and finials.
  const stone=new T.MeshStandardMaterial({color:0xcac5b5,roughness:.73,metalness:.06});
  const navy=new T.MeshStandardMaterial({color:0x152943,roughness:.34,metalness:.35});
  const brass=new T.MeshStandardMaterial({color:0xb79a5f,roughness:.3,metalness:.72});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  box(1.94,.13,1.24,0,.065,0,stone);
  box(1.82,.04,1.12,0,.15,0,brass);
  box(1.73,.12,1.04,0,.21,0,navy);
  box(1.64,.035,.96,0,.285,0,stone);
  for(const x of [-.87,.87]) {
    box(.12,.64,.98,x,.56,0,navy);
    box(.16,.05,1.05,x,.9,0,brass);
    for(const z of [-.48,.48]) {
      const post=new T.Mesh(new T.CylinderGeometry(.035,.048,.66,8),brass);post.position.set(x,.56,z);group.add(post);
      const gem=new T.Mesh(new T.OctahedronGeometry(.067),brass);gem.position.set(x,.94,z);group.add(gem);
    }
  }
  box(1.64,.16,.055,0,.39,.51,navy);
  box(1.69,.025,.065,0,.48,.52,brass);
  // Landscape cards stand in parallel grooves, faces toward the player.
  const n=Math.min(count,12);
  for(let i=0;i<n;i++) {
    const card=cardStock(sleeve,i===n-1?face:undefined);
    card.rotation.set(-.13,0,Math.PI/2);
    card.position.set(Math.sin(i*2)*.014,.83,-.39+i*.071);
    cards.add(card);top=card;
  }
  return {group,cards,top};
}
