import type {Id} from './richCatalog';

/** User selection, 2026-10-07: R4 02 for all five; original Half Elf 01. */
export const selections = {
 HALF_ELF: 0, ELF: 1, DARK_ELF: 1, HIGH_ELF: 1,
 ELDER_ELF_KING: 1, WORLD_TREE: 1, VITAL2: null, VITAL3: null,
} as const satisfies Record<Id, number | null>;
export function isVerdant(id: string | undefined): id is Id {
 return !!id && Object.hasOwn(selections, id);
}
