import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,server:{host:'127.0.0.1',port:5467,strictPort:true,hmr:false,watch:{ignored:['**/qa/**']}},build:{target:'esnext',outDir:'../docs/vfx-prototypes/2026-10-08-chosen-heroes-six/qa/build',emptyOutDir:true,copyPublicDir:false,rollupOptions:{input:root+'chosen-heroes-six.html'}}});
