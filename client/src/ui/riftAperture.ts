import * as T from 'three';
import {acquireVoidSurface,drawVoidSurface} from './voidSurface';
import {riftOutline} from './riftGeometry';
/** Fill the rail interior on the tabletop, including the old wooden crescent.
 * Metal ribs depth-occlude this surface in the same camera as the board. */
export function mountRiftApertures(parent:T.Group){
 const source=document.createElement('canvas');source.width=192;source.height=320;
 const context=source.getContext('2d')!,release=acquireVoidSurface();
 const texture=new T.CanvasTexture(source);texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
 // Undo the cutter inset: the surface ends underneath the rail centerlines.
 const outline=riftOutline().map(([x,z])=>new T.Vector2(.71+(x-.71)/.97,.225+(z-.225)/.965));
 const faces=T.ShapeUtils.triangulateShape(outline,[]).flat();
 const xs=outline.map(p=>p.x),ys=outline.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
 const meshes=[1,-1].map(sign=>{
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(outline.flatMap(p=>[p.x,.014,p.y*sign]),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(outline.flatMap(p=>[(p.x-minX)/w,(p.y-minY)/h]),2));
  geometry.setIndex(faces);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);mesh.name=sign>0?'Rift player full aperture':'Rift opponent full aperture';parent.add(mesh);return mesh;
 });
 let last=-Infinity;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 return {tick(now:number){
  if(document.hidden||now-last<83||reduced.matches&&last>0)return false;
  last=now;drawVoidSurface(context,192,320,reduced.matches?0:now/1000);texture.needsUpdate=true;return true;
 },dispose(){meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});material.dispose();texture.dispose();release();}};
}
