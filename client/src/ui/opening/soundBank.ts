/** Opening sounds: the selected mix is shared by production and preview. */
export const OPENING_SOUND_CUES=['rise','impact','toss','rejoin','friction','land','exit'] as const;
export type OpeningCue=typeof OPENING_SOUND_CUES[number];
export type OpeningSoundVariant='a'|'b';
export type OpeningResultVariant='c'|'d'|'e'|'f'|'g'|'h';
export type OpeningSoundChoice=OpeningSoundVariant|OpeningResultVariant;
export type OpeningSoundMix=Record<Exclude<OpeningCue,'land'>,OpeningSoundVariant>&{land:OpeningSoundChoice};
export type OpeningSoundName=`opening-${OpeningSoundChoice}-${OpeningCue}`;
export const openingSoundMix=(variant:OpeningSoundVariant):OpeningSoundMix=>Object.fromEntries(OPENING_SOUND_CUES.map(cue=>[cue,variant])) as OpeningSoundMix;
export const openingSoundName=(cue:OpeningCue,variant:OpeningSoundChoice):OpeningSoundName=>`opening-${variant}-${cue}`;

/** User selection from the 2026-11-19 screenshot; result III-C confirmed on 2026-11-19. */
export const approvedOpeningMix=(land:OpeningResultVariant='h'):OpeningSoundMix=>({rise:'b',impact:'b',toss:'b',rejoin:'a',friction:'a',land,exit:'a'});
