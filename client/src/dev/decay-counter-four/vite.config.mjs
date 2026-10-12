import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,server:{host:'127.0.0.1',port:55264,strictPort:true,fs:{allow:[root,new URL('../../../../',import.meta.url).pathname]}},build:{copyPublicDir:false,rollupOptions:{input:root+'decay-counter-four.html'},outDir:'/tmp/lore-decay-counter-four-build'}});
