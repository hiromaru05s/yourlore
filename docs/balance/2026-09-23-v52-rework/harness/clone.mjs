// Equivalent plain-state clone with primitive values copied inline.
// Preserve holes, enumerable string properties, repeated references and cycles.
const nativeClone=globalThis.structuredClone;
export function cloneState(value){
 if(value===null||typeof value!=='object')return value;
 const seen=new Map();
 const copy=v=>{
  const previous=seen.get(v);if(previous!==undefined)return previous;
  const proto=Object.getPrototypeOf(v);
  if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)return nativeClone(v);
  const out=Array.isArray(v)?new Array(v.length):{};seen.set(v,out);
  for(const k of Object.keys(v)){const child=v[k];out[k]=child!==null&&typeof child==='object'?copy(child):child;}
  return out;
 };
 return copy(value);
}
export function installClone(){globalThis.structuredClone=cloneState;}
