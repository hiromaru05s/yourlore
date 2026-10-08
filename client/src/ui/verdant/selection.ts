import type {Id} from './richCatalog';

/** User selection, 2026-10-08: R5 new 04 (roots) for all five; original Half Elf 01. */
export const selections = {
 HALF_ELF: 0, ELF: 3, DARK_ELF: 3, HIGH_ELF: 3,
 ELDER_ELF_KING: 3, WORLD_TREE: 3, VITAL2: null, VITAL3: null,
} as const satisfies Record<Id, number | null>;
export function isVerdant(id: string | undefined): id is Id {
 return !!id && Object.hasOwn(selections, id);
}
