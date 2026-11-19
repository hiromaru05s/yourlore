import {DUEL_OPENING_MS,MULLIGAN_MS} from '../shared/opening';
import {createGame,reduce} from '../shared/engine';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {playDuelOpening,warmOpening} from '../ui/duelOpeningDirector';
import {animateDraw} from '../ui/anim';
import {initSound,getSfxVolume,setSfxVolume} from '../ui/sound';
import {openingAudio,warmOpeningSound} from '../ui/openingSound';
import {type OpeningSoundMix,approvedOpeningMix} from '../ui/opening/soundBank';
import {marketPreview,openingHandDialog} from '../ui/modal';
import {botNpc} from '../shared/botNpcs';
import '../styles/defaultButtons.css';

declare global {interface Window {loreOpeningPreview?:{play:()=>Promise<void>;seek:(ms:number)=>void;cancel:()=>void;first:(me:boolean)=>void};}}
export async function mountOpeningLab(root:HTMLElement):Promise<void>{
  const difficulty=new URLSearchParams(location.search).get('npc');
  const npc=botNpc(difficulty==='normal'||difficulty==='hard'?difficulty:'easy'),me={name:'シーカー',avatar:'SEEKER_BLUE'},opp={name:npc.name.ja,avatar:npc.avatar};
  initSound();setMyAvatar(me.avatar);setOppAvatar(opp.avatar);
  let first=new URLSearchParams(location.search).get('order')!=='second';
  const params=new URLSearchParams(location.search);
  const study=params.get('study');
  const soundReview=params.has('sounds');
  let mix:OpeningSoundMix|undefined=soundReview?approvedOpeningMix():undefined;
  let ranked=params.has('ranked');
  let audition:ReturnType<typeof openingAudio>|undefined;
  let auditionVersion=0;
  const sample=Number(params.get('at')??1100);
  let speed=1;
  const previewState=()=>createGame({mode:'bot',mulligan:!!study,seed:207,starting:first?0:1,p0:{id:'a',name:me.name},p1:{id:'b',name:opp.name}}).state;
  const noop=()=>{};
  const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  view.render(previewState());const stop=startBoardLayout();
  let active=new AbortController(),running:Promise<void>=Promise.resolve(),generation=0;
  const panel=document.createElement('div');panel.className='opening-lab-controls';
  let drawer:HTMLDetailsElement|undefined;
  panel.style.cssText='position:fixed;z-index:250;bottom:3px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:6px;max-width:100%;width:max-content;color:#d8e5f1;font:12px system-ui';
  const add=(name:string,fn:()=>void)=>{const b=document.createElement('button');b.className='lore-button lore-button-quiet';b.textContent=name;b.style.cssText='padding:4px 10px;cursor:pointer;font:12px system-ui';b.onclick=fn;panel.append(b);};
  const launch=async(sampleMs?:number)=>{
    if(sampleMs==null&&drawer)drawer.open=false;
    const gen=++generation;active.abort();auditionVersion++;audition?.stop();
    await Promise.all([running,mix?warmOpeningSound(mix):Promise.resolve()]);if(gen!==generation)return;
    active=new AbortController();view.render(previewState());
    let started:number|undefined;
    running=playDuelOpening({root,me:{...me,level:24,rating:ranked?{tier:'gold',mmr:1218}:null},opp:{...opp,level:37,rating:ranked?{tier:'diamond',mmr:1462}:null},firstIsMe:first,signal:active.signal,sampleMs,soundMix:mix?{...mix}:undefined,soundRate:speed,ranked,elapsed:()=>{started??=performance.now();return (performance.now()-started)*speed;},
      onDeal:signal=>Promise.all([animateDraw(document.getElementById('hand'),3,'me',{signal}),animateDraw(document.getElementById('oppHand'),3,'opp',{signal})]).then(()=>{})});
    await running;
  };
  if(study){
    let state=previewState(),closeStudy=()=>{},timer=0;
    const reset=()=>{clearTimeout(timer);closeStudy();};
    const hand=()=>{
      const until=Date.now()+MULLIGAN_MS;
      const finish=(uids:string[])=>{
        reset();state=reduce(state,{type:'mulligan',player:0,uids}).state;
        view.render(state);
        closeStudy=openingHandDialog(state,0,()=>{},()=>Math.max(0,(until-Date.now())/1000));
        timer=window.setTimeout(()=>{
          closeStudy();state=reduce(state,{type:'mulligan',player:1,uids:[]}).state;
          view.render(state);panel.hidden=false;
        },1250);
      };
      closeStudy=openingHandDialog(state,0,finish,()=>(until-Date.now())/1000);
      timer=window.setTimeout(()=>finish([]),MULLIGAN_MS);
    };
    const begin=(market:boolean)=>{
      reset();panel.hidden=true;state=previewState();view.render(state);
      if(!market){hand();return;}
      const next=async()=>{reset();await launch();if(root.isConnected&&!active.signal.aborted)hand();};
      const preview=marketPreview(state.market,state.players[state.cur].supply,()=>void next());
      closeStudy=preview.close;preview.setUntil(Date.now()+15000);timer=window.setTimeout(()=>void next(),15000);
    };
    panel.style.display='';panel.style.textAlign='center';
    add('マーケットから再生',()=>begin(true));add('マリガンを試す',()=>begin(false));
    document.body.append(panel);
    await Promise.all([waitForDuel(root),warmOpening([me.avatar,opp.avatar])]);begin(study!=='hand');
    window.addEventListener('pagehide',()=>{reset();generation++;active.abort();stop();view.destroy();panel.remove();},{once:true});
    return;
  }
  if(params.has('playable'))add('▶ 再生',()=>{void launch();});
  add('自分が先攻で再生',()=>{first=true;void launch();});
  add('自分が後攻で再生',()=>{first=false;void launch();});
  const tools=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent='操作';summary.style.cursor='pointer';
  const box=document.createElement('div');box.style.cssText='position:absolute;bottom:100%;right:0;display:grid;gap:10px;background:#101d32;padding:12px';
  const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max=String(DUEL_OPENING_MS);scrub.step='25';scrub.value='1100';
  scrub.setAttribute('aria-label','開幕の再生位置');scrub.oninput=()=>void launch(Number(scrub.value));
  const live=document.createElement('a');live.href='/duel-lab.html?live';live.textContent='BOT対戦';
  const rate=document.createElement('select');rate.setAttribute('aria-label','再生速度');
  for(const [value,label] of [['1','通常速度'],['0.5','0.5倍速']]){const option=document.createElement('option');option.value=value;option.textContent=label;rate.append(option);}
  rate.onchange=()=>{speed=Number(rate.value);void launch();};
  const opponent=document.createElement('select');opponent.setAttribute('aria-label','対戦相手');
  for(const [value,name] of [['easy','ルミ'],['normal','ノエル'],['hard','ヴェラ']]){const opt=document.createElement('option');opt.value=value;opt.textContent=name;opponent.append(opt);}opponent.value=difficulty||'easy';opponent.onchange=()=>{const url=new URL(location.href);url.searchParams.set('npc',opponent.value);location.href=url.href;};
  box.append(opponent,scrub,rate,live);tools.append(summary,box);panel.append(tools);
  if(soundReview){
    panel.style.flexWrap='wrap';panel.style.width='min(760px,100%)';panel.style.background='#07101de8';panel.style.padding='5px';
    box.style.bottom='auto';box.style.top='100%';
    const resultNames={f:'③-A 銀晶の余韻',g:'③-B 聖堂の響き',h:'③-C 深蒼の確定',e:'元の③（比較）'};
    const variants=['f','g','h','e'] as const;
    for(const variant of variants)add(resultNames[variant],()=>{mix=approvedOpeningMix(variant);void launch();});
    add('ランク戦表示',()=>{ranked=!ranked;void launch(4400);});
    const details=document.createElement('details'),title=document.createElement('summary');title.textContent='結果音を試聴';title.style.cursor='pointer';
    const mixer=document.createElement('div');mixer.className='lore-surface';mixer.style.cssText='position:absolute;top:100%;right:0;width:min(390px,94vw);box-sizing:border-box;padding:15px;background:#101d32;display:grid;gap:12px;max-height:70vh;overflow:auto';
    const help=document.createElement('div');help.textContent='入場・初回衝突・コイントス＝B ／ 再衝突・摩擦・退場＝A。結果音は③をベースにした新しい3案。';mixer.append(help);
    for(const variant of variants){
      const button=document.createElement('button');button.className='lore-button lore-button-quiet';button.textContent=resultNames[variant]+' ▶';
      button.onclick=async()=>{
        const version=++auditionVersion;generation++;active.abort();audition?.stop();mix=approvedOpeningMix(variant);
        await Promise.all([running,warmOpeningSound(mix)]);if(version!==auditionVersion)return;
        audition=openingAudio({...mix});audition.play('land');
      };mixer.append(button);
    }
    const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=String(getSfxVolume());volume.setAttribute('aria-label','効果音の音量');volume.oninput=()=>setSfxVolume(Number(volume.value));
    const volumeLabel=document.createElement('label');volumeLabel.textContent='音量 ';volumeLabel.append(volume);mixer.append(volumeLabel);
    details.append(title,mixer);panel.append(details);
    const hint=document.createElement('span');hint.textContent='採用音：③-C 深蒼の確定 ／ Lv・ランクは表示サンプル';hint.style.color='#a9c5df';panel.append(hint);
    void Promise.all(variants.map(v=>warmOpeningSound(approvedOpeningMix(v))));
  }
  if(soundReview){
    drawer=document.createElement('details');drawer.className='opening-lab-drawer';drawer.style.cssText='position:fixed;z-index:251;top:6px;right:8px;max-width:calc(100vw - 16px);color:#d6e5ee;font:12px system-ui';
    const handle=document.createElement('summary');handle.textContent='音・表示を操作';handle.className='lore-button lore-button-quiet';handle.style.cssText='cursor:pointer;margin-left:auto;width:max-content;padding:7px 12px;background:#0b1a2de8';
    panel.style.position='relative';panel.style.bottom='auto';panel.style.left='auto';panel.style.transform='none';
    drawer.open=params.has('playable');
    drawer.append(handle,panel);document.body.append(drawer);
  }else document.body.append(panel);
  window.loreOpeningPreview={play:()=>launch(),seek:ms=>{void launch(ms);},cancel:()=>active.abort(),first:meFirst=>{first=meFirst;}};
  await Promise.all([waitForDuel(root),warmOpening([me.avatar,opp.avatar])]);
  if(new URLSearchParams(location.search).has('autoplay'))void launch();else void launch(Number.isFinite(sample)?Math.max(0,Math.min(DUEL_OPENING_MS,sample)):1100);
  window.addEventListener('pagehide',()=>{generation++;auditionVersion++;audition?.stop();active.abort();stop();view.destroy();panel.remove();drawer?.remove();delete window.loreOpeningPreview;},{once:true});
}
