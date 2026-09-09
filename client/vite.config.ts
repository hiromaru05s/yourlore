import { defineConfig } from "vite";

// Frontend deploys to Cloudflare Pages (static). API + WebSocket calls go to the
// Worker; in dev we proxy /api and /ws to the local wrangler dev server (8787).
export default defineConfig({
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
    sourcemap: true,
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        tablePreview: new URL('./table-preview.html', import.meta.url).pathname,
      },
    },
  },
});
