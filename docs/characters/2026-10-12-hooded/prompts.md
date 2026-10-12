# Imagegen prompts

Built-in image_gen. No video generation. Original source sheets are retained in `source/`. Runtime extraction and registration: `node scripts/build-hooded-seekers.mjs`.

## Male

Use case: stylized-concept. Production game sprite atlas for LORE.
Create ONE precise sprite sheet: exactly 8 columns and 7 rows, 56 equal square cells, no gutters, no borders, no text. Overall aspect ratio 8:7, 2048x1792 if possible. Pure white #FFFFFF background.
Every cell contains the SAME full-body anonymous MALE hooded seeker, a small premium pixel-art game character at roughly 128x128 native pixel detail per cell. 3-head-tall compact stylized adult, broad shoulders, deep navy blue layered cloth hood and cloak, subdued blue inner tunic, silver narrow trim and one small silver diamond chest clasp, dark gloves and boots. Entire face is an empty dark hood void: absolutely no eyes, face, skin or hair. Carefully clustered square pixels and stepped edges, restrained palette, beautiful readable folds, strong silhouette. Not smooth anime, not 3D.
Fixed orthographic slightly three-quarter front view, facing slightly right. Every frame same scale, same boots ground line at 84% cell height, same x-center 50%; hood top around 17%. All body and actions confined to central 64% cell width and 70% height with safe white margins. No dramatic camera or squash/stretch. Cloth and gloved hands move to express each action.
Rows top to bottom, 8 frames left to right:
1 IDLE: tiny slow breathing, shoulders rise only 1-2 native pixels then settle; slight delayed cloth motion. Frame 1 and 8 same neutral standing pose, hands resting beside torso.
2 MANA GAIN: neutral -> hands gathering at waist -> palms lift toward clasp -> blue light travels narrowly along sleeve trim to palms -> cupped blue angular mana between close hands -> draws power to clasp -> lowers hands -> exact neutral pose. Light stays attached to hands and cloth, no orbiting ring.
3 HEAL: neutral -> one hand to chest -> bows hood slightly -> soft mint stitching glow at chest -> shoulders straighten with relief -> hand relaxes -> lowers -> exact neutral. Body language and cloth do the work.
4 LIGHT HIT / BRAND: neutral -> shoulder braces -> short small sideways recoil with one glove over chest -> hood dips -> foot stays planted -> cloth settles -> recovers -> exact neutral. No wounds, no text or UI symbols, no stray particles.
5 HEAVY HIT: neutral -> braces -> pronounced torso leans back while boots stay planted -> bends knee and guard raised -> lowest recoil -> pulls upright -> settles -> exact neutral. Peak distinct from light hit but fully within cell.
6 DEFEAT: neutral -> clasp hand falters -> hood bows -> knees bend -> slowly sinks to one knee -> cloak pools naturally -> hand rests on knee -> final still bowed kneeling pose. No death, gore, disappearing body.
7 VICTORY: neutral -> straightens -> raises closed fist near shoulder -> confident small fist lift -> hood nod -> relaxed proud pose -> lowers fist -> exact neutral.
Strong frame-to-frame character consistency: SAME hood silhouette, clasp, costume, boot registration and body size; the row 1 col 1 neutral pose should match first and last cells of rows 2,3,4,5,7. Each frame is individual animation art, not a storyboard. No letters or numbers or grid lines.

## Female

Use case: stylized-concept. Production game animation sprite atlas, matching the attached MALE sheet's pixel-art rendering and exact 8 columns by 7 rows grid.
Create the corresponding FEMALE hooded seeker: this must be a DIFFERENT silhouette and outfit, not just a recolor. Adult female, compact 3-head-tall stylized full body, narrower shoulders, sharply tapered tall hood, elegant fitted layered long cloak with split skirt panels, deep burgundy/oxblood red cloth and muted red lining, narrow ivory/silver edging, small diamond silver chest clasp, black gloves and boots. Absolutely NO face, eyes, skin, hair or face features visible: hood opening is solid dark void in every frame. High quality clustered pixel art, restrained shading, visibly stepped pixel edges around 128x128 native pixel detail per cell.
ONE complete atlas, exactly 8 columns and 7 rows, 56 equal square cells, no gaps/borders/text, overall 8:7 aspect ratio, 2048x1792 if possible. Pure #FFFFFF background. Same camera, scale, centered full body and boots line for every cell. Facing slightly right. Body within central 64% width and 70% height, hood top at17%, boots at84%; fit entirely within an avatar window. No camera pan, no changing size, no body drifting.
Rows top to bottom; sequence left to right exactly 8 frames:
1 IDLE: extremely subtle breathing, one native pixel shoulder lift and delayed cloak hem movement, returns neutral.
2 MANA: neutral, hands gather, palms rise to chest, attached blue sleeve trim glow, concentrated small blue mana between hands, draws it to clasp, hands lower, exact neutral.
3 HEAL: neutral, glove to chest, slight bow, mint glow on clasp and stitching, relieved straighten, relax, hand lowers, exact neutral.
4 LIGHT HIT: neutral, brace, small shoulder recoil, chest guard, hood dips, straighten, settling, exact neutral.
5 HEAVY HIT: neutral, brace, larger backward torso recoil, bent knees and raised guard, lowest recoil, recover halfway, straighten, exact neutral. No blood.
6 DEFEAT: neutral, faltering hand, hood bows, lowers on one knee, settles cloak, kneeling with bowed hood, final kneeling repose, SAME final kneeling repose. LAST FRAME MUST REMAIN KNEELING, NEVER STAND UP.
7 VICTORY: neutral, straighten, fist rises near shoulder, small confident fist lift, proud nod, relax, hand lowers, exact neutral.
For rows 2,3,4,5,7 first and last frames match the idle neutral exactly. No particles or external rings; glows stay localized to glove and clasp. All 56 cells must depict the FEMALE only. The attached image is a style/grid reference only; don't copy the male body or blue costume. Not smooth anime, not vector, no typography.
