import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default defineConfig({root,server:{host:'127.0.0.1',port:5496,strictPort:true,fs:{allow:[fileURLToPath(new URL('../../../../',import.meta.url)),'/Users/hiromaru05s/Desktop/LORE_TCG/node_modules']}},build:{copyPublicDir:false,outDir:'../docs/vfx-prototypes/2026-10-13-silence-purple-r3/build',emptyOutDir:true,rollupOptions:{input:root+'silence-four.html'}}});
