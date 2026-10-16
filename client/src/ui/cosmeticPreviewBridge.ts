/** Appearance adapter shared by equipped cosmetics and the isolated studio.
 * Studio overrides are registered explicitly; ordinary games resolve equipment. */
import type * as T from 'three';
import type {PileModel} from './pileModels';
export interface CosmeticPreviewAdapter {
 readonly revision:number;
 /** Optional bounded raster density for fine cosmetic geometry. */
 readonly pixelRatio?:number;
 /** Optional coverage sampling for magnified inspection. */
 readonly antialiasSamples?:number;
 applyFurniture(model:T.Group,element:HTMLElement):void;
 decoratePile(pile:PileModel,element:HTMLElement):()=>void;
 tick(now:number):boolean;
 render(renderer:T.WebGLRenderer,camera:T.Camera,depth?:T.Texture):void;
 dispose():void;
}
const previews=new WeakMap<HTMLElement,CosmeticPreviewAdapter>();
export function registerCosmeticPreview(root:HTMLElement,adapter:CosmeticPreviewAdapter){previews.set(root,adapter);return()=>{previews.delete(root);};}
export function getCosmeticPreview(root:HTMLElement){return previews.get(root);}
