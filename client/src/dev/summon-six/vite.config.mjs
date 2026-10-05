import {defineConfig} from 'vite';
import fs from 'node:fs/promises';
const root=new URL('../../../',import.meta.url).pathname;
const qa=new URL('../../../../docs/vfx-prototypes/2026-10-03-summon-six/qa/',import.meta.url).pathname;
export default defineConfig({root,server:{host:'127.0.0.1',port:5318,strictPort:true},plugins:[{name:'local-summon-evidence',configureServer(server){server.middlewares.use('/__summon-evidence',async(req,res)=>{const name=(req.url||'').slice(1);if(req.method!=='POST'||!/^([a-z0-9-]+)\.(png|webm|json)$/.test(name)){res.statusCode=400;res.end();return;}const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>20000000){res.statusCode=413;res.end();return;}chunks.push(c);}await fs.mkdir(qa,{recursive:true});await fs.writeFile(qa+name,Buffer.concat(chunks));res.end('saved');});}}]});
