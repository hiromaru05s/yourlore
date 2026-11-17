import '../../styles/defaultUI.css';
import '../../styles/defaultButtons.css';
import './gallery.css';
import {seekerIdle,seekerPoster} from '../../ui/seekerMotion';
import {mountStudy,studies,type Kind} from './player';

if(import.meta.env.DEV){
  const root=document.querySelector<HTMLElement>('#studies')!;
  root.className='lore-surface';
  root.innerHTML=`<header><h1>シーカーの反応比較</h1><div class="transport"><label><input type="checkbox" checked data-repeat>ループ</label><label>速度 <select aria-label="再生速度"><option value="1">1×</option><option value=".5">0.5×</option></select></label></div></header>`;
  const repeat=root.querySelector<HTMLInputElement>('[data-repeat]')!, rate=root.querySelector('select')!;
  const rows=(['mana','heal'] as const).map(kind=>{
    const section=document.createElement('section');
    section.dataset.kind=kind;
    const title=kind==='mana'?'マナ増加 · M1採用':'体力回復';
    section.innerHTML=`<div class="section-title"><h2>${title}</h2><button class="row-play" type="button">${kind==='mana'?'M1を再生':'基準と3案を同時再生'}</button></div><div class="study-grid"></div>`;
    root.append(section);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const slots=studies.filter(s=>s.kind===kind).map(study=>{
      const card=document.createElement('article');
      card.innerHTML=`<button class="preview" aria-label="${study.id} ${study.name}を再生"><span class="study-frame"><span class="aperture"><span class="film-square"><img class="gallery-film" alt="" src="${reduced.matches?seekerPoster():seekerIdle()}"></span></span></span></button><div class="caption"><b>${study.id==='BASE'?'基準':study.id}</b><h3>${study.name}</h3></div><a href="/hooded-board.html?study=${study.id}" aria-label="${study.name}を実盤面で見る">実盤面で見る ↗</a>`;
      section.querySelector('.study-grid')!.append(card);
      const img=card.querySelector('img')!, player=mountStudy(img);
      const sync=()=>{img.src=reduced.matches?seekerPoster():seekerIdle();};
      reduced.addEventListener('change',sync);
      return {study,card,img,player,dispose(){reduced.removeEventListener('change',sync);player.destroy();}};
    });
    let revision=0,timer=0;
    function stop(){revision++;clearTimeout(timer);slots.forEach(s=>s.player.stop());}
    async function run(selection=slots){
      stop();const runId=revision;
      if(document.hidden || reduced.matches)return;
      await Promise.all(selection.map(s=>s.img.decode().catch(()=>{})));
      if(revision!==runId)return;
      await Promise.all(selection.map(s=>s.player.play(s.study,Number(rate.value))));
      if(revision===runId && repeat.checked && !document.hidden)timer=window.setTimeout(()=>{if(repeat.checked)void run(selection);},850);
    }
    slots.forEach(s=>s.card.querySelector('button')!.onclick=()=>void run([s]));
    section.querySelector<HTMLButtonElement>('.row-play')!.onclick=()=>void run();
    return {kind,run,stop,dispose(){stop();slots.forEach(s=>s.dispose());}};
  });
  const requested=new URLSearchParams(location.search).get('group') as Kind|null;
  if(requested==='mana'||requested==='heal')document.querySelectorAll<HTMLElement>('#studies section').forEach((section,i)=>section.hidden=rows[i].kind!==requested);
  const visibleRows=()=>rows.filter(row=>!requested||!['mana','heal'].includes(requested)||row.kind===requested);
  function restart(){visibleRows().forEach(row=>void row.run());}
  repeat.onchange=()=>{if(repeat.checked)restart();};
  rate.onchange=restart;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)rows.forEach(row=>row.stop());else if(repeat.checked)restart();});
  window.addEventListener('pagehide',event=>rows.forEach(row=>event.persisted?row.stop():row.dispose()));
  window.addEventListener('pageshow',event=>{if(event.persisted && repeat.checked)restart();});
  restart();
}
