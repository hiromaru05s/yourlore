import verifiedCues from './verified-cues.json';
import assignments from './assignments.json';
export type Entry={id:string;name:string;kind:'series'|'cue'|'state';cardIds:string[];animation?:string;stages?:string};
export const entries=assignments as Entry[];
export const production=new Set(['S02','S09','S10','S03','S16','S18','S19','S26','S27','A105','A106','A107','A108','A109','A110']);
export const playable=new Set<string>(['S02','S03','S09','S10','S16','S18','S19','S26','S27']);
export const needsRevision=new Set(['S02','S03','S16','S18','S19','S26','S27']);
for(const id of ['A105','A106','A107','A108','A109','A110'])playable.add(id);
for(const id of ['N001','N002']){production.add(id);playable.add(id);}
for(const id of ['A006','A008','A010','A016','A165','A166','A170','A171','A172','A173']){production.add(id);playable.add(id);}
export const labels=['未制作','制作中','2案再生可','要改稿','確認済み'] as const;
export function status(id:string){return needsRevision.has(id)?labels[3]:playable.has(id)?labels[2]:production.has(id)?labels[1]:labels[0];}
export const directions:Record<string,[string,string]>={S02:['葉脈から像が育つ','葉の編み面が着地する'],S09:['鱗の合わせ目が起きる','翼膜が開いて竜が立つ'],S10:['殻の層が開いて降臨','角と羽毛の面が立ち上がる'],S03:['根の束が樹体を持ち上げる','水鏡から樹景が戻る'],S16:['化石の地層が組み上がる','石体が核を軸に噛み合う'],S18:['前足を支点に身を起こす','毛束が顔から背へ伏せる']};
export function entry(id:string){return entries.find(e=>e.id===id)!;}
Object.assign(directions,{S19:['肩から外套の面を下ろす','証書の巻き面を開く'],S26:['帳簿の綴じ面をめくる','取引台の面を着地させる'],S27:['果実・藁の体積が立つ','収穫面の折れが起きる']});
for(const id of ['A105','A106','A107','A108','A109','A110'])directions[id]=id==='A105'?['殻の内圧が呼吸する','殻の合わせ目が応答する']:id==='A107'?['殻の曲面に支えが入る','合わせ目が締まる']:['殻の張力から枝割れ','左右の殻がずれて開く'];
directions.N001=['器内の液面が動く','雫の内側が合流する'];directions.N002=['盾の面が重なって受ける','盾の中央面が撓んで受ける'];

for(const id of ["A006","A008","A010","A016"])directions[id]=["カード面を起こして着地","先端から滑り込み整列"];
for(const id of ["A165","A166","A170","A171","A172","A173"])directions[id]=["各個体から順に呼応","中央から両端へ同時に呼応"];

for(const id of verifiedCues){production.add(id);playable.add(id);}
Object.assign(directions,{
 A047:['表面から状態印が起きる','状態印を横から組み込む'],A053:['順に積み上がるカウンター','中央から揃うカウンター'],
 A060:['赤い体力印が縦に起きる','赤い体力印が横から噛み合う'],A061:['攻撃・体力が順に起きる','左右の能力印が対で揃う'],
 A064:['傷が戻り体力印が起きる','回復した面を横から揃える'],A065:['体力表示が起きて収まる','体力表示が横から整う'],
 A072:['コスト印の縦折り替え','コスト印の横差し替え'],A075:['強化の印を畳んで戻す','能力印を横へ戻す'],
 A111:['竜の鱗から効果へ','翼膜の展開から効果へ'],A112:['素材を起こして合体','素材の先端を揃えて合体'],
 A123:['葉の展開から盤面破壊','葉面の編み合わせから盤面破壊'],A124:['根の脈動から雫循環','樹液面の変化から雫循環'],A125:['葉脈から慈しみへ','葉を編んで慈しみへ'],
 A130:['帳簿が開いて報酬へ','取引面が揃って報酬へ'],A131:['液面の仕込みから熟成','液面が折り返して熟成'],A132:['農夫の衣服から順に着地','農場の左右へ先端から着地'],
 A133:['発掘面が開いて卵を得る','発掘面が組み替わり卵を得る'],A137:['肩の重みから捕食・成長','毛束の伏せから捕食・成長'],A138:['古層が起きて術式へ','石体が噛み合い術式へ'],
 A146:['カード面を起こして購入先へ','カードの先端を向けて購入先へ'],A147:['提示を縦に畳み開く','提示を左右から差し替える'],A148:['7枚を順に畳み開く','7枚を中央から差し替える'],
 A149:['提示枠を畳んで制限する','提示枠を横から閉じる'],A150:['候補を順に起こして選ぶ','候補を中央から開いて選ぶ'],A151:['権利の印を起こして消費','権利の印を横から揃えて消費'],A181:['3条件が順に起きる','3条件が組み合わさる']
});

for(const e of entries)if(e.kind==='cue')production.add(e.id);
