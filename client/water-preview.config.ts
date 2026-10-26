import base from './vite.config';
import {mergeConfig} from 'vite';
export default mergeConfig(base,{plugins:[{name:'water-preview-only',enforce:'pre',resolveId(source:string,importer?:string){if(source==='./homeAtmosphere'&&importer?.endsWith('/ui/homeAtmosphereLoader.ts'))return new URL('./src/dev/home-water-three/atmosphere.ts',import.meta.url).pathname;}}]});
