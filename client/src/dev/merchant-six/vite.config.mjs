import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,server:{host:'127.0.0.1',port:55143,strictPort:true,fs:{allow:[root,new URL('../../../../',import.meta.url).pathname]}},build:{rollupOptions:{input:root+'merchant-six.html'},outDir:'/tmp/lore-merchant-six-build'}});
