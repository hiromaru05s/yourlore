/** Physical dimensions retain their existing defaults. The isolated studio may
 * multiply them before mounting a scene; normal game routes never set this. */
export let CARD_THICKNESS_SCALE=1;
export let STOCK_THICKNESS=.0008/.110;
export let DRAW_THICKNESS_RATIO=.024;
export let PAPER_CARD_HALF_THICKNESS=.0075;
export function setPreviewCardThickness(scale:1|3):void {
 CARD_THICKNESS_SCALE=scale;
 STOCK_THICKNESS=.0008/.110*scale;
 DRAW_THICKNESS_RATIO=.024*scale;
 PAPER_CARD_HALF_THICKNESS=.0075*scale;
}
