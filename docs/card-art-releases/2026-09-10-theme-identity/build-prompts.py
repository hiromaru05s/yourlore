import pathlib,json
r=pathlib.Path(__file__).resolve().parent
cards={c['id']:c for c in json.loads((r/'card-snapshot.json').read_text())['cards']}
themes={
'golem':('ゴーレム','F170-GOLEM3.png','Rust: monumental working constructs, weathered ivory ceramic slabs over dark basalt, visible heavy copper joints and turquoise cores. Wide industrial excavation landscapes, gantries and ore strata. Weight, irregular blocks and practical machinery. No palace, throne hall, human face, futuristic robot, or knight wearing ordinary plate armor.'),
'hexer':('呪術師','F221-HEXER4.png','Blood: ceremonial masked spellbinders in peat-black, muted plum and wax ivory. Keep distinctive porcelain masks with narrow eyes and gold-repaired cracks; mask shape changes by rank. Tangled cords, knotted charms, thorn cages and violet candle smoke. Reed marsh, hanging willow roots, fabric shelters and carved timber ritual stations. No gothic cathedral, vampire wings, or identical handsome uncovered faces.'),
'mimic':('ミミック','F025-MIMIC.png','Rust: living treasure-chest ecology. Preserve barrel lid, walnut frame, worn ivory/navy panels, brass bands, round ornament and shield latch from reference. Distinct silhouettes through legs, tongues, teeth, shell damage and rank. Damp subterranean treasure geology: mineral pools, mine tunnels, salt shelves, collapsed hoards. Moss, grime and patina. No bright marble palace or unrelated furniture monsters.'),
'demon':('魔族','F167-VAMP5.png','Blood: demons are visibly nonhuman, obsidian horns, ember fissures, tough ash-red hide, asymmetric black-glass body armor and angular hooked silhouettes. Red basalt badlands with charcoal ash skies, fumaroles and floating jagged black rock. Crimson plus scorched orange. No pale pretty vampire, white palace, feather wings, or library.'),
'predator':('捕食','F032-TPO5.png','Feral predator lineage: nonhumanoid powerful feline-canid anatomy, ochre charcoal mottled hide, ivory blade-like bony back plates, long canines and yellow eyes. Thorn savannah, dry gullies, dusty hunting grounds, wind-bent grass. Warm ochre/sienna and bone palette. Skin and fur, not stone statues; no buildings, crowns or human costume.'),
'noble':('貴族','F034-TAR5.png','Crown: aristocratic human society, peacock teal and midnight blue velvet, ivory lace, restrained old gold, heraldic brooches, dignified distinctive ages and profiles. Intimate lived-in aristocratic places: paneled salon, winter garden, estate coach, tapestry room. Jewel green light and warm candles. No repeated white palace steps, blood moon, vampire fangs or cathedral.'),
'lonely':('孤独','F180-ELF.png','Solitude: sparse desaturated slate blue, mist silver, pale ochre cloth; weather-worn practical traveler designs. Vast empty salt flats, windswept coast, lonely upland and isolated shelters. Strong negative space, one subject and clear horizon; intimate solemn mood. No decorative palace, crowds, gold armor or giant magic rings.'),
'origin':('始原','F072-TGE7.png','Roots primordial lineage distinct from worldtree and elves: smooth dark volcanic stone, amber translucent sap, spiral fossil and seed geometries; organic embryo-like living forms woven from pale roots and amber. Geothermal terraces, misty fern caldera, still black water, unworked standing stones. Amber/orange with blue steam. No leafy human elf, royal library, marble hall or ordinary gold-armored king.'),
'vampire':('吸血鬼','F167-VAMP5.png','Blood: recognizable elegant vampires, visible tiny fangs, pale skin, wine velvet, black silk, red glass and silver filigree. Distinct ranks/ages/hair/silhouettes; special rank retains long silver hair. Night vineyard, velvet chamber, canal manor, crypt wine cellar; blood-red reflected light and cool moon shadow. No white public cathedral, demon horns, uniform huge bat wings on every rank, or same face copied to all.'),
'elf':('エルフ','F180-ELF.png','Roots: long-eared woodland people with individual hair, age and face; jade woven leaves, warm bark leather, copper branch fittings, ivory linen as small accents. Elevated tree dwellings, woven root bridges, giant fern canopy, rain-catching leaf roofs. Dappled green light and warm copper. No stone palace, gold crown on every elf, dark elf, or a clone of the reference face.'),
'assassin':('アサシン','F080-ASSASSIN4.png','Blood: stealth guild, lean practical silhouettes, ink navy layered cloth, muted oxblood scarf, asymmetric segmented leather, small concealed blades. Rainy slate rooftops, tight timber alleys, red paper lamps, hidden passages, chimney smoke. Deep teal shadows and sparse vermilion signals. Faces use cloth or subtle half-mask; preserve Nightlord special identity, porcelain ritual masks primarily belong to hexers. No castle cathedral, open ceremonial plinth or elaborate spiky gold full armor.'),
'worldtree':('世界樹','F180-ELF.png','Roots sacred ecology: colossal living tree and its connected roots, honey-gold sap, emerald leaves, cream-white living bark, jade pools and soft luminous pollen. Every place is grown wood, roots, moss, flowers and flowing water, dramatic organic scale. Distinct viewpoint and season for each card. No stone buildings, pillars, marble pedestal, gold metal compass ornament or generic potted tree.'),
'decay':('腐敗・マッシュルーム','F032-TPO5.png','Rust decay ecology: orange-rust mushroom caps with verdigris speckles, blue-green luminous gills, pale fibrous stalks, oil-dark peat and corroded iron. Spore colonies in drowned scrapyard, rotten logs, fungus caverns and bog. Chartreuse corrosion with copper orange. Wet organic textures; mushrooms are main visual motif, no white palace, flower garden, bright clean laboratory or cute generic red polka-dot toadstools.')}
rows='''golem|M10|Compact broad golem channels turquoise mana through exposed copper tubing at an open-pit ore spring; squat barrel torso and big three-segment hands.
golem|NGA3|Lean wedge-headed warrior golem with one massive quarry-cut forearm blade on a suspended cargo bridge above orange furnaces.
golem|NWL3|Wide low guardian golem, tall shield-like forearms locked together, deflecting sparks at a mine shaft floodgate; no sword.
golem|MANA_GIANT|Enormous long-armed golem rises beside stepped quarry walls, green-blue core exposed through missing chest plates; dust and small cranes establish scale.
golem|GOLEM1|Small sturdy soldier golem, square faceless head and riveted joints, stepping from a clay casting mold in a soot-stained workshop.
golem|GOLEM2|Leader golem with asymmetrical shoulder signal fin, rotating core rings and one raised directing hand in a rain-soaked ore rail yard.
golem|GOLEM3|Golem king stands within a circular open-air foundry pit, crown integrated into a blocky faceless head, broad hexagonal core, enormous hammer resting on ground. Keep king identity but replace the throne pose entirely.
golem|AEM|Two different golem forearms on a low workshop bench receive orange molten enchantment veins, turquoise cores pulsing; close-up tools and metal shavings.
golem|KNIGHT_TEACH|Golem king's enormous intact stone hand sets three lit core stones before a small soldier golem in a dusty quarry training circle; no human king statue.
hexer|NHEX|Young short-haired apprentice wears a chipped one-eye ivory mask and uneven wool cloak, crouching under a willow shelter to tie a violet curse charm over a peat bowl.
hexer|HEXER1|Adult woman with braided dark hair, half oval porcelain mask covering nose and one cheek, layered plum shawls; knots a thorn thread on a hanging reed walkway over dark wetland.
hexer|HEXER2|Broad middle-aged man, full blunt rectangular cracked ceramic mask, heavy rope collar, coiled scroll belt; turning a smoke censer inside a low black-cloth ritual tent.
hexer|HEXER3|Tall thin elderly masked figure with swept-back gray hair, long narrow porcelain mask and branching head cords; violet ribbons connect five wax charms in a dead willow grove at blue dusk.
hexer|HEXER4|Keloid retains long silver hair, full pointed ivory mask repaired by dark/gold cracks, high plum collar and thorn staff. Sideways stance on a black marsh islet; cages a blue incoming spell in one thorn halo, violet bog lights behind. Full staff and mask in frame.
hexer|CURSE|One small cracked ivory face-mask amulet bound in black thread, violet curse smoke leaking onto a stained reed mat in a dim timber hut.
hexer|QUICK_GRIMOIRE|Heavy stitched black spellbook open among mask molds and violet candles in a cloth-lined occult tent; violet glyph geometry streams into a few warm gold mana sparks. No text paragraphs or coins.
hexer|WEAKEN_ALL|Two empty wooden target effigies sag as black knotted cords drain their violet glow into a porcelain mask hanging from a willow branch.
mimic|MIMIC|Small low living chest with eager crooked teeth and short brass claw feet peeks from under a collapsed mine-cart beside a green mineral puddle; full body.
mimic|MIMIC2|Master mimic with long curling split tongue, broader worn lid and crablike articulated legs crouches on a salt-encrusted treasure shelf lit by blue crystals.
mimic|MIMIC_LORD|Leader mimic, narrow upright lid with one raised brass crest and long stout rear legs, standing at a fork in mine tunnels with stolen keys dangling from its latch.
mimic|AWAKENED_MIMIC|Awakened mimic emerges from shallow black water, chest ribs opening into a glowing inner mouth, muscular tongue and four clearly joined legs; submerged coins shimmer.
mimic|MIMIC_KING|Heavy broad king mimic with a crown-shaped brass rim and thick ivory tusks guards a mound of weathered treasure in a round mineral cavern, viewed low with whole silhouette visible.
mimic|MIMIC_KING2|Second mimic king has a tall double-tier barrel lid and dark navy reinforced panels, a long ribbon tongue carrying one tarnished crown; sits in an abandoned jewel mine elevator.
mimic|ORIGIN_MIMIC|Primordial mimic: recognizable ancestral wooden barrel-lid chest grown around an amber seed core, root feet and amber teeth, half buried in petrified roots deep in a fossil cavern.
mimic|LUCKY_CHEST|Closed attractive brass-bound ivory/navy chest on a precarious tilted treasure ledge; just a narrow lid gap reveals teeth and a dark tongue, suggesting risky reward. Gem-lit cave and scattered broken lucky tokens.
mimic|DUNGEON_FLOOR|Dramatic winding subterranean mine floor seen from low angle, several small recognizable mimics emerging between abandoned carts and treasure pockets; black rock and green mineral light.
mimic|GEM_RAIN|Falling blue, amber and red gems strike the brass shell of one delighted mimic in a dark treasure shaft; gems strengthen the shell in small glowing facets.
mimic|QUICK_MIMIC|One playful dangerous mimic bounds over wet mine timbers while two intact miniature chest-record cards move into a small violet Rift behind it. No shredded paper.
mimic|DUNGEON|Organic stone dungeon passage bends into a toothy mouth, wet wood braces and mine rails leading inward, amber eye cracks in rough wall, no palace facade.
mimic|QUICK_SURVIVAL|Close view of a battered lantern at the lip of a living dungeon maw in a collapsed tunnel, tiny red flame facing immense stone teeth; claustrophobic survival.
demon|TDE1|Small wiry horned demon scout with backward bent legs, ash-red skin and one broken black horn, surveying a volcanic scree ridge through falling cinders.
demon|TDE2|Stocky ash-skinned demon warrior, broad ram horns and one black-glass cleaver, braced beside a fumarole in a field of jagged red basalt.
demon|TDE3|Towering hunched demon berserker with a jagged split horn crest, heavy muscular forearms and glowing ember cracks, charging through a black ash canyon; no wings.
demon|TDE4|Demon king, imposing dark nonhuman face, massive swept crown-horns and folded angular membranes, black-red layered mantle; suspended basalt stepping stones over an orange molten caldera.
demon|DEMON_REALM|Sweeping impossible demon landscape: red basalt shelves and black floating rock, ember geysers and a black-glass gate grown as horns, no humanoid subject or white city.
demon|GS5_3|Unfurled sealed folio on black volcanic glass, four horn-shaped red spectral seals dissolve under cold white deciphering light. A demon-repelling spell, not a pretty library book still life.
demon|INFERNO|A spiraling abyss of ember-orange flame inside black basalt fumaroles; heat pressure bends red ash clouds, no castle or human victims.
predator|TPO1|Small rangy cub with oversized paws, short ivory back spines and alert yellow eyes, snarling from a dry thorn burrow; charming ferocity without toy proportions.
predator|TPO2|Gaunt adult stalker with exposed rib contours, long canines and coarse mottled ochre fur; prowls low through sun-bleached grass beside a cracked watering hole.
predator|TPO3|Lean long-legged tracker, blade mane laid back, nose close to fresh tracks on a dusty canyon shelf at dusk; full tail curling inside frame.
predator|TPO5|Massive saber-fanged alpha with muscular shoulders, layered ivory back plates and scarred charcoal/ochre pelt, pinning a broken shell in a thorn ravine; low cinematic angle, organic flesh not stone.
predator|PACK_INSTINCT|Two matching lean ochre blade-backed predators move in coordinated parallel through waist-high dusk grass, shoulders linked by faint amber instinct light.
predator|SLAY_ART|Close up curved ivory fang and predator claw slicing through an empty shell at the edge of a dry watering hole; sharp ochre dusk and dust.
noble|TAR1|Older human butler with spectacles, silver sideburns and impeccably tailored peacock vest opens a sealed correspondence tray in a wood-paneled salon.
noble|TAR2|Dispossessed aristocrat, tired young woman with short black hair, frayed teal velvet coat and one heirloom brooch, sits in an overgrown winter conservatory with cracked glass roof.
noble|TAR3|Disgraced middle-aged knight, weathered face and cropped gray hair, battered half armor over faded teal sash, alone beside a rain-streaked estate carriage; no grand palace stairs.
noble|TAR5|Dignified older lord with salt-and-pepper beard and broad structured teal velvet mantle stands at a large bay window of a paneled map room; carved estate hedges and low dusk landscape outside.
noble|LAND_GRANT|Wax-sealed estate charter, old brass key and miniature boundary marker laid across a landscape map on a walnut desk under green stained-glass light, no readable writing.
noble|MAJESTY_RITE|An heirloom heraldic brooch casts a peacock-gold mantle of light over one empty velvet ceremonial coat hanging in a tapestry room.
noble|RICH_HABIT|Close still life of a polished tea set, stacked sealed folios and a small coin dish on a dark walnut table, clipped formal garden outside; quiet inherited routine.
lonely|TSO1|Older hermit with a round weathered face, slate wool hood and simple driftwood staff cooks over a small fire in a cliffside shelter above an empty gray sea.
lonely|TSO2|One lean silver-gray wolf with a dark ear and weathered coat stands on a low salt ridge, long flat blue horizon and sparse windblown grass, no pack or ruins.
lonely|TSO3|Solitary hunter with short dark braid, practical muted blue cloak and unadorned curved bow crosses a snow-dusted high moor; broad empty sky behind, no companions.
lonely|TSO5|Tall solitary wanderer, concealed face under pale ochre scarf, patched asymmetric travel coat and one staff, walking a narrow causeway across immense still gray-blue salt water.
lonely|HERMIT|Tiny lived-in hollow driftwood shelter, one bedroll and warm cup beside a low fire, wide empty coastal horizon visible beyond; no person.
lonely|MEDITATE|A single seated robed silhouette on a flat rock in pale blue dawn fog, restrained small breath ripple reflected in still water, no architecture or ornate halo.
origin|TGE1|Translucent amber egg with spiral fossil veins rests in a natural black-stone geothermal bowl, pale root tendrils supporting it above steaming water.
origin|TGE2|Small floating seed-flame spirit, amber heart and curling pale root ribbons, emerging between dark stones in a steaming fern caldera; no literal candle.
origin|TGE3|Low broad quadruped guardian grown of basalt plates and ivory roots, amber spiral core, standing across a shallow geothermal stream, gentle but immovable.
origin|TGE4|Tall faceless primordial judge with split oval basalt head, amber eyeslit and two balanced root arms, at a circle of unworked standing stones in blue steam.
origin|TGE5|Airy spiral-bodied primordial spirit woven of pale roots around amber sap droplets, floats above a quiet black lake with fern silhouettes, not a human fairy.
origin|TGE6|A colossal long-backed root-and-basalt giant rising through steam above layered orange thermal terraces, small ferns for scale, no castle.
origin|TGE7|Primordial monarch has an open spiral amber crown grown from roots, elongated faceless dark head and massive root shoulders; kneels at a spring inside a mist-filled volcanic crater, no conventional throne.
origin|GENESIS_SONG|Concentric amber sound ripples emerge from a hollow fossil shell among tall ferns and bend rising thermal steam into spirals; no book or musician.
origin|GENESIS_MAGIC|Amber seed suspended over a natural black stone basin releases seven fine rootlike rays into the mist, close macro magic with geothermal colors.
origin|ORIGIN_RITE|Ring of unworked basalt seed stones around an amber root knot; one target stone splits as an amber pulse travels over the ground in a fern clearing.
origin|ORIGIN_QUEST|Open spiral fossil split in half on a dark volcanic riverbed, tiny growing amber seed exposed within; fern reflection and mist suggest discovery.
vampire|VAMP1|Youthful adult vampire with short tousled dark hair and tiny visible fang, simple wine waistcoat and rolled ivory sleeves, watches red sap fill a glass in a dim vineyard workroom.
vampire|VAMP2|Adult female vampire with chin-length black bob, sharp calm eyes and wine velvet riding coat, stands in moonlit vine rows holding one small silver chalice.
vampire|VAMP3|Middle-aged male vampire with slicked-back dark hair and a narrow mustache, asymmetrical garnet-lined cloak, reflected in black canal water beside a timber manor balcony.
vampire|VAMP4|Tall mature vampire woman with a silver-streaked long braid, high fan collar and deep crimson dress, controls a ribbon of blood-magic over a flooded red-glass conservatory floor.
vampire|VAMP5|Special vampire retains long silver hair, pale pointed features, red eyes and black wine armor, folded bat wing shapes framing him; stands on dark vineyard ridge under a blood moon, full head/wings safely framed.
vampire|VAMP_BUTLER|Severe older vampire butler with pale slick silver hair, tiny fangs, black tailcoat and wine cravat carries a silver tray through a low vaulted wine cellar lined with huge oak barrels.
vampire|BLOOD1|Ruby droplets rise from a red glass cup and unfold three intact blank parchment cards over a dark wine-cellar tasting table, no person or text.
vampire|BLOOD_JOY|Bright ruby bubbles rise from a pair of red glass cups beside bursting dark grapes in a lantern-lit vineyard arbor; joyful vitality.
vampire|BLOOD_ANGER|One wine-red magic vial bursts a pressure seal, red energy cracks radiate into two empty weapons on a cellar rack; tense angular composition.
vampire|BLOOD_SORROW|An untouched red goblet beside a single white rose reflected in black canal water; one intact record card enters a small violet Rift reflected beneath, restrained sorrow.
vampire|BLOOD_PLEASURE|Spiraling silk-like ruby liquid feeds an elegant silver mana vessel on a blackwood table among velvet drapery and softly glowing red glass.
vampire|VAMP_PACT|Silver signet bites into a red wax contract seal, small novice vampire-shaped shadow rises on a cellar wall; no readable text or human injury.
vampire|VAMP_PACT2|Two red wax seals connect by a fine ruby thread across an ivory folded contract beside a riding glove in a moonlit vineyard gatehouse.
vampire|BLOOD_FEST|Night vineyard banquet of red glass cups and dark grapes, an unoccupied long oak table under hanging crimson lanterns, ribbons of ruby magic gather overhead.
vampire|BLOOD_SHIELD|Red glass goblet within a thin silver cage, ruby impact deflects around it into a translucent protective shell in a barrel cellar.
vampire|VAMP_WARD|One closed black lacquer coffin wrapped in a clear ruby protective membrane; white roses and silver chains in a shallow canal crypt, avoid gore.
vampire|BLOOD_SECRET|A red glass chalice draws a fading vampire-shaped crimson wisp into three small dark mana vessels in a candleless secret cellar, no corpse.
vampire|BLOOD_RITE|Ruby stream through a twisting silver vessel changes into warm healing gold as it fills two red glass cups at a vineyard spring after dusk.
elf|HALF_ELF|Freckled young adult with shoulder-length chestnut hair, subtly pointed ears, practical bark vest and jade shawl tends a tiny golden sap sprout at a root-bridge home entrance.
elf|ELF|Copper-haired female woodland archer with a short side braid, very long ears and jade leaf-woven cloak balances on a living branch bridge under immense ferns, bow fully framed.
elf|HIGH_ELF|Graceful mature high elf with tightly braided platinum hair, leaf-shaped copper ear cuffs and long jade/cream woven robes, directing rain from a giant leaf roof in a high canopy garden.
elf|ELDER_ELF_KING|Aged elf king with angular lined face, long pale hair, white brows and a modest branching copper circlet stands at an immense living tree lookout; flowing jade bark-weave mantle, no marble throne.
elf|ELF_HAVEN|Cozy elevated elf rest village made entirely of woven branches, hanging seed lamps and curled leaf roofs above fern canopy, a small stream carried through living root channels.
assassin|ASSASSIN1|Young adult novice with cropped hair, lower-face cloth wrap and short ink cloak, crouches beside a red-lantern timber alley drain holding one short hooked blade.
assassin|ASSASSIN2|Adult female assassin with tight black braid, asymmetrical hood and oxblood waist cord slips between rain-soaked tile roofs, one hand on gutter, compact wrist blade.
assassin|ASSASSIN3|Older lean male assassin with one visible gray eyebrow, layered slate scarf and two narrow concealed knives hangs beneath a wooden footbridge above a dark canal, controlled stealth.
assassin|ASSASSIN4|Nightlord retains dark tousled hair, narrow pointed white mask and long muted red scarf, now in sleek practical ink layered gear; poised on a rain-wet roof ridge amid dense wooden roofscape and sparse red lanterns. Two elegant blades safely within frame.
assassin|GUILD_CHEST|Closed worn ivory/navy brass-bound guild chest with a red wax dagger seal concealed beneath loose planks in a rainy rooftop hideout; no teeth needed unless a tiny hidden gap.
assassin|GUILD_EYE|Tiny red signal lamps and fine nearly invisible threads connect shuttered attic windows across a dense rainy timber alley, an eye-shaped spy aperture foreground.
assassin|GUILD_HALL|Hidden assassin branch entrance behind a narrow wooden stair and red hanging lantern in a rain-soaked back alley, subtly notched dagger mark, no grand hall.
assassin|GUILD_HQ|Unassuming high timber guild house nested among slate roofs, covered bridges and red lamps, secret night market lit behind sliding shutters; dense intimate city rather than castle.
assassin|NL_SECRET|Two slim blades and a folded ink cloak on a wet rooftop; red afterimage slips around a rain streak to express evasion and ambush, no person required.
assassin|AMBUSH|A hidden dagger trap snaps from beneath a loose wooden alley plank, thin red slash intercepting a lantern shadow in rain; no injured people.
assassin|Q_ASSASSIN|Small black-red sealed message cylinder passed along a taut rooftop courier wire into a shuttered attic, one intact record card disappears into a precise violet Rift beyond.
worldtree|WORLD_SEED|Huge warm golden seed half-rooted in dark moss, white hair roots spreading into jade water; intimate macro under a colossal canopy.
worldtree|LIFE_CYCLE|A curved living root carries buds, leaves, ripe seed and fallen leaf around one natural pool, lifecycle as organic spiral, soft green and honey light.
worldtree|LIFE_SANCTUM|Sheltering hollow inside an immense white-barked tree, luminous gold sap vein and jade spring, curtains of thin living roots; no stone construction.
worldtree|WORLD_HEART|Heart-shaped knot of dense glowing amber sap and entwined living roots inside the tree's dark wooden core, pulsing fine green veins; no metal or pedestal.
worldtree|WORLD_BLESS|Rain of warm golden pollen descends through giant emerald leaves to heal a cracked young branch beside a forest stream, luminous environmental close-up.
worldtree|VITAL2|Humble worldtree devotee with broad sunworn face, linen wrap and moss-green shawl receives warm sap in a wooden bowl among gigantic roots, distinct from elegant elves.
worldtree|VITAL3|Powerful older human tree keeper with braided gray hair and layered living-bark shoulder guards stands knee-deep in jade spring, holding a root staff beneath towering white bark.
worldtree|WORLD_CARE|Massive white-barked root cradles a cluster of tiny new saplings above a moss pool, gentle amber sap droplets nourish them; low intimate view.
worldtree|WORLD_TREE|Full awe-inspiring worldtree rises from a lake island, twisting cream living bark and immense emerald canopy with golden sap channels; distant roots like mountains, no palace skyline.
worldtree|HPS_GRAFT|Fresh green branch joined into damaged living bark by fine glowing root fibers, macro botanical craftsmanship in wet forest light.
worldtree|HPS_SOIL|Cross-section-like natural exposed riverbank with dark rich soil and dense luminous white root network feeding a sapling; emerald and gold, no diagram labels.
worldtree|QUICK_WORLD|Worldtree heart glowing inside an open natural trunk hollow, gold sap surges outward along roots into leaf buds; strong organic silhouette and deep forest shadows.
decay|RUST_SHROOM|Large lively rust-orange mushroom creature with broad uneven cap, turquoise luminous gills, fibrous stalk legs and tiny recessed eyes, walking on a corroded rail through a wet peat bog.
decay|RUST_SLUG|Heavy soft pale slug carrying clustered rusty mushroom caps as its shell, blue-green gills and viscous trail corroding an iron plate in flooded scrapyard; full creature.
decay|DECAY_CRAFT|Two iron daggers on rotten wood become coated in orange fungal growth and green corrosive slime, spore threads bind handles in a fungus cave.
decay|ACID_RAIN|Thin chartreuse rain etches a discarded iron shield beneath giant rust-orange mushroom canopies in a dark bog, no living victim.
decay|STRONG_ACID|Violent acidic downpour opens orange rust channels across an abandoned iron gate while blue-green mushroom gills blaze in storm darkness.
decay|ROTTEN_GROUND|Dense orange and teal fungal colonies split waterlogged ground, overturned corroded gears swallowed by pale mycelium and oil-black puddles, ground-level view.
decay|Q_DECAY|Rusty iron caltrops overtaken by orange mushrooms exude green poison onto a rotting timber walkway in a fungal swamp; threat readable up close.
decay|QUICK_POISON|A bulbous mushroom pore drips two thick green drops onto a corroded empty armor plate in dark peat; macro cap/gill texture replaces generic poison bottle.
mimic|GREED_PRICE|Two low ivory/navy mimics gather greedily around spilled amber gems in a collapsed treasure mine, while five intact small chest-record cards move into a violet Rift above a broken coin hoard. No shredded paper or palace.'''
jobs=[]
for line in rows.splitlines():
 theme,id,scene=line.split('|',2);c=cards[id];label,ref,direction=themes[theme]
 prompt=f'''Use case: stylized-concept. Generate ONE new finished LORE TCG inner-art painting, exact intended canvas 1472x1344 (landscape aspect 1.095:1). Reference is a STYLE / MATERIAL anchor, not a composition or background to copy. User requests theme identities clearly distinguishable at a glance; substantially redesign background and silhouette while retaining the refined illustrated fantasy art style.\nTheme: {label}. {direction}\nSpecific scene and character: {scene}\nCard identity: {c['nameJa']} ({id}); current effect for semantic guidance only: {c.get('textJa','—')}. Do not print effect or name.\nRendering: premium Japanese fantasy card illustration, nuanced hand-painted texture, expressive clean shapes, beautiful atmospheric light, grounded materials. Keep finish and sophistication of reference. Important subject occupies 55-68 percent, complete face/ears/horns/weapon tips/paws inside central 80 percent with meaningful environment visible. Scene should look inhabited or natural, not staged on a pedestal. One dominant subject unless the scene explicitly needs more. No repeated white arches/cathedral/library, compass-star decor everywhere, frame, UI, text, watermark, signature, modern objects, or photorealistic snapshot. Do not import reference character identity into unrelated people. Magical Rift leaves record cards intact. No gratuitous gore.'''
 if c['t']!='mon' and theme not in {'golem','hexer','mimic'}: prompt+=' This is a spell or quest environment/artifact illustration: do not add the reference human character. Use only the subjects explicitly described in the specific scene; any specified symbolic shadow may remain. The artifact or phenomenon must dominate.'
 jobs.append({'number':f'R{len(jobs)+3:03d}','id':id,'theme':theme,'themeJa':label,'name':c['nameJa'],'effect':c.get('textJa',''),'scene':scene,'reference':[str(r/'references'/ref)],'prompt':prompt})
assert len({j['id'] for j in jobs})==len(jobs)
for i,d in enumerate(json.loads((r/'dog-prompts.json').read_text())):
 jobs.insert(i,{'number':f'R{i+1:03d}','id':d['id'],'theme':'spirit','themeJa':'犬の精霊','name':cards[d['id']]['nameJa'],'effect':cards[d['id']].get('textJa',''),'scene':d['prompt'],'reference':d['refs'],'prompt':d['prompt']})
overrides=json.loads((r/'prompt-overrides.json').read_text()) if (r/'prompt-overrides.json').exists() else {}
for j in jobs: j.update(overrides.get(j['id'],{}))
(r/'prompts.json').write_text(json.dumps({'generator':'built-in image_gen','balanceVersion':'v46','jobs':jobs},ensure_ascii=False,indent=2)+'\n')
(r/'theme-direction.json').write_text(json.dumps({k:{'label':v[0],'direction':v[2]} for k,v in themes.items()},ensure_ascii=False,indent=2)+'\n')
print('jobs',len(jobs));print({t:sum(j['theme']==t for j in jobs) for t in ['spirit',*themes]})
