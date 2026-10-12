import fs from 'node:fs/promises';
const dir=new URL('.',import.meta.url),read=async p=>JSON.parse(await fs.readFile(new URL(p,dir),'utf8'));
const cards=await read('inventory.json'),{summary,scans,targeted}=await read('scan.json'),browser=await read('browser-report.json');
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const conditionalAttack=new Set(['M7','VAMP4','VAMP5','CHOSEN_KNIGHT','CHOSEN_ARCHER','DRAGON_RIDER']);
const persistentPolicy=new Set(['CAVALRY','POISON_MASTER','FIRE_MASTER']);
const missing={
 GM6_7:'相手の召喚へのダイス反応',TPO3:'相手破壊時の複製ダイス',GM5_2:'味方召喚時の体力付与',VITAL4:'兵士・騎士への気合付与',NWL3:'被攻撃時のカウンター獲得',TPO2:'捕食成長',VAMP_BUTLER:'攻撃カウント／見習い吸血鬼召喚',GUILD_HALL:'カウント／3個で14ダメージ',GUILD_HQ:'烙印付与（ナイトマーケットは turnFx で別途発動）',GOLEM2:'味方破壊時のカウンター',VITAL3:'世界樹・エルフのプレイで雫獲得',HEXER3:'相手魔法で呪い追加',HEXER4:'相手魔法への無効化ダイス',GHOST:'相手回復時の攻撃力増加／成長への反応',CHOSEN_MAGE:'選択確定後のカル消費・8ダメージ',CASINO:'カウンター到達時（専用ダイス演出は存在）',WORLD_TREE:'任意の雫消費による攻撃力・体力強化',PRIEST:'シールド獲得への雫反応',HIGH_PRIEST:'シールド獲得への雫反応',SHIELD_TITAN:'終了時シールド獲得／他効果の倍化',GUNNER:'ターン終了時の射撃',HEAVY_GUNNER:'ターン終了時の射撃',FARM_KEEPER:'醸造があるターン終了時のかかし召喚',MIMIC_HUNTER:'ターン終了時のミミック破壊',MERC_MASTER:'ターン開始時の兵士召喚・条件付きダイス',BLACK_ELSA:'黒魔法プレイ時の烙印',BLACK_ALICE:'黒魔法プレイ時の最大マナ増加',SORTER:'カル除外への追加除外',RUST_SLUG:'腐敗破壊時の報酬',RUST_SHROOM:'腐敗破壊時の最大マナ増加',GM6_8:'破壊時の兵士召喚',FIRE_MASTER:'破壊時のファイアー魔法回収',ELDER_ELF_KING:'破壊時の雫消費・30ダメージ',CASTLE:'兵士・騎士召喚時のカウンター／被攻撃時の無効化',VAMP1:'血の魔法による進化召喚',VAMP2:'血の魔法による進化召喚',VAMP3:'血の魔法による進化召喚',VAMP4:'血の魔法による進化召喚',POISON_MASTER:'攻撃時の追加腐敗',CAVALRY:'反撃無効化'
};
const legalNoOps=scans.filter(x=>x.noOpActivation&&x.reachableByNormalPlay),noOpIds=new Set(legalNoOps.map(x=>x.id));
const table=(head,rows)=>`<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const notes=c=>{
 const n=[];if(noOpIds.has(c.id))n.push(persistentPolicy.has(c.id)?'召喚処理なしでも発動。常時ルールの開始表示とは分けて仕様整理':'通常召喚可能な不発条件で発動を検出');
 if(['NHEX','MANA_GIANT'].includes(c.id))n.push('ターン開始の条件未達でも発動');
 if(conditionalAttack.has(c.id))n.push('攻撃効果の条件未達でも発動');
 if(c.id==='NGA4')n.push('ランダム選択後・攻撃後に発動。味方攻撃経路では発動なし');
 if(missing[c.id])n.push('専用の発動イベントなし: '+missing[c.id]);
 if(c.aura)n.push('常時表示は aura の有無のみ（適用条件を評価しない）');
 if(c.condAtk)n.push('条件付き数値変化は statRise の対象。常時表示の判定には未接続');
 if(!n.length)n.push(c.onSummon||c.turnFx?'今回の代表条件では誤発動未検出（全状態で正常とは断定しない）':'固有発動キーなし。キーワード・召喚制約等は下欄に記録');
 return n.map(esc).join('<br>');
};
const report=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>モンスター効果アニメーション監査 2026-10-07</title><style>
body{font:15px/1.75 system-ui,sans-serif;background:#f5f4ef;color:#222;margin:0}main{max-width:1220px;padding:28px;margin:auto}h1{font-size:28px}h2{margin-top:40px;font-size:22px}p{max-width:1000px}table{border-collapse:collapse;background:white;width:100%;margin:18px 0;font-size:13px;table-layout:fixed}td,th{border:1px solid #d4d4ce;padding:10px;vertical-align:top;overflow-wrap:anywhere}th{background:#e8ede9;text-align:left}code{font-size:12px}input{font:inherit;padding:10px;width:min(90%,500px)}.evidence{background:#e7f0eb;padding:14px}.muted{color:#626962}.bad{color:#9b3630}summary{cursor:pointer;font-weight:600}a{color:#165b79}@media(max-width:600px){main{padding:14px}table{font-size:11px}td,th{padding:5px}}</style><main>
<h1>モンスター効果アニメーション監査</h1><p>2026-10-07 · 対象 SHA <code>${summary.sha}</code> · 調査のみ。ゲーム処理・演出コード・ステージングには変更していない。</p>
<p><strong>結論：ハーフエルフ固有ではなく、発動イベントの判定と配置に共通の問題がある。</strong>召喚時・ターン開始時・攻撃時に不発でも光る一方、別経路で処理する常時・反応・ターン終了効果には発動演出がない。さらに常時表示が適用条件を見ていない。</p>
<div class="evidence">最終パッチ適用後の DB 全${cards.length}種を棚卸し。召喚時キー${summary.counts.onSummon}種、毎ターンキー${summary.counts.turnFx}種、攻撃キー${summary.counts.attackFx}種、aura ${summary.counts.aura}種、条件付き攻撃力${summary.counts.condAtk}種（重複あり）。解決処理${summary.scanCases}ケース、reducer操作${summary.targetedCases}ケース、ブラウザー${browser.checks.length}ケース。すべての対戦状態を網羅した試験ではない。</div>
<h2>主要な問題</h2>
${table(['区分','確認できた動作','原因'],[
['召喚時の誤発動','ハーフエルフ、初〜上級呪術師、ミミックキング2世など。通常召喚可能な状態で効果の状態変化・抽選・選択がないのに発動するカードを45種検出。そのうち騎馬兵・ポイズンマスター・ファイアーマスターの3種は常時ルールの開始表示との区別が必要。残る42種は不発条件または効果のタイミング違い。','engine.ts:2251 が onSummon の存在だけで発動を先行発行。対象・条件・空き枠・使用済み確認は後。'],
['ターン開始の誤発動','見習い呪術師：魔法10枚未満。ジャイアントゴーレム：他のゴーレム2種未満。それでも毎ターン光る。','engine.ts:889 がイベント数の増加を効果発動と判定。「条件未達」ログも含まれる。'],
['攻撃時の誤発動・遅延','エンバー・ドレイク：倒していない。吸血鬼2種：プレイヤーダメージなし。選ばれし剣士：除外対象なし。選ばれし弓手：対象の体力条件なし。ドラゴンライダー：1回目。この6種でも発動。','engine.ts:2157 が attackFx の存在だけを見て、攻撃・被弾・反撃の後に発行。半減・巨人狩りなどは処理した後に光る。'],
['発動するタイミングの逆転','砲撃兵・大砲兵・農場管理者・ミミックハンターは召喚時に処理なしでも光る。本来の終了時に射撃・召喚・破壊が起きても自身の発動イベントはない。','onSummon="expansion" を一律で扱う。実処理は expansionEnd（5422行以降）。'],
['反応効果の発動演出欠落','城のカウンター、上級呪術師の呪い、ギルド支部の14ダメージなど。神官・鋼鉄の戦士・鼓舞王の反応でも同様。','monsterActivate の発行元は engine 全体で上記3か所だけ。各反応コールバックからは発行しない。'],
['常時表示の適用判定不足','大賢者は魔法0枚でも、マナ・ゴーレムは他のゴーレム0体でも、鼓舞王は兵士・騎士0体でも常時の光り方になる。','ui/statRise.ts:21 が m.aura の存在を DOM に転記。monster/runtime.ts:78 がそれだけで継続フィルターを付ける。']
])}
<h2>ハーフエルフを条件別に再現</h2><p>条件はマーケットではなく<strong>場</strong>。どちらかの場に「世界樹」名カードがあれば攻撃力+3、自分の場にあれば召喚時に「世界樹の慈しみ」を展開。既に慈しみがある／魔法・罠枠が満杯なら展開しない。</p>
${table(['配置','攻撃力','慈しみ','現在の発動演出'],[['どちらの場にもなし','0','なし','あり（誤発動）'],['自分の場に世界樹','3','展開','あり'],['相手の場だけに世界樹','3','なし','あり。常時ボーナスの成立と召喚効果不発を区別する必要'],['マーケットだけに世界樹','0','なし','あり（誤発動）'],['自分の場に世界樹＋慈しみが既にある','3','追加なし','あり。重複展開できないのに召喚効果扱い']])}
<h2>正常なものまで消してはいけない</h2><p>ギャンブラーは抽選そのものが発動。成功・失敗の両方でダイスイベントと発動イベントがあることを確認した。ハイエルフ・装備職人は選択キューに実際の処理が続くため、選択前に数値が変わらないだけで不発とは判定できない。ダークエルフ・エルダーは雫不足の人工状態なら何も起きないが、通常の召喚条件を満たさないため誤発動数から除外した。対象不足の飢えた仔獣も召喚自体が拒否される。</p><p>逆に、始原の裁判官は対象がなくても「ゲーム中1回」の消費状態だけが変わる。単純な状態差分だけで「意味のある発動」を決めても、この種の空振りは取り逃がす。</p>
<h2>意図に合わせた修正方針</h2><ol><li><strong>実際に効果を解決する箇所で発動を決める。</strong>適用できる条件・対象・支払い・空き枠を確認し、変更・抽選・有効な選択に進む時に出す。キーの存在やログの有無は根拠にしない。</li><li><strong>継続中の表示を発動の一瞬と分ける。</strong>常時効果はその効果固有の条件が現在成立している時に表示。条件を失えば消す。今後のターンでのみ発動する能力を召喚しただけで発動扱いしない。手札の割引やルール制限は数値の直接変更がなくても成立しうる。</li><li><strong>反応したカードの UID を残す。</strong>ターン終了・被攻撃・他カードのプレイ・破壊時・選択確定など、既存の3経路外も接続する。同じカードが複数ある場合は各発生源へ。対象のバフ／デバフ演出とは役割を分ける。</li><li><strong>順序と多段処理を保証する。</strong>効果の原因が分かる順に発動→抽選／結果。選択を開く時と解決時を両方無条件に光らせない。破壊時効果は元カードの表示が消える前に演出できる情報を保持する。</li><li><strong>回帰試験は「出ない」側を必須にする。</strong>未達→達成、対象0→複数、空き枠なし、使用済み、取消、抽選失敗、効果による召喚、両プレイヤーを対にして検証する。</li></ol>
<h2>通常召喚できる不発状態を検出した45種</h2><p>この一覧は「召喚効果が何も解決していないのに発動イベントが出た」検出結果。常時ルール3種は別途仕様整理対象と表示している。カードが常に不発という意味ではない。</p>
${table(['カード','状態・ログ','扱い'],[...noOpIds].map(id=>{const c=cards.find(c=>c.id===id),rows=legalNoOps.filter(r=>r.id===id);return[esc(c.name)+'<br><code>'+id+'</code>',rows.map(r=>esc(r.label)+'<br>'+r.logs.map(esc).join('<br>')).join('<hr>'),persistentPolicy.has(id)?'常時ルール表示の方針整理':'不発／タイミング違い'];}))}
<h2>全139種のカード別監査台帳</h2><p>現行定義のキーを列挙。廃止済みの旧カード・旧 switch 分岐はカード数に含めない。「専用イベントなし」はソース調査上の接続状況であり、ダイス・召喚・ダメージ・数値変更など別演出までないという意味ではない。</p><input id="filter" placeholder="カード名・ID・効果・指摘を検索" aria-label="カード検索"><p id="count"></p><div id="cards">
${table(['カード／現行テキスト','定義されている効果・条件','監査結果'],cards.map(c=>[esc(c.name)+'<br><code>'+c.id+'</code><br>'+esc(c.text),['onSummon','turnFx','attackFx','aura','condAtk'].filter(k=>c[k]).map(k=>'<code>'+k+': '+esc(c[k])+'</code>').join('<br>')+'<br>keywords: '+esc((c.passive??[]).join(', '))+'<br>other: '+esc(c.otherFields.join(', ')),notes(c)]))}</div>
<h2>検証と境界</h2><p>ブラウザーは現在のローカル runtime controller / board に、実 reducer の入力状態・結果・イベントを渡して連続再生。${browser.checks.length}ケース、ページ例外${browser.errors.length}件。発動アクターの出現・消滅、条件未達でも継続表示が付くことを確認した。認証済みオンライン対戦や今回のステージング再デプロイは行っていない。演出の見た目を変更していないため、新しい造形の品質評価でもない。</p>
${table(['盤面ケース','結果'],browser.checks.map(x=>[esc(x.label),x.maxTriggerActors!=null?'最大発動アクター '+x.maxTriggerActors+' / 終了後 '+x.remaining:'常時属性 '+esc(x.aura)+' / 継続フィルターあり']))}
<p>既存 tests/monster-animation-rules.mjs は召喚・ターン・攻撃のイベントが出る正例が中心で、条件未達時に出ないことや3経路外の反応は検証していない。今回の検証は現状の不具合を記録する診断であり、修正後に期待値を反転した回帰試験へ移す必要がある。</p>
<p>一次証拠：<a href="inventory.json">最終DB台帳</a> / <a href="scan.json">状態差分・イベント・ログ</a> / <a href="browser-report.json">ブラウザー結果</a> / <a href="audit.mjs">再現スクリプト</a> / <a href="browser.mjs">盤面確認スクリプト</a>。audit.mjs は内部関数を一時バンドルにだけ公開し、製品ソースを変更しない。実行: <code>node docs/audits/2026-10-07-monster-activation/audit.mjs</code>。ブラウザー確認は Vite :5183 と Playwright/Chrome を使用（必要に応じ PLAYWRIGHT_MODULE でモジュールのパスを指定）。</p>
</main><script>const rows=[...document.querySelectorAll('#cards tbody tr')];function filter(){const q=document.querySelector('#filter').value.toLowerCase();let n=0;for(const r of rows){r.hidden=!r.textContent.toLowerCase().includes(q);if(!r.hidden)n++;}document.querySelector('#count').textContent=n+' / '+rows.length+' 種';}document.querySelector('#filter').addEventListener('input',filter);filter();</script></html>`;
await fs.writeFile(new URL('report.html',dir),report);console.log('Report:',new URL('report.html',dir).pathname);
