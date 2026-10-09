import * as T from 'three';

/** Shared base finish for the actual board and catalog renders. */
export function applyFurnitureSkin(model:T.Group, skin:T.Texture):void {
  skin.flipY=false;
  model.traverse(o=>{
    if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
      if(m instanceof T.MeshStandardMaterial&&m.metalness<.7){
        m.map=skin;m.color.set(0xffffff);m.needsUpdate=true;
      }
    }
  });
}
