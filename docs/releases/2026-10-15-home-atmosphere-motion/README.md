# More visible HOME sunlight and ivy movement

The staged HOME's sunlight and ivy were too restrained. Sun shafts now move their floor endpoints through a larger arc (56 + 18 source pixels instead of 12 + 6), change width more visibly, and develop stronger, overlapping changes in brightness and internal streaks. Window origins remain fixed and floor pools follow their shafts. Cloud transmission still affects each aperture independently. The guide's warm key light follows the same sweep and daylight sample.

Ivy's main tip bend increases from 4.8 to 11 source pixels, with moderate leaf flutter and a slowly varying breeze. The top is fixed; the marble beneath remains stationary. Existing artwork, resolution and renderer count are unchanged.

Local HOME runtime checks cover four viewport sizes, centered duel text, shadowless guide, changing shared daylight, repeated navigation, reduced motion, hidden tabs, late texture completion and WebGL fallback. Results are in `local/checks.json`. The fixture now serves runtime source directly without constructing the production asset packs; production build validation remains part of the guarded release. Motion capture and sampled daylight values are saved under `motion/`.

Release uses the current `gh/main` and `scripts/deploy-guard.mjs staging`. Deployment and live artifact verification are recorded separately after release; local fixture checks do not establish authenticated gameplay.
