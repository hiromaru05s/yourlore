import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../..',import.meta.url));
export default defineConfig({root,server:{host:'127.0.0.1',port:5479,strictPort:true,fs:{allow:[fileURLToPath(new URL('../../../../..',import.meta.url))]}},build:{target:'es2022',outDir:'dist-evade-four',rollupOptions:{input:fileURLToPath(new URL('../../../evade-four.html',import.meta.url))}}});
