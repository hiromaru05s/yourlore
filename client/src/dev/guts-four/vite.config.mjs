import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default defineConfig({root,server:{host:'127.0.0.1',port:5526,strictPort:true},build:{outDir:'../docs/vfx-prototypes/2026-10-12-guts-four/build',emptyOutDir:true,rollupOptions:{input:fileURLToPath(new URL('../../../guts-four.html',import.meta.url))}}});
