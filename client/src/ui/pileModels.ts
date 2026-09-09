/** Blender furniture mounting and reusable thin, rounded card stock. */
import * as T from 'three';
import { CARD_PADDING } from './cardSurface';

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
    const padded=!back&&!!face;
    const geo=padded?new T.PlaneGeometry(1+2*CARD_PADDING,RATIO+2*CARD_PADDING):new T.ShapeGeometry(shape,4),p=geo.getAttribute('position'),uv=geo.getAttribute('uv');
    if(!padded)for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)+.5,p.getY(i)/RATIO+.5);
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({map:texture,roughness:.56,metalness:.035,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.12,transparent:padded,alphaTest:padded?.025:0}));
    mesh.name=back?'stock-back':'stock-front';
    mesh.position.z=back?-.0045:.0045;if(back)mesh.rotation.y=Math.PI;
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  };
  skin(face||map,false);skin(map,true);return g;
}
/** Shared physical card slots, independent of the equipped Blender furniture. */
export function makePile(count:number,shelf:boolean,sleeve:T.Texture,face?:T.Texture,furniture?:T.Group):PileModel {
  const group=new T.Group(),cards=new T.Group();group.add(cards);
  let top:T.Object3D=new T.Object3D();group.add(top);
  const mount=shelf?.12:.14;
  if(furniture){furniture.position.y=mount;group.add(furniture);}
  else {
    const fallback=new T.Mesh(new T.BoxGeometry(shelf?1.52:1.26,mount,shelf?2.08:1.91),new T.MeshStandardMaterial({color:0xd7cbb0,roughness:.7}));
    fallback.position.y=mount/2;fallback.receiveShadow=true;group.add(fallback);
  }
  if(!shelf){
    const n=Math.min(count,20),height=Math.min(count,40)*.005;
    for(let i=0;i<n;i++){
      const card=cardStock(sleeve);card.rotation.x=-Math.PI/2;
      card.position.set(0,mount+.004+(n<=1?0:i/(n-1)*height),0);cards.add(card);top=card;
    }
    if(!n)top.position.y=mount+.004;
  }else{
    const n=Math.min(count,12),height=Math.min(count,40)*.004;
    for(let j=0;j<n;j++){
      const card=cardStock(sleeve,j===n-1?face:undefined);card.rotation.x=-Math.PI/2;
      card.position.set(0,mount+.006+(n<=1?0:j/(n-1)*height),0);
      cards.add(card);top=card;
    }
    if(!n)top.position.set(0,mount+.006,0);
  }
  top.userData.restY=top.position.y;
  return {group,cards,top};
}
