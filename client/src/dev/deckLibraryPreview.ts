import '../main';
import {App} from '../router';
import {initLang} from '../i18n';
import {DECK_POOL, SLEEVE_LIST} from '../shared/cards';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {COSMETICS} from '../shared/cosmetics';
import {starterBackgrounds} from '../shared/profileAppearance';
import {canUseLocalGuest,LOCAL_GUEST_KEY,loadLocalDevDecks,loadLocalGuestProfile,saveLocalDevDecks,saveLocalGuestProfile} from './localAccount';

if(import.meta.env.DEV && canUseLocalGuest()){
  initLang('ja');
  localStorage.setItem(LOCAL_GUEST_KEY,'1');
  if(!localStorage.getItem('lore_local_dev_decks')){
    const themes=[
      ['星詠みの書庫','FORESIGHT'],['紅蓮の儀式','FLAME'],['幽霊の行進','GHOST'],
      ['エルフの聖域','ELF_HAVEN'],['運命の輪','FATE_WHEEL'],['ギルドの契約','GUILD_CO'],
      ['古代の遺産','ANCIENT_CIV'],['星晶の宝箱','STARTER_CHEST'],['血の誓約','BLOOD_RITE'],
    ];
    const profile=loadLocalGuestProfile();
    saveLocalGuestProfile({...profile, sleeves:['default',...COSMETICS.map(item=>item.id),...CARD_EFFECTS.map(item=>item.id)]});
    saveLocalDevDecks({sel:0,list:themes.map(([name,featured],index)=>({
      name, cards:[featured,...Array.from({length:7},(_,j)=>DECK_POOL[(index*4+j)%DECK_POOL.length])],
      sleeve:SLEEVE_LIST[index]?.id,background:starterBackgrounds[index%starterBackgrounds.length],
    }))});
  }
  const decks=loadLocalDevDecks(),profile=loadLocalGuestProfile(),app=new App(document.querySelector('#app')!);
  app.user={id:'local-guest-user',email:'guest@local.test',display:'ARCHIVIST',credits:profile.credits,wins:0,losses:0,avatar:profile.avatar,background:profile.background,decks,deck:decks.list[decks.sel].cards};
  const slot=Number(new URLSearchParams(location.search).get('slot'));
  app.deck(slot>=1 && slot<=9 ? {slot:slot-1} : {});
}
