declare const __LORE_STARTUP_ASSETS__: Record<string,string>;
/** Content-addressed URLs in Vite; original paths in standalone tests. */
export function startupAssetUrl(url:string):string {
 return typeof __LORE_STARTUP_ASSETS__==='undefined'?url:(__LORE_STARTUP_ASSETS__[url]??url);
}
