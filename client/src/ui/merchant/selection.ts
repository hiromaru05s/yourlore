/** User-selected 03, shared by normal coins and the special spell. */
export const MERCHANT_VARIANT=2;
export const merchantCount=(id:string|undefined)=>id==='MERCH1'?2:id==='MERCH2'?6:0;
export const isDarkMerchant=(id:string|undefined)=>id==='DARK_MERCHANT';
