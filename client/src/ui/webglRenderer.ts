import {WebGLRenderer,type WebGLRendererParameters} from 'three';
/** Preserve every authored renderer option. Production avoids synchronous driver
 * diagnostic readbacks on each newly linked shader; development keeps full logs. */
export function createWebGLRenderer(options?:WebGLRendererParameters):WebGLRenderer{
 const renderer=new WebGLRenderer(options);
 renderer.debug.checkShaderErrors=import.meta.env?.DEV??true;
 return renderer;
}
