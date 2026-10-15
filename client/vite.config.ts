import { defineConfig } from "vite";
import {menuCacheManifest} from "../scripts/menu-cache-manifest.mjs";
const menuManifest=await menuCacheManifest(new URL(".",import.meta.url).pathname);

// Frontend deploys to Cloudflare Pages (static). API + WebSocket calls go to the
// Worker; in dev we proxy /api and /ws to the local wrangler dev server (8787).
export default defineConfig({
  define: {__LORE_MENU_MANIFEST__: JSON.stringify("/"+menuManifest.fileName)},
  plugins: [{name:"menu-cache-manifest",generateBundle(){this.emitFile({type:"asset",fileName:menuManifest.fileName,source:menuManifest.json});},configureServer(server){server.middlewares.use("/"+menuManifest.fileName,(_req,res)=>{res.setHeader("Content-Type","application/json");res.end(menuManifest.json);});}}],
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
