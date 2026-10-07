import {defineConfig} from 'vite';
export default defineConfig({root:new URL('../../../client/',import.meta.url).pathname,build:{copyPublicDir:false,outDir:new URL('./qa/build/',import.meta.url).pathname,emptyOutDir:true,rollupOptions:{input:new URL('../../../client/elemental-seven.html',import.meta.url).pathname}}});
