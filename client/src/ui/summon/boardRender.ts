import type {Camera,Object3D,Scene,WebGLRenderer} from 'three';

/** The printed face carries its own alpha contour. Studio stock boxes and
 * rectangular shadow plates must never become a second frame in a live game.
 * Restore visibility so comparison studios keep their existing presentation. */
export function renderSummonBoard(renderer:WebGLRenderer,scene:Scene,camera:Camera,backings:readonly Object3D[]):void {
 const visible=backings.map(object=>object.visible);
 backings.forEach(object=>{object.visible=false;});
 try{renderer.render(scene,camera);}
 finally{backings.forEach((object,index)=>{object.visible=visible[index];});}
}
