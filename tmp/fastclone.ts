// Fast deep clone for plain JSON-like state (objects/arrays/primitives/undefined). Replaces the slow Node structuredClone.
function fc(v: any): any {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) { const n = v.length, o = new Array(n); for (let i = 0; i < n; i++) o[i] = fc(v[i]); return o; }
  const o: any = {}; for (const k in v) o[k] = fc(v[k]); return o;
}
(globalThis as any).structuredClone = fc;
