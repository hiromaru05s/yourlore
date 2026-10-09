import {defineConfig} from 'vite';
export default defineConfig({root:new URL('../../../',import.meta.url).pathname,build:{outDir:'../docs/vfx-prototypes/2026-10-09-gambler-wheel-five/build',rollupOptions:{input:new URL('../../../gambler-wheel-five.html',import.meta.url).pathname}}});
