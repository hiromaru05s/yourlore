import '../main';
import { App } from '../router';
import { initLang } from '../i18n';
import { SINGLE_DIFFICULTIES } from '../shared/botNpcs';
import { canUseLocalGuest, LOCAL_GUEST_KEY, loadLocalDevDecks, loadLocalGuestProfile } from './localAccount';

if(import.meta.env.DEV && canUseLocalGuest()) {
  initLang('ja');
  localStorage.setItem(LOCAL_GUEST_KEY,'1');
  const params=new URLSearchParams(location.search);
  const decks=loadLocalDevDecks(),profile=loadLocalGuestProfile(),app=new App(document.querySelector('#app')!);
  const clears=Math.min(3,Math.max(0,Number(params.get('clears'))||0));
  app.user={id:'local-guest-user',email:'guest@local.test',display:'ARCHIVIST',credits:profile.credits,
    wins:0,losses:0,avatar:profile.avatar,background:profile.background,decks,deck:decks.list[decks.sel].cards,
    botClears:SINGLE_DIFFICULTIES.slice(0,clears)};
  if(params.has('home'))app.home();
  else app.single({page:0,tab:params.has('story')?'story':'battle'});
}
