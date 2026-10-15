export interface GiftItem {
 id:string; title:string; body:string; amount:number; createdAt:number; expiresAt:number;
 readAt:number|null; claimedAt:number|null;
}
export interface GiftInbox {items:GiftItem[];pendingCount:number;pendingAmount:number;now:number;}
export interface GiftClaim {amount:number;count:number;credits:number;}
