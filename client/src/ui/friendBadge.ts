import type {App} from '../router';
import {api,type FriendsData} from '../net/api';
import {t} from '../i18n';
import {loungeText as L} from './loungeText';
import '../styles/notificationBadges.css';

const eventName='lore:friend-notifications';
type Update={account:string|undefined;count:number};
export function publishFriendNotifications(account:string|undefined,data:FriendsData):void {
  document.dispatchEvent(new CustomEvent<Update>(eventName,{detail:{account,count:data.incoming.length+data.challenges.length}}));
}

/** The friends screen supplies its existing poll; other menus only poll for counts. */
export function mountFriendBadge(app:App,shell:HTMLElement,poll=true):{paint:()=>void;destroy:()=>void} {
  const account=app.user?.id,guest=!account||account==='local-guest-user';
  let count=0,dead=false,serial=0,timer=0,controller:AbortController|undefined;
  const paint=()=>{
    const button=shell.querySelector<HTMLButtonElement>('[data-nav="friends"]');
    if(!button)return;
    button.querySelector('.friend-new-count')?.remove();
    const n=!dead&&!guest&&app.user?.id===account?count:0;
    button.setAttribute('aria-label',t('friends.title')+(n?L(`、新着${n}件`,`, ${n} new`,`、새 알림 ${n}개`):''));
    if(n){const badge=document.createElement('b');badge.className='friend-new-count';badge.setAttribute('aria-hidden','true');badge.textContent=n>99?'99+':String(n);button.querySelector('.horizon-glyph')?.append(badge);}
  };
  const refresh=async()=>{
    if(dead||guest||!poll||document.hidden||app.user?.id!==account)return;
    clearTimeout(timer);controller?.abort();controller=new AbortController();const request=++serial;
    try{const data=await api.friends(controller.signal);if(dead||request!==serial||app.user?.id!==account)return;count=data.incoming.length+data.challenges.length;paint();}catch{/* Keep the last confirmed count while offline. */}
    finally{if(!dead&&request===serial)timer=window.setTimeout(()=>void refresh(),8000);}
  };
  const update=(event:Event)=>{const d=(event as CustomEvent<Update>).detail;if(dead||guest||d.account!==account||app.user?.id!==account)return;count=d.count;paint();};
  const visible=()=>{if(!document.hidden)void refresh();};
  document.addEventListener(eventName,update);document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);
  void refresh();
  return {paint,destroy(){dead=true;++serial;controller?.abort();clearTimeout(timer);document.removeEventListener(eventName,update);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);}};
}
