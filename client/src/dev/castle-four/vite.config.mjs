import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,server:{host:'127.0.0.1',port:5474,strictPort:true,fs:{allow:[new URL('../../../../',import.meta.url).pathname,'/Users/hiromaru05s/Desktop/LORE_TCG']}},build:{outDir:'../docs/vfx-prototypes/2026-10-12-castle-four/build',emptyOutDir:true,rollupOptions:{input:root+'castle-four.html'}}});
