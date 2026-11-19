import '../main';
import {App} from '../router';
import {initLang} from '../i18n';
import {playCardHubEntrance} from '../ui/cardHubEntrance';
import {canUseLocalGuest,LOCAL_GUEST_KEY,loadLocalDevDecks,loadLocalGuestProfile} from './localAccount';

if(import.meta.env.DEV&&canUseLocalGuest()){
  initLang('ja');
  localStorage.setItem(LOCAL_GUEST_KEY,'1');
  const decks=loadLocalDevDecks(),profile=loadLocalGuestProfile();
  const app=new App(document.querySelector('#app')!);
  app.user={id:'local-guest-user',email:'guest@local.test',display:'ARCHIVIST',credits:profile.credits,
    wins:0,losses:0,avatar:profile.avatar,background:profile.background,decks,deck:decks.list[decks.sel].cards};
  app.cardHub();
  const controls=document.createElement('div');
  controls.style.cssText='position:fixed;z-index:9999;right:16px;top:86px;display:flex;gap:8px;align-items:center;color:#dce9f5;font:12px system-ui';
  controls.innerHTML='<button class="btn btn-ghost" data-replay>もう一度</button><label><input type="checkbox" data-slow> スロー</label>';
  document.body.append(controls);
  let stop=()=>{};
  controls.querySelector('button')!.onclick=()=>{
    stop();
    const root=document.querySelector<HTMLElement>('.card-hub');
    if(!root){app.cardHub();return;}
    stop=playCardHubEntrance(root,controls.querySelector<HTMLInputElement>('input')!.checked?.35:1);
  };
}
