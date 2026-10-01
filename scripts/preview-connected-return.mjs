/** Isolated dev preview. Separate Vite cache prevents other local studies from reloading captures. */
import {createServer} from 'vite';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../client/',import.meta.url));
const server=await createServer({configFile:false,root,cacheDir:path.join(os.tmpdir(),'lore-connected-return-vite-cache'),server:{host:'127.0.0.1',port:5198,strictPort:true,hmr:false,watch:null}});
await server.listen();console.log('http://127.0.0.1:5198/shelf-return-lab.html?connected=1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)});
