/** Medal names are presentation; progress and ownership come from the server. */
export type MedalText={ja:string;en:string;ko:string};
export type MedalCategory='rank'|'login'|'series'|'duel'|'record';
export interface MedalDefinition {id:string;name:MedalText;description:MedalText;category:MedalCategory;metric:string;target:number;series?:string;}
export interface MedalProgress {id:string;value:number;target:number;earnedAt:number|null;}
export interface MedalState {equipped:string|null;entries:MedalProgress[];}
export const mt=(ja:string,en:string,ko:string):MedalText=>({ja,en,ko});
export const MEDAL_SERIES = [
{id:"elf",name:mt("エルフ・世界樹","Elves & World Tree","엘프·세계수"),useName:mt("森との契り","Forest Covenant","숲의 맹약"),winName:mt("万緑の戴冠","Verdant Crown","녹음의 왕관"),cards:["HALF_ELF", "ELF", "DARK_ELF", "HIGH_ELF", "ELDER_ELF_KING", "WORLD_TREE", "WORLD_SEED", "WORLD_CARE", "WORLD_HEART", "WORLD_BLESS", "ELF_HAVEN", "VITAL2", "VITAL3", "QUICK_WORLD"]},
{id:"origin",name:mt("始原","Origin","시초"),useName:mt("始まりの探究","Seeking Origins","시작의 탐구"),winName:mt("始原の継承者","Heir of Origin","시초의 계승자"),cards:["TGE1", "TGE2", "TGE3", "TGE4", "TGE5", "TGE6", "TGE7", "ORIGIN_MIMIC", "GENESIS_SONG", "GENESIS_MAGIC", "ORIGIN_RITE"]},
{id:"solitary",name:mt("孤独","Solitary","고독"),useName:mt("孤高の道","Solitary Path","고독한 길"),winName:mt("ただ一人の覇者","Lone Champion","홀로 선 패자"),cards:["TSO1", "TSO2", "TSO3", "TSO5"]},
{id:"aristocrat",name:mt("貴族","Aristocrats","귀족"),useName:mt("名門の作法","Noble Traditions","명문의 예법"),winName:mt("王座の主","Lord of the Throne","왕좌의 주인"),cards:["TAR1", "TAR2", "TAR3", "TAR5"]},
{id:"devour",name:mt("捕食","Devour","포식"),useName:mt("飢えの衝動","Endless Hunger","굶주림의 충동"),winName:mt("食物連鎖の頂点","Apex Predator","먹이사슬의 정점"),cards:["TPO1", "TPO2", "TPO3", "TPO5", "PACK_INSTINCT"]},
{id:"demon",name:mt("魔族","Demons","마족"),useName:mt("深淵との契約","Abyssal Pact","심연과의 계약"),winName:mt("魔界の覇者","Demon Sovereign","마계의 패자"),cards:["TDE1", "TDE2", "TDE3", "TDE4", "DEMON_REALM"]},
{id:"vampire",name:mt("吸血鬼","Vampires","흡혈귀"),useName:mt("真紅の盟約","Crimson Covenant","진홍의 맹약"),winName:mt("終わらぬ夜の王","King of Endless Night","끝없는 밤의 왕"),cards:["VAMP1", "VAMP2", "VAMP3", "VAMP4", "VAMP5", "VAMP_BUTLER", "VAMP_PACT", "VAMP_WARD", "VAMP_PACT2", "BLOOD1", "BLOOD_JOY", "BLOOD_ANGER", "BLOOD_SORROW", "BLOOD_PLEASURE", "BLOOD_SECRET", "BLOOD_FEST", "BLOOD_SHIELD", "BLOOD_RITE", "NIGHT_CASTLE_GIFT"]},
{id:"assassin",name:mt("暗殺者","Assassins","암살자"),useName:mt("影の足音","Footsteps in Shadow","그림자의 발소리"),winName:mt("名もなき刃","Nameless Blade","이름 없는 칼날"),cards:["ASSASSIN1", "ASSASSIN2", "ASSASSIN3", "ASSASSIN4", "ASSASSIN_SQUAD", "GUILD_HALL", "GUILD_HQ", "GUILD_CHEST", "NL_SECRET"]},
{id:"hexer",name:mt("呪術師","Hexers","주술사"),useName:mt("呪言の研鑽","Study of Hexes","주술의 연마"),winName:mt("因果を縛る者","Binder of Fate","인과를 묶는 자"),cards:["NHEX", "HEXER1", "HEXER2", "HEXER3", "HEXER4", "CURSE"]},
{id:"decay",name:mt("腐敗","Decay","부패"),useName:mt("朽ちゆく兆し","Signs of Decay","부패의 징조"),winName:mt("腐敗の支配者","Lord of Decay","부패의 지배자"),cards:["RUST_SHROOM", "RUST_SLUG", "DECAY_CRAFT", "ROTTEN_GROUND", "STRONG_ACID", "ACID_RAIN", "Q_DECAY", "POISON_MASTER", "QUICK_POISON"]},
{id:"golem",name:mt("ゴーレム","Golems","골렘"),useName:mt("石に宿る意志","Will in Stone","돌에 깃든 의지"),winName:mt("不動の巨像","Immovable Colossus","부동의 거상"),cards:["GOLEM1", "GOLEM2", "GOLEM3", "M10", "NGA3", "NWL3", "MANA_GIANT", "AEM"]},
{id:"mimic",name:mt("ミミック","Mimics","미믹"),useName:mt("箱の中の秘密","Secrets in a Chest","상자 속 비밀"),winName:mt("開けてはならぬ宝箱","Forbidden Treasure","열어서는 안 될 보물상자"),cards:["MIMIC", "MIMIC2", "MIMIC_LORD", "AWAKENED_MIMIC", "MIMIC_KING", "MIMIC_KING2", "MIMIC_HIDEOUT", "DUNGEON_FLOOR", "DUNGEON", "QUICK_MIMIC"]},
{id:"casino",name:mt("カジノ","Casino","카지노"),useName:mt("賽との戯れ","Playing the Dice","주사위와의 유희"),winName:mt("運命の胴元","Dealer of Fate","운명의 딜러"),cards:["CASINO", "GAMBLER", "LEGEND_GAMBLER", "LUCKY_ECHO", "NO_PAIN", "FATE_WHEEL"]},
{id:"chosen",name:mt("選別","Chosen","선별"),useName:mt("選別の果てへ","Beyond Selection","선별의 끝으로"),winName:mt("領域を超えし者","Beyond the Domain","영역을 넘은 자"),cards:["SORTER", "CHOSEN_KNIGHT", "CHOSEN_MAGE", "CHOSEN_ARCHER", "CHOSEN_ROGUE", "CHOSEN_AREA", "TRIAL_AREA", "COLOSSEUM", "COLOSSEUM_REST"]},
{id:"military",name:mt("城・軍勢","Castle & Army","성·군세"),useName:mt("旗の下に","Under One Banner","깃발 아래"),winName:mt("城塞の統率者","Citadel Commander","성채의 지휘자"),cards:["CASTLE", "SOLDIER2", "INFKNIGHT", "GUNNER", "HEAVY_GUNNER", "CAVALRY", "INTERCEPT", "REINFORCE", "STABLE", "LAND_GRANT", "EXPANSION", "BUDGET", "Q_CASTLE", "QUICK_MUSTER", "QUICK_ASSAULT"]},
{id:"mercenary",name:mt("傭兵","Mercenaries","용병"),useName:mt("雇われの誓い","Mercenary Oath","용병의 맹세"),winName:mt("戦場の請負人","Master of the Battlefield","전장의 해결사"),cards:["MERCENARY", "MERC_LEADER", "MERC_MASTER", "MERC_ART"]},
{id:"fire",name:mt("炎術","Fire Arts","화염술"),useName:mt("火種の探究","Seeking the Flame","불씨의 탐구"),winName:mt("炎術の極致","Master of Flame","화염술의 극치"),cards:["FIRE_MASTER", "FIRE_ART", "FIRE_BALL", "FIRE_ARROW", "FIRE_ZONE", "FIRE_METEOR"]},
{id:"shield",name:mt("武具・シールド","Arms & Shields","무구·실드"),useName:mt("鍛錬の火花","Sparks of the Forge","단련의 불꽃"),winName:mt("鋼の守護者","Guardian of Steel","강철의 수호자"),cards:["APPRENTICE_ARMORER", "VETERAN_ARMORER", "SALLY_WEAPONMASTER", "BLACKSMITH", "SHIELD_TITAN", "PRIEST", "HIGH_PRIEST", "DEFENSIVE_STANCE", "IRON_WALL", "SELECTED_SWORD", "SELECTED_SHIELD", "ARMOR_BREAK", "SPEAR_AND_SHIELD"]},
{id:"black",name:mt("黒魔法","Black Magic","흑마법"),useName:mt("黒き研鑽","Dark Studies","검은 연마"),winName:mt("黒魔術の継承者","Heir of Black Magic","흑마술의 계승자"),cards:["BLACK_REVERSE", "BLACK_INFINITY", "BLACK_NOVA", "BLACK_CURSE", "BLACK_ELSA", "BLACK_ALICE", "QUICK_CURSE", "SOUL_HARVEST"]},
{id:"merchant",name:mt("商人・醸造","Trade & Brewing","상인·양조"),useName:mt("商いの心得","Art of Trade","장사의 마음가짐"),winName:mt("富を巡らす者","Weaver of Wealth","부를 순환시키는 자"),cards:["MERCH1", "MERCH2", "DARK_MERCHANT", "GUILD_CO", "GRAPE", "GRAPE2", "BREWING", "WINE", "WINE_COLLECTOR", "FARM_KEEPER", "RICH_HABIT", "BUYOUT"]},
{id:"dragon",name:mt("孵化・竜","Hatching & Dragons","부화·용"),useName:mt("卵に秘めた未来","Future in an Egg","알에 담긴 미래"),winName:mt("竜を導く者","Dragon Guide","용을 이끄는 자"),cards:["DRAGON_EGG", "BEAST_EGG", "D_BLACK", "D_RED", "D_BLUE", "DIVINE", "EGG_HUNTER", "INCUBATOR", "INCUBATOR_S", "EGG_MASTER", "DRAGON_RIDER", "ANTIQUE_DK", "GM6_0", "ANCIENT_CIV"]},
{id:"rune",name:mt("ルーン学問","Rune Studies","룬 학문"),useName:mt("刻まれた知恵","Inscribed Wisdom","새겨진 지혜"),winName:mt("ルーンの賢者","Rune Sage","룬의 현자"),cards:["RUNE1", "RUNE2", "RUNE3", "S15", "ND2"]},
{id:"void",name:mt("虚無・リフト","Void & Rift","허무·리프트"),useName:mt("虚空へのまなざし","Gaze into the Void","허공을 향한 시선"),winName:mt("虚無の探究者","Seeker of the Void","허무의 탐구자"),cards:["VOID_FRUIT", "VOID_APOSTLE", "VOID_RITE", "RIFT", "SPACE_RITE", "Q_RIFT", "EXILE_NUKE1", "EXILE_NUKE2", "CATALYST"]},
];
export const MEDALS:MedalDefinition[]=[];
const add=(id:string,name:MedalText,description:MedalText,category:MedalCategory,metric:string,target:number,series?:string)=>MEDALS.push({id,name,description,category,metric,target,series});
add("tier:bronze",mt("青銅の一歩","First Bronze Step","청동의 첫걸음"),mt("ブロンズに到達","Reach Bronze","브론즈 도달"),"rank","peak",1030);
add("tier:silver",mt("銀光の証","Silver Radiance","은빛의 증표"),mt("シルバーに到達","Reach Silver","실버 도달"),"rank","peak",1090);
add("tier:gold",mt("黄金の栄誉","Golden Honor","황금의 영예"),mt("ゴールドに到達","Reach Gold","골드 도달"),"rank","peak",1150);
add("tier:platinum",mt("白金の威光","Platinum Glory","백금의 위광"),mt("プラチナに到達","Reach Platinum","플래티넘 도달"),"rank","peak",1250);
add("tier:diamond",mt("金剛の意志","Diamond Resolve","금강의 의지"),mt("ダイヤモンドに到達","Reach Diamond","다이아몬드 도달"),"rank","peak",1400);
add("tier:master",mt("極致の探究者","Seeker of Mastery","극치의 탐구자"),mt("マスターに到達","Reach Master","마스터 도달"),"rank","peak",1550);
add("tier:gm",mt("頂点に刻む名","A Name at the Summit","정점에 새긴 이름"),mt("1,550 MMR以上かつシーズン上位25位に到達","Reach 1550+ MMR and seasonal top 25","1550 MMR 이상 및 시즌 상위 25위 달성"),"rank","gm",1);
add("login:30",mt("ビブリオンの常連","Biblion Regular","비블리온의 단골"),mt("累計30日ログイン（連続不要）","Log in on 30 distinct days","누적 30일 로그인 (연속 불필요)"),"login","days",30);
add("login:100",mt("百日の探究","A Hundred Days of Discovery","백일의 탐구"),mt("累計100日ログイン（連続不要）","Log in on 100 distinct days","누적 100일 로그인 (연속 불필요)"),"login","days",100);
add("login:300",mt("尽きぬ好奇心","Endless Curiosity","끝없는 호기심"),mt("累計300日ログイン（連続不要）","Log in on 300 distinct days","누적 300일 로그인 (연속 불필요)"),"login","days",300);
for(const s of MEDAL_SERIES)for(const [kind,targets] of [['use',[10,100,500,2000]],['win',[10,50,100,300]]] as const)targets.forEach((n,i)=>{
 const base=kind==='use'?s.useName:s.winName,level=['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i];
 add(`series:${s.id}:${kind}:${n}`,mt(`${base.ja} ${level}`,`${base.en} ${level}`,`${base.ko} ${level}`),kind==='use'?mt(`${s.name.ja}の対象カードを累計${n}回使用`, `Play ${s.name.en} cards ${n} times`,`${s.name.ko} 대상 카드 누적 ${n}회 사용`):mt(`${s.name.ja}の対象カードを2種類以上使用した対戦で${n}勝`,`Win ${n} duels after playing at least 2 different ${s.name.en} cards`,`${s.name.ko} 대상 카드 2종 이상 사용한 대전에서 ${n}승`),'series',`series:${s.id}:${kind}`,n,s.id);
});
add("feat:perfect",mt("無傷の完勝","Flawless Victory","무결한 완승"),mt("一度も精神力を減らさずに勝利（自傷も不可）","Win without losing any HP, including self damage","자해를 포함해 정신력 감소 없이 승리"),"duel","perfect",1);
add("feat:speed",mt("七手の決着","Seven-Turn Finish","일곱 턴의 결착"),mt("画面のターン数が7以内に勝利（双方のターンを数える）","Win by displayed turn 7, counting both players' turns","양쪽 턴을 합산한 표시 턴 7 이내 승리"),"duel","speed",1);
add("feat:special",mt("もう一つの結末","Another Ending","또 하나의 결말"),mt("選ばれし領域または始原6種シナジーで特殊勝利","Win through Chosen Domain or the 6-kind Origin synergy","선택받은 영역 또는 시초 6종 시너지로 특수 승리"),"duel","special",1);
add("feat:chosen",mt("選ばれし者","The Chosen","선택받은 자"),mt("選ばれし領域の効果で勝利","Win through Chosen Domain","선택받은 영역 효과로 승리"),"duel","chosen",1);
add("feat:origin",mt("始原の集結","Origin Assembled","시초의 집결"),mt("始原6種のシナジーで勝利","Win through the 6-kind Origin synergy","시초 6종 시너지로 승리"),"duel","origin",1);
add("feat:lastPoint",mt("残された一点","One Point Remaining","남겨진 한 점"),mt("精神力1で勝利","Win with exactly 1 HP","정신력 1로 승리"),"duel","lastPoint",1);
add("feat:comeback",mt("絶望からの帰還","Return from Despair","절망에서의 귀환"),mt("精神力で30以上負けた状態を経て勝利","Win after trailing by at least 30 HP","정신력이 30 이상 뒤진 상태를 거쳐 승리"),"duel","comeback",1);
add("feat:quiet",mt("静かなる制圧","Silent Victory","조용한 제압"),mt("モンスターで一度も攻撃せずに勝利","Win without making a monster attack","몬스터로 공격하지 않고 승리"),"duel","quiet",1);
add("feat:survivors",mt("誰一人欠けず","Everyone Returns","누구 하나 빠짐없이"),mt("1体以上召喚し、自分のモンスターを一度も破壊されずに勝利","Summon a monster and win without any of yours being destroyed","1체 이상 소환하고 자신의 몬스터가 파괴되지 않은 채 승리"),"duel","survivors",1);
add("feat:enemyTurn",mt("結末は我が手に","An Ending of My Own","결말은 내 손에"),mt("相手のターン中に勝利","Win during your opponent's turn","상대 턴 중 승리"),"duel","enemyTurn",1);
add("feat:healing",mt("尽きぬ生命","Unending Life","끝없는 생명"),mt("1試合で精神力を合計50以上回復して勝利","Restore at least 50 HP in a duel and win","한 대전에서 정신력 50 이상 회복하고 승리"),"duel","healing",1);
add("feat:decay",mt("静かに朽ちる軍勢","An Army in Decay","조용히 썩는 군세"),mt("1試合で腐敗により相手モンスターを5体以上破壊して勝利","Destroy 5 enemy monsters through Decay in a duel and win","한 대전에서 부패로 상대 몬스터 5체 이상 파괴하고 승리"),"duel","decay",1);
add("feat:shopping",mt("マーケットの顔役","Market Regular","마켓의 큰손"),mt("1試合でカードを10枚以上購入して勝利","Buy at least 10 cards in a duel and win","한 대전에서 카드 10장 이상 구매하고 승리"),"duel","shopping",1);
add("feat:mana",mt("溢れる魔力","Overflowing Mana","넘치는 마력"),mt("最大マナ20以上で勝利","Win with at least 20 maximum mana","최대 마나 20 이상으로 승리"),"duel","mana",1);
add("feat:alliance",mt("異種の盟約","Alliance of Tribes","이종의 맹약"),mt("1試合で3種類以上の種族シナジーを発動して勝利","Trigger synergies of 3 different tribes and win","한 대전에서 3종족 이상의 시너지를 발동하고 승리"),"duel","alliance",1);
add("wins:1",mt("勝利の第一歩","First Victory","승리의 첫걸음"),mt("対人戦で累計1勝","Win 1 PvP duels","대인전 누적 1승"),"record","wins",1);
add("wins:10",mt("勝機をつかむ者","Seizing Victory","승기를 잡는 자"),mt("対人戦で累計10勝","Win 10 PvP duels","대인전 누적 10승"),"record","wins",10);
add("wins:50",mt("確かな実力","Proven Skill","확실한 실력"),mt("対人戦で累計50勝","Win 50 PvP duels","대인전 누적 50승"),"record","wins",50);
add("wins:100",mt("百戦の証","A Hundred Victories","백승의 증표"),mt("対人戦で累計100勝","Win 100 PvP duels","대인전 누적 100승"),"record","wins",100);
add("wins:200",mt("勝利を重ねる者","Victories Unfold","승리를 쌓는 자"),mt("対人戦で累計200勝","Win 200 PvP duels","대인전 누적 200승"),"record","wins",200);
add("wins:1000",mt("千勝の誉れ","A Thousand Victories","천승의 영예"),mt("対人戦で累計1000勝","Win 1000 PvP duels","대인전 누적 1000승"),"record","wins",1000);
add('record:sixes',mt('六面の祝福','Blessing of Six','여섯의 축복'),mt('対人戦でサイコロの6を累計100回出す','Roll a six 100 times in PvP','대인전에서 주사위 6을 누적 100회 기록'),'record','sixes',100);
add('record:allSeries',mt('境界なき探究','Boundless Discovery','경계 없는 탐구'),mt('全シリーズで、対象カードを2種類以上使用してそれぞれ1勝','Win once with at least 2 different cards from every series','모든 시리즈의 대상 카드 2종 이상을 사용해 각 1승'),'record','allSeries',MEDAL_SERIES.length);
export const MEDAL_BY_ID:ReadonlyMap<string,MedalDefinition>=new Map(MEDALS.map(m=>[m.id,m]));
