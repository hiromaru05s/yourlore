import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-webgl-policy-'));
try{for(const dev of [true,false]){const file=dir+'/'+dev+'.mjs';await build({entryPoints:['client/src/ui/webglRenderer.ts'],bundle:true,format:'esm',outfile:file,define:{'import.meta.env':JSON.stringify({DEV:dev})},plugins:[{name:'driver',setup(b){b.onResolve({filter:/^three$/},()=>({path:'three',namespace:'driver'}));b.onLoad({filter:/.*/,namespace:'driver'},()=>({contents:'export class WebGLRenderer{debug={checkShaderErrors:true};constructor(options){this.options=options;}}'}));}}]});const {createWebGLRenderer}=await import(file);const options={alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'},r=createWebGLRenderer(options);assert.equal(r.options,options,'Do not alter quality or renderer settings');assert.equal(r.debug.checkShaderErrors,dev,'Development retains diagnostics; production avoids synchronous shader log readback');}console.log('PASS: authored renderer options unchanged, development diagnostics preserved, production driver log synchronization removed');}finally{await fs.rm(dir,{recursive:true,force:true});}
