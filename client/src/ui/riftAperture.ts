import * as T from 'three';
import {createRiftIdleMaterial} from './riftIdleMaterial';
import {riftOutline} from './riftGeometry';
/** Fill the rail interior on the tabletop, including the old wooden crescent.
 * Metal ribs depth-occlude this surface in the same camera as the board. */
export function mountRiftApertures(parent:T.Group){
 const material=createRiftIdleMaterial();
 // Undo the cutter inset: the surface ends underneath the rail centerlines.
 const outline=riftOutline().map(([x,z])=>new T.Vector2(.71+(x-.71)/.97,.225+(z-.225)/.965));
 const faces=T.ShapeUtils.triangulateShape(outline,[]).flat();
 const xs=outline.map(p=>p.x),ys=outline.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
 const meshes=[1,-1].map(sign=>{
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(outline.flatMap(p=>[p.x,.014,p.y*sign]),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(outline.flatMap(p=>[(p.x-minX)/w,(p.y-minY)/h]),2));
  geometry.setIndex(faces);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);mesh.layers.enable(2);mesh.name=sign>0?'Rift player full aperture':'Rift opponent full aperture';parent.add(mesh);return mesh;
 });
 let last=-Infinity,wasReduced=false,disposed=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 return {tick(now:number){
  if(disposed||document.hidden)return false;
  const reduce=reduced.matches;
  // Paint once on a preference change, then freeze the reduced-motion surface.
  if(reduce===wasReduced&&(reduce&&Number.isFinite(last)||now-last<1000/30))return false;
  last=now;wasReduced=reduce;material.uniforms.time.value=reduce?0:now/1000;return true;
 },dispose(){if(disposed)return;disposed=true;meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});material.dispose();}};
}
