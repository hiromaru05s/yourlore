import {defineConfig} from 'vite';
const root=new URL('../../../',import.meta.url).pathname;
export default defineConfig({root,publicDir:root+'client/public',cacheDir:'/tmp/lore-gacha-trio-runtime-cache',server:{host:'127.0.0.1',port:5612,strictPort:true},plugins:[{name:'entry',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/'||req.url?.startsWith('/?'))req.url='/docs/releases/2026-10-15-gacha-trio/index.html'+(req.url.slice(1)||'');next();});}}]});
