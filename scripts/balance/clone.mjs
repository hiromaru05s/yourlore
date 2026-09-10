// Simulation-only clone for the engine's plain, JSON-compatible state. Preserve
// repeated references and undefined just like structuredClone; delegate all
// non-plain values to the native implementation. Never used by shipped clients.
const nativeClone=globalThis.structuredClone;
export function cloneState(value){
 const seen=new Map();
 const copy=v=>{
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))return seen.get(v);
  const proto=Object.getPrototypeOf(v);
  if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)return nativeClone(v);
  const out=Array.isArray(v)?new Array(v.length):{};seen.set(v,out);
  for(const k of Object.keys(v))out[k]=copy(v[k]);
  return out;
 };
 return copy(value);
}
export function installClone(){globalThis.structuredClone=cloneState;}
