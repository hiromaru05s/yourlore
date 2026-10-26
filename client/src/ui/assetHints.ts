/** Asset declarations for fixed gallery card structure. Weak ownership keeps
 * destroyed pages collectible, and live img sources still follow srcset choice. */
export const assetHints=new WeakMap<Element,()=>string[]>();
/** Gallery rows outside their scrollport do not block initial interaction. */
export const galleryCards=new WeakSet<Element>();
