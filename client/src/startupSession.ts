import type {User} from './net/api';
import {withDeadline} from './net/deadline';
/** Start auth alongside the large application download, with a bounded body read. */
export async function startupSession(): Promise<User | null | undefined> {
  if(location.hostname.startsWith('admin.') || location.pathname === '/admin')return undefined;
  const controller=new AbortController();
  try {
    return await withDeadline((async()=>{
      const response=await fetch('/api/auth/me',{credentials:'include',signal:controller.signal,headers:{'Content-Type':'application/json'}});
      if(!response.ok)throw Error('Session service unavailable');
      const data=await response.json() as {user?:User|null};
      if(!data||!Object.hasOwn(data,'user'))throw Error('Invalid session response');
      return data.user;
    })(),10000);
  } finally {controller.abort();}
}
