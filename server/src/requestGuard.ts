import type { Env } from './env';
const textFields: Record<string, number> = {email:254,password:1024,token:256,ref:128,source:120,q:254,user_id:128,id:128,display:96,avatar:128,badge:128,sleeve:128,furniture:128,key:128,code:128,title:100,body:2000,state:16};
export function invalidBody(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  for (const [key,v] of Object.entries(value)) {
    if (key in textFields && (typeof v !== 'string' || v.length > textFields[key])) return true;
    if (['accept','stats_public','won','draw'].includes(key) && typeof v !== 'boolean') return true;
  }
  return false;
}
export async function guardRequest(req: Request, env: Env): Promise<Request | Response> {
  const path=new URL(req.url).pathname;
  if (!path.startsWith('/api/') || !['POST','PUT','PATCH'].includes(req.method)) return req;
  const limiter = path.startsWith('/api/auth/') ? env.AUTH_RATE_LIMITER : path==='/api/inquiry' ? env.INQUIRY_RATE_LIMITER : undefined;
  if (limiter) {
    const ip=req.headers.get('CF-Connecting-IP') || 'local';
    const {success}=await limiter.limit({key:ip});
    if (!success) return Response.json({error:'rate limited'}, {status:429,headers:{'Retry-After':'60'}});
  }
  const reader=req.body?.getReader();let length=0;const chunks:Uint8Array[]=[];
  if(reader)try {
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
      if(length>32768){await reader.cancel();return Response.json({error:'request too large'},{status:413});}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  const body=length?new TextDecoder().decode(bytes):"{}";let data:unknown;
  try{data=JSON.parse(body);}catch{return Response.json({error:'invalid request'},{status:400});}
  if(invalidBody(data))return Response.json({error:'invalid request'},{status:400});
  return new Request(req,{body});
}
