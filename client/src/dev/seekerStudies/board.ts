import {studies,mountStudy} from './player';
import './board.css';

export async function mountBoardStudy(id:string, trigger:(kind:'mana'|'heal',side:0|1)=>Promise<void>){
  const initial=studies.find(s=>s.id===id);
  if(!initial)return;
  const sideSelect=document.querySelector<HTMLSelectElement>('#hoodSide')!;
  const controls=sideSelect.closest<HTMLElement>('.hood-board-controls')!;
  const panel=document.createElement('div');panel.className='study-board-panel';
  panel.innerHTML='<a href="/seeker-six.html?group=heal">← 回復3案の比較</a><select aria-label="再生する案"></select><button type="button">再生</button>';
  const select=panel.querySelector('select')!, replay=panel.querySelector('button')!;
  studies.forEach(s=>select.add(new Option(`${s.id}　${s.name}`,s.id)));
  select.value=id;panel.prepend(sideSelect.parentElement!);controls.replaceWith(panel);
  const active=new Map<HTMLImageElement,ReturnType<typeof mountStudy>>();
  let last=Promise.resolve();
  function contact(event:Event){
    const selected=studies.find(s=>s.id===select.value)!;
    if(selected.kind==='mana' || selected.id==='BASE')return; // Use the normal board renderer.
    if((event as CustomEvent<string>).detail!==selected.kind)return;
    const film=(event.target as HTMLElement).parentElement?.querySelector<HTMLImageElement>('img.seeker-idle');
    if(!film)return;
    event.preventDefault();
    let player=active.get(film);
    if(!player){player=mountStudy(film);active.set(film,player);}
    last=player.play(selected);
  }
  document.addEventListener('seeker-study-contact',contact);
  async function play(){
    if(replay.disabled)return;
    replay.disabled=select.disabled=sideSelect.disabled=true;
    try{
      const study=studies.find(s=>s.id===select.value)!;
      const url=new URL(location.href);url.searchParams.set('study',study.id);history.replaceState(null,'',url);
      await trigger(study.kind,Number(sideSelect.value) as 0|1);await last;
    }finally{replay.disabled=select.disabled=sideSelect.disabled=false;}
  }
  replay.onclick=select.onchange=()=>void play();
  window.addEventListener('pagehide',()=>{document.removeEventListener('seeker-study-contact',contact);active.forEach(p=>p.destroy());},{once:true});
  document.documentElement.dataset.seekerStudy='ready';await play();
}
