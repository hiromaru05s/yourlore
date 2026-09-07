/// <reference types="vite/client" />
/** Local visual QA for the real profile component. Never bundled for staging. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/screens.css';
import { mountProfile } from '../screens/profile';
import { api } from '../net/api';
import { setLang } from '../i18n';
import type { App } from '../router';
if (import.meta.env.DEV) {
  setLang('ja');
  let avatar = localStorage.getItem('lore_profile_lab_avatar') || 'SEEKER_BLUE';
  api.profile = async () => ({id:'fixture',self:true,display:'シーカー',avatar,badge:null,created_at:Date.now(),wins:3,losses:1,recent:[]});
  api.updateMe = async patch => {
    avatar = patch.avatar || avatar; localStorage.setItem('lore_profile_lab_avatar',avatar);
    return {ok:true,display:'シーカー',avatar,badge:null,stats_public:true,sleeve:'default'};
  };
  mountProfile({root:document.getElementById('app')!,user:{avatar},home:()=>{location.href='/duel-lab.html';}} as App);
}
