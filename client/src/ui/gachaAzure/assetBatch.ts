import * as T from 'three';
/** Drain concurrent loads before reporting failure, releasing successful partial loads. */
export async function assetBatch<const P extends readonly unknown[]>(pending:{[K in keyof P]:Promise<P[K]>}):Promise<P>{
 const results=await Promise.allSettled(pending);
 const failed=results.find(r=>r.status==='rejected');
 if(failed?.status==='rejected'){
  const textures=new Set<T.Texture>(),geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
  const release=(asset:unknown)=>{
   if(asset instanceof T.Texture)textures.add(asset);
   else if(Array.isArray(asset))asset.forEach(release);
   else if(asset&&typeof asset==='object'&&'scene' in asset&&(asset as {scene:unknown}).scene instanceof T.Object3D){
    (asset as {scene:T.Object3D}).scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v)})}}});
   }
  };
  results.forEach(r=>{if(r.status==='fulfilled')release(r.value)});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());throw failed.reason;
 }
 return results.map(r=>(r as PromiseFulfilledResult<unknown>).value) as unknown as P;
}
