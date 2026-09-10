import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default defineConfig({root,publicDir:root+'client/public',server:{host:'127.0.0.1',port:5196,strictPort:true},plugins:[{name:'preview-entry',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/'||req.url?.startsWith('/?'))req.url='/docs/vfx-prototypes/2026-09-10-attack-up-refined/index.html';next();});}}]});
