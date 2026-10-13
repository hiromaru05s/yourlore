import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,build:{copyPublicDir:false,outDir:'dist-shield-titan-preview',emptyOutDir:true,rollupOptions:{input:new URL('../../../shield-titan-four.html',import.meta.url).pathname}}});
