import lumi from '../assets/single/lumi.webp?no-inline';
import noel from '../assets/single/noel.webp?no-inline';
import vera from '../assets/single/vera.webp?no-inline';
import sion from '../assets/single/sion.webp?no-inline';
import shion from '../assets/single/shion.webp?no-inline';
import rena from '../assets/single/rena.webp?no-inline';
import aries from '../assets/single/aries.webp?no-inline';
import type { BotDifficulty } from '../shared/bot';

export const rosterPortraits: Record<BotDifficulty, string> = { easy: lumi, normal: noel, hard: vera, hell: sion };
export const storyPortraits = { shion, rena, aries };
