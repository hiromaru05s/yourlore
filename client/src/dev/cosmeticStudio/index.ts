import {THEMES,asset} from './themes';
if(new URLSearchParams(location.search).has('audit')){
 void import('./audit').then(m=>m.mountAudit());
}else if(new URLSearchParams(location.search).has('inspect')){
 void import('./inspection').then(m=>m.mountInspection());
}else if(new URLSearchParams(location.search).has('board')){
 void import('./board').then(m=>m.mountBoard());
}else{
 void import('./studio.css');
 const q=new URLSearchParams(location.search);let selected=THEMES.find(t=>t.id===q.get('set'))??THEMES[0];
 let currentSet=q.get('set')==='default'?'default':selected.id,side=['self','opponent','both'].includes(q.get('side')??'')?q.get('side')!:'self',motion=true,count=8,dense=false,ready=false,inspect=false,stockDetail=false,thickness=q.get('thickness')==='3'?3:1;
 const root=document.getElementById('studio')!;
 root.innerHTML=`<header class="atelier-header"><a class="wordmark" href="/">LORE</a><div><p>THE COSMETIC ATELIER</p><h1>装備を、盤面で見比べる。</h1></div><span class="edition">COLLECTION 01 · 8 SETS</span></header>
 <main class="atelier-main"><aside class="collection" aria-label="セット一覧"><p class="section-label">6 COLLECTIONS + 2 LIVING EDITIONS</p><div class="sets">${THEMES.map((t,i)=>`<button class="set" data-set="${t.id}" aria-pressed="${t.id===selected.id}"><img src="${asset(t,'thumbnail.webp')}" alt="" width="48" height="75"><span><small>${String(i+1).padStart(2,'0')} / ${t.motion?'LIVING':'COLLECTION'}</small><strong>${t.name}</strong><em>${t.en}</em></span><span class="set-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><button id="baseline" class="baseline">デフォルトと比較</button><p class="collection-note">各セット：スリーブ・デッキ置き場・シェルフ<br>装着比較用プレビュー</p></aside>
 <section class="viewer"><div class="viewer-heading"><div><p id="theme-en">${selected.en}</p><h2 id="theme-name">${selected.name}</h2><p id="theme-note">${selected.note}</p></div><div class="perspective" role="group" aria-label="誰が使っているか"><button data-side="self" aria-pressed="${side==='self'}">自分が使う</button><button data-side="opponent" aria-pressed="${side==='opponent'}">相手が使う</button><button data-side="both" aria-pressed="false">両方</button></div></div>
 <section class="thickness-study" aria-label="カードの厚み比較"><div class="thickness-heading"><div><p class="section-label">CARD STOCK STUDY</p><h3>1枚の厚みを比較</h3></div><div class="perspective"><button data-thickness="1" aria-pressed="${thickness===1}">現状 1×</button><button data-thickness="3" aria-pressed="${thickness===3}">厚み 3×</button></div></div><p class="thickness-note">同じスリーブ・同じ枚数で比較。束・購入・ドローの既存の厚みを3倍にします。リシャッフルの発着位置も束の高さに追従。<br>召喚・攻撃は厚みのないカード面を動かすため、この倍率だけでは断面は変わりません。</p><div class="replay-controls" role="group" aria-label="実際の演出を再生"><button data-action="draw">ドロー</button><button data-action="purchase">購入</button><button data-action="summon">召喚</button><button data-action="attack">攻撃</button><button data-action="shuffle">リシャッフル</button></div><p id="replay-status" role="status">選択した側で演出を再生します。両方を装備した場合は自分側。再生ごとに盤面をリセット。</p></section>
 <div class="stage-wrap"><iframe title="通常対戦と同じ盤面での装着プレビュー" id="board" src="/cosmetic-studio.html?board=1&polish=1&set=${selected.id}&side=${side}&thickness=${thickness}&stock=${stockDetail?1:0}"></iframe><div id="loading" role="status">実盤面を準備しています…</div></div>
 <div class="viewer-tools"><div class="controls"><label>カード束 <select id="count"><option value="0">空の家具</option><option value="1">1枚</option><option value="8" selected>8枚</option><option value="12">12枚</option><option value="40">40枚</option></select></label><button id="dense" aria-pressed="false">7体の盤面</button><button id="motion" aria-pressed="true" disabled>静止セット</button><button id="focus-deck" aria-pressed="false">デッキを近くで</button><button id="focus-shelf" aria-pressed="false">シェルフを近くで</button><button id="inspect" aria-pressed="false">家具を拡大</button><button id="stock-inspect" aria-pressed="false">カード断面を拡大</button><button id="full">別ウィンドウで見る ↗</button></div><p id="status" role="status">自分側のスリーブ・家具を表示</p></div>

 <div class="materials-strip"><button id="art-open" aria-label="スリーブ原画を拡大"><img id="art" src="${asset(selected,'back.webp')}" alt="${selected.name}のスリーブ"><span>スリーブを拡大 ↗</span></button><div><p class="section-label">MATERIAL NOTES</p><p id="story">カード裏面の主題を、台座の象嵌とシェルフの織地へ。</p><p class="quiet">カード位置は通常対戦と共通。セットごとの素材と外装を表示。<br>空の家具に切り替えると内側の仕上げも確認できます。</p></div><div class="swatches"><span id="body-swatch"></span><span id="metal-swatch"></span><span id="lining-swatch"></span><small>BODY / METAL / LINING</small></div></div>
 </section></main><dialog id="art-dialog"><button id="art-close" aria-label="閉じる">閉じる ×</button><img id="art-large" alt="スリーブ原画"></dialog>`;
 const study=root.querySelector('.thickness-study')!;root.querySelector('.viewer-tools')!.after(study);
 const iframe=root.querySelector<HTMLIFrameElement>('#board')!,get=(id:string)=>document.getElementById(id)!;
 let focus:'deck'|'shelf'|null=null;
 const focusBoard=()=>{iframe.contentWindow?.postMessage({type:'atelier-focus',zoom:!inspect&&focus?2.6:1},location.origin);if(inspect||!focus){iframe.style.transform='';return;}const id=(side==='opponent'?'opp':'my')+(focus==='deck'?'Deck':'Disc'),el=iframe.contentDocument?.getElementById('pile-'+id);if(!el)return;const r=el.getBoundingClientRect(),scale=2.6;iframe.style.transformOrigin='0 0';iframe.style.transform=`translate(${iframe.clientWidth/2-(r.left+r.width/2)*scale}px,${iframe.clientHeight/2-(r.top+r.height/2)*scale}px) scale(${scale})`;};
 for(const part of ['deck','shelf']as const)get('focus-'+part).onclick=()=>{focus=focus===part?null:part;for(const p of ['deck','shelf'])get('focus-'+p).setAttribute('aria-pressed',String(focus===p));focusBoard();};
 addEventListener('resize',focusBoard);
 const update=()=>{
  (get('art')as HTMLImageElement).alt=(currentSet==='default'?'デフォルト':selected.name)+'のスリーブ';get('baseline').setAttribute('aria-pressed',String(currentSet==='default'));get('theme-en').textContent=currentSet==='default'?'STANDARD EQUIPMENT':selected.en;get('theme-name').textContent=currentSet==='default'?'デフォルト装備':selected.name;get('theme-note').textContent=currentSet==='default'?'比較用の基準装備':selected.note;
  root.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.set===currentSet)));
  root.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.side===side)));
  const animated=!!selected.motion&&currentSet!=='default',play=get('motion') as HTMLButtonElement;play.disabled=!animated;play.textContent=animated?(motion?'動きを一時停止':'動きを再生'):'静止セット';play.setAttribute('aria-pressed',String(motion));
  for(const id of ['art','art-large'])(get(id)as HTMLImageElement).src=currentSet==='default'?'/frames/sleeve_default.webp':asset(selected,'back.webp');
  get('body-swatch').style.background=selected.body;get('metal-swatch').style.background=selected.metal;get('lining-swatch').style.background=selected.lining;
  get('story').textContent=animated?selected.note+'。象嵌の変化はドロー・購入中のカード裏面にもつながります。':'カード裏面の主題を、台座の象嵌とシェルフの織地へ。';
  get('status').textContent=(side==='self'?'自分側':side==='opponent'?'相手側':'両側')+'の装備を表示'+(animated?' · '+(motion?'部分アニメーション再生中':'一時停止'):'');
  const url=new URL(location.href);url.searchParams.set('set',currentSet);url.searchParams.set('side',side);url.searchParams.set('thickness',String(thickness));history.replaceState(null,'',url);
  if(ready)iframe.contentWindow?.postMessage({type:'atelier-state',state:{set:currentSet,side,motion,count,dense}},location.origin);
 };
 root.querySelectorAll<HTMLButtonElement>('[data-set]').forEach(b=>b.onclick=()=>{selected=THEMES.find(t=>t.id===b.dataset.set)!;currentSet=selected.id;update();});
 root.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.onclick=()=>{side=b.dataset.side!;update();});
 get('baseline').onclick=()=>{currentSet=currentSet==='default'?selected.id:'default';update();};
 (get('count')as HTMLSelectElement).onchange=e=>{count=Number((e.target as HTMLSelectElement).value);update();};
 get('dense').onclick=()=>{dense=!dense;get('dense').setAttribute('aria-pressed',String(dense));update();};
 get('motion').onclick=()=>{motion=!motion;update();};
 const loadFrame=()=>{iframe.style.transform='';ready=false;get('loading').hidden=false;iframe.src=`/cosmetic-studio.html?${inspect?'inspect':'board'}=1&polish=1&set=${currentSet}&side=${side}&thickness=${thickness}&stock=${stockDetail?1:0}`;};
 root.querySelectorAll<HTMLButtonElement>('[data-thickness]').forEach(b=>b.onclick=()=>{thickness=Number(b.dataset.thickness);root.querySelectorAll('[data-thickness]').forEach(el=>el.setAttribute('aria-pressed',String((el as HTMLElement).dataset.thickness===String(thickness))));update();loadFrame();});
 root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.onclick=()=>{if(ready&&!inspect)iframe.contentWindow?.postMessage({type:'atelier-action',action:b.dataset.action},location.origin);});
 const showInspection=(stock:boolean)=>{if(inspect&&stockDetail===stock){inspect=false;stockDetail=false;}else{inspect=true;stockDetail=stock;}get('inspect').setAttribute('aria-pressed',String(inspect&&!stockDetail));get('stock-inspect').setAttribute('aria-pressed',String(stockDetail));(get('count')as HTMLSelectElement).disabled=inspect&&!stockDetail;(get('dense')as HTMLButtonElement).disabled=inspect;root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.disabled=inspect);get('inspect').textContent=inspect&&!stockDetail?'実盤面へ戻る':'家具を拡大';get('stock-inspect').textContent=stockDetail?'実盤面へ戻る':'カード断面を拡大';loadFrame();};
 get('inspect').onclick=()=>showInspection(false);get('stock-inspect').onclick=()=>showInspection(true);
 get('full').onclick=()=>window.open(`/cosmetic-studio.html?${inspect?'inspect':'board'}=1&polish=1&set=${currentSet}&side=${side}&thickness=${thickness}&stock=${stockDetail?1:0}`,'_blank','noopener');
 const dialog=get('art-dialog')as HTMLDialogElement;get('art-open').onclick=()=>{dialog.showModal();};get('art-close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data?.type==='atelier-applied')requestAnimationFrame(focusBoard);if(e.data?.type==='atelier-replay'){const busy=!!e.data.busy;root.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button:not(#art-open):not(#art-close),select').forEach(b=>b.disabled=busy);if(!busy)update();get('replay-status').textContent=busy?'演出を再生中…':'再生完了。同じ演出を現状と3倍で比較できます。';}if(e.data?.type==='atelier-ready'){ready=true;get('loading').hidden=true;update();}});update();
}
