games=400 finished=400 stepcap_hit=0 loopForcedTotal=66 gamesWithLoopForce=29 elapsed=342.8s

## 1. Game length (g.turn = global turn counter; MAX_TURNS=60 => 30 per player)
mean=20.8 median=18 p10=11 p90=33 min=8 max=60 hitMaxTurns=8 (2.0%)
steps/game: mean=122.4 median=97 p90=207 max=551
turn histogram: 1-10:34 11-20:210 21-30:104 31-40:28 41-50:13 51-60:11

## 2. First vs second player
decided=400 firstPlayerWins=181 (45.3%) secondPlayerWins=219 draws=0

## 3. Mana / HP / field by game-turn (avg over games that reached that turn; per player = averaged over both sides)
| turn | n | avg maxMana | avg HP | avg field monsters | field>=7 sides% |
|---|---|---|---|---|---|
| 5 | 400 | 4.37 | 34.4 | 1.04 | 0.0 |
| 10 | 387 | 5.46 | 27.7 | 1.86 | 0.0 |
| 15 | 279 | 6.72 | 27.7 | 2.13 | 1.4 |
| 20 | 177 | 8.13 | 29.5 | 2.42 | 4.0 |
burst (>=15 HP lost by one player within one turn): gamesWithAnyBurst=110 (27.5%), totalBurstTurns=162, gamesEndedOnBurstTurn=58 (14.5%)

## 4. Per-game action counts (both players combined; mean / median)
| metric | mean | median | p90 |
|---|---|---|---|
| buys | 12.7 | 10 | 25 |
| summons | 16.6 | 13 | 31 |
| spells | 7.1 | 7 | 13 |
| starters | 14.3 | 12 | 27 |
| traps | 3.0 | 1 | 8 |
| atkMon | 12.5 | 8 | 28 |
| atkDirect | 16.1 | 15 | 26 |
| dice | 13.1 | 8 | 32 |

## 5. Top 25 bought cards
| # | id | type | cost | name | buys |
|---|---|---|---|---|---|
| 1 | T8 | trap | 1 | 독가시 마름쇠 | 192 |
| 2 | DARK_ELF | mon | 4 | 다크 엘프 | 191 |
| 3 | VITAL3 | mon | 3 | 세계수의 파수꾼 | 180 |
| 4 | TDE1 | mon | 1 | 마족 척후 | 139 |
| 5 | TDE3 | mon | 3 | 마족 광전사 | 122 |
| 6 | T3 | trap | 2 | 함정 구덩이 | 110 |
| 7 | TGE1 | mon | 1 | 시초의 알 | 107 |
| 8 | NT_NULL3 | trap | 1 | 초급 마력 차단 | 103 |
| 9 | T9 | trap | 2 | 가시 방패 | 103 |
| 10 | NWL3 | mon | 3 | 가디언 골램 | 99 |
| 11 | TAR2 | mon | 2 | 몰락 귀족 | 87 |
| 12 | HIGH_ELF | mon | 6 | 하이엘프 | 84 |
| 13 | T12 | trap | 3 | 성벽 강화 | 80 |
| 14 | MERCH1 | mon | 1 | 견습 상인 | 78 |
| 15 | TAR5 | mon | 4 | 귀족 영주 | 78 |
| 16 | NHEX | mon | 2 | 견습 주술사 | 75 |
| 17 | WORLD_SEED | spell | 4 | 세계수의 씨앗 | 74 |
| 18 | T10 | trap | 3 | 포식 함정 | 74 |
| 19 | ELF | mon | 4 | 엘프 | 72 |
| 20 | NGA4 | mon | 4 | 검귀 | 71 |
| 21 | HEXER4 | mon | 6 | 특급 주술사 - 켈로이드 | 70 |
| 22 | TDE4 | mon | 4 | 마왕 | 70 |
| 23 | TAR3 | mon | 3 | 몰락한 기사 | 67 |
| 24 | E3 | spell | 3 | 지식의 샘 | 66 |
| 25 | NGA3 | mon | 3 | 전사 골램 | 66 |
BUYABLE_POOL=236 ({"mon":96,"spell":114,"trap":26}) distinctBought=183 neverBought=53 ({"spell":49,"mon":3,"trap":1})
buys by card type: {"trap":1090,"mon":3309,"spell":699}
never bought ids: S12, S14, SX4, E1, E2, ND5, AHEUK, AJIN, NHEAL, NWIPE, GS5_3, GM6_1, GS6_4, GS8_0, NT_NULL6, HANDRESET, TIMEWARP, INFERNO, GAMBLE, RUNE2, RUNE3, GENESIS_MAGIC, MULTI_CULTURE, BLOOD2, DISARM2, DISARM3, FORBIDDEN, GUILD_CHEST, HOURGLASS, LIFE_SANCTUM, MEDITATE, HERMIT, GLASS_BAN, VITAL4, PAIN_HARVEST, CULL_FARM, PURGE_ALL, EXILE_NUKE1, EXILE_NUKE2, GOLIATH_HUNT, DOUBLE_EXEC, MARKET_CRISIS, BLOOD_JOY, BLOOD_PLEASURE, VAMP_PACT, BLOOD_SHIELD, VAMP_PACT2, MAJESTY_RITE, CHOSEN_KNIGHT, HPS_OATH, HPS_SOIL, HPS_BOULDER, EXPANSION

## 6. Archetype matchup (row = P0 deck, col = P1 deck; row win% of decided games, n)
| P0 \ P1 | AGGRO | RAMP | MIDRANGE | GAMBLER | ELF | row total |
|---|---|---|---|---|---|---|
| AGGRO | 38% (6/16) | 63% (10/16) | 63% (10/16) | 63% (10/16) | 31% (5/16) | 51% (82/160) |
| RAMP | 50% (8/16) | 25% (4/16) | 63% (10/16) | 69% (11/16) | 69% (11/16) | 55% (88/160) |
| MIDRANGE | 63% (10/16) | 56% (9/16) | 69% (11/16) | 50% (8/16) | 25% (4/16) | 44% (71/160) |
| GAMBLER | 31% (5/16) | 44% (7/16) | 50% (8/16) | 31% (5/16) | 13% (2/16) | 37% (59/160) |
| ELF | 63% (10/16) | 38% (6/16) | 75% (12/16) | 88% (14/16) | 44% (7/16) | 63% (100/160) |
(row total = overall win% of that archetype across both seats; mirror games count for both sides)

## 8. End reasons
{"hp0":393,"turncap":7}
