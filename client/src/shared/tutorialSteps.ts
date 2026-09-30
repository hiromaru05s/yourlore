export interface TutStepMeta { key: string; reward: number; titleKey: string; }

/** Step metadata — shared with the tutorial screen (list + claimed marks). Sum = 890.
 * Keep the existing reward/translation keys: previously claimed progress must not shift.
 * tuto:7 is retired; it is never requested by this curriculum.
 */
export const TUT_STEPS: TutStepMeta[] = [
  { key: "tuto:1",  reward: 50,  titleKey: "tut.s1.title" },
  { key: "tuto:2",  reward: 70,  titleKey: "tut.s2.title" },
  { key: "tuto:3",  reward: 80,  titleKey: "tut.s3.title" },
  { key: "tuto:4",  reward: 90,  titleKey: "tut.s4.title" },
  { key: "tuto:5",  reward: 100, titleKey: "tut.s5.title" },
  { key: "tuto:6",  reward: 90,  titleKey: "tut.s6.title" },
  { key: "tuto:8",  reward: 130, titleKey: "tut.s8.title" },
  { key: "tuto:9",  reward: 80,  titleKey: "tut.s9.title" },
  { key: "tuto:10", reward: 200, titleKey: "tut.s10.title" },
];
