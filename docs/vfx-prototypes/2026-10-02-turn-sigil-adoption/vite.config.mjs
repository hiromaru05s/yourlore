import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default defineConfig({root,publicDir:root+'client/public',server:{host:'127.0.0.1',port:5315,strictPort:true}});
