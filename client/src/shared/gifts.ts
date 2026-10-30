export interface GiftItem {
 id:string; title:string; body:string; amount:number; createdAt:number; expiresAt:number;
 kind?:'daily-login'|null; day?:string|null;
 readAt:number|null; claimedAt:number|null;
}
export interface GiftInbox {items:GiftItem[];pendingCount:number;unreadCount?:number;pendingAmount:number;now:number;resetsAt?:number;}
export interface GiftClaim {amount:number;count:number;credits:number;}
