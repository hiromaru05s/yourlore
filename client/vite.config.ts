import {clientSourceRevision} from "../scripts/client-source-revision.mjs";
import { defineConfig } from "vite";
import {menuCacheManifest} from "../scripts/menu-cache-manifest.mjs";
import {furnitureCacheRevision} from "../scripts/furniture-cache-revision.mjs";
const menuManifest=await menuCacheManifest(new URL(".",import.meta.url).pathname);

const duelPreloadName=`assets/duel-preload-${await clientSourceRevision(new URL(".",import.meta.url).pathname,menuManifest.fileName)}.json`;

// Frontend deploys to Cloudflare Pages (static). API + WebSocket calls go to the
// Worker; in dev we proxy /api and /ws to the local wrangler dev server (8787).
export default defineConfig({
  define: {__LORE_DUEL_PRELOAD__:JSON.stringify("/"+duelPreloadName),__LORE_FURNITURE_REVISION__:JSON.stringify(await furnitureCacheRevision(new URL(".",import.meta.url).pathname,menuManifest.fileName)),__LORE_MENU_MANIFEST__: JSON.stringify("/"+menuManifest.fileName)},
  plugins: [{name:"menu-cache-manifest",generateBundle(_options,bundle){
    const seen=new Set<string>(),modules:string[]=[],assets=new Set<string>();
    const visit=(name:string)=>{if(seen.has(name))return;seen.add(name);const chunk=bundle[name];if(!chunk||chunk.type!=="chunk")return;modules.push("/"+name);for(const dependency of [...chunk.imports,...chunk.dynamicImports])visit(dependency);for(const asset of [...((chunk as any).viteMetadata?.importedAssets??[]),...((chunk as any).viteMetadata?.importedCss??[])])assets.add("/"+asset);};
    for(const [name,item] of Object.entries(bundle))if(item.type==="chunk"&&Object.keys(item.modules).some(id=>id.endsWith("/screens/game.ts")))visit(name);
    for(const name of Object.keys(bundle))if(/\.worker-[^/]+\.js$/.test(name))assets.add("/"+name);
    this.emitFile({type:"asset",fileName:duelPreloadName,source:JSON.stringify({modules,assets:[...assets]})});
    this.emitFile({type:"asset",fileName:menuManifest.fileName,source:menuManifest.json});for(const asset of menuManifest.assets)this.emitFile({type:"asset",...asset});},configureServer(server){for(const asset of menuManifest.assets)server.middlewares.use("/"+asset.fileName,(_req,res)=>{res.setHeader("Content-Type","application/octet-stream");res.end(asset.source);});server.middlewares.use("/"+menuManifest.fileName,(_req,res)=>{res.setHeader("Content-Type","application/json");res.end(menuManifest.json);});}}],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8787", ws: true },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        shieldTitanRuntime: new URL('./shield-titan-runtime.html', import.meta.url).pathname,
        main: new URL('./index.html', import.meta.url).pathname,
        cosmeticStudio: new URL('./cosmetic-studio.html',import.meta.url).pathname,
        ...(process.env.LORE_BUILD_PREVIEW === '1' ? {tablePreview: new URL('./table-preview.html', import.meta.url).pathname} : {}),
      },
    },
  },
});
