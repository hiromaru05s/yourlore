/** Stable receipts: retries and other devices resume the same first-run journey. */
export const ONBOARDING_BASICS = 'tutorial:onboarding:v1:basics';
export const ONBOARDING_DECK = 'tutorial:onboarding:v1:deck';
export const ONBOARDING_DONE = 'tutorial:onboarding:v1:done';
export const ONBOARDING_DRAW = 'tutorial-onboarding-v1-draw';
export const ONBOARDING_BUY = 'tutorial-onboarding-v1-buy';
export const ONBOARDING_REWARD = 3000;
export type OnboardingStage = 'basics'|'gacha'|'starter'|'deck'|'book'|'complete';
export interface OnboardingStatus {stage:OnboardingStage;credits:number;}
export const onboardingDeck = () => [...Array<string>(6).fill('STARTER_TRASH'),'STARTER_CHEST','STARTER_CHEST'];
export function isOnboardingDeck(cards:string[]):boolean {
 return cards.length===8 && cards.filter(id=>id==='STARTER_TRASH').length===5 && cards.filter(id=>id==='STARTER_CHEST').length>=2;
}
