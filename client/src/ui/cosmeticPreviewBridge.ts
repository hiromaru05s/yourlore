/** Optional appearance adapter for the isolated cosmetic studio. No catalog or
 * account changes: ordinary games never register an adapter. */
import type * as T from 'three';
import type {PileModel} from './pileModels';
export interface CosmeticPreviewAdapter {
 readonly revision:number;
 /** Audit-only raster override. Ordinary matches never register this adapter. */
 readonly pixelRatio?:number;
 applyFurniture(model:T.Group,element:HTMLElement):void;
 decoratePile(pile:PileModel,element:HTMLElement):()=>void;
 tick(now:number):boolean;
 render(renderer:T.WebGLRenderer,camera:T.Camera,depth?:T.Texture):void;
 dispose():void;
}
const previews=new WeakMap<HTMLElement,CosmeticPreviewAdapter>();
export function registerCosmeticPreview(root:HTMLElement,adapter:CosmeticPreviewAdapter){previews.set(root,adapter);return()=>{previews.delete(root);};}
export function getCosmeticPreview(root:HTMLElement){return previews.get(root);}
