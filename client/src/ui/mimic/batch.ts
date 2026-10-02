import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Bake rigid ornament parts into one draw per opaque material. Parent motion,
 * authored vertices, normals, UVs, materials and lighting remain unchanged. */
export function batchOrnament(root:T.Group):T.Group {
 root.updateMatrixWorld(true);
 const groups=new Map<T.Material,T.BufferGeometry[]>();
 const originals=new Set<T.BufferGeometry>();
 root.traverse(node=>{
  if(!(node instanceof T.Mesh))return;
  if(Array.isArray(node.material)||node.material.transparent)throw Error('Only opaque single-material ornaments can be batched');
  {
   const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
   // All authored ornaments have position, normal and UV attributes. Preserve
   // their original vertex order and index winding, including mirrored parts.
   if(!geometry.index)geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));
   const parts=groups.get(node.material)??[];parts.push(geometry);groups.set(node.material,parts);originals.add(node.geometry);
  }
 });
 const merged:T.Mesh[]=[];
 try {
  for(const [material,parts] of groups){const geometry=mergeGeometries(parts);if(!geometry)throw Error('Incompatible ornament geometry');merged.push(new T.Mesh(geometry,material));}
 }catch(error){merged.forEach(m=>m.geometry.dispose());throw error;}
 finally{for(const parts of groups.values())parts.forEach(g=>g.dispose());}
 root.clear();root.add(...merged);originals.forEach(g=>g.dispose());return root;
}
