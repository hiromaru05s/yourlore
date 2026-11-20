import * as T from 'three';
import outline from './cardStockOutline.json';
/** Physical outer edge shared by deck stacks and moving cards. Face and back
 * artwork use the full canvas UVs; neither is cropped to a rounded rectangle. */
export function cardStockShape(ratio:number):T.Shape {
 const points=outline.map(([x,y])=>new T.Vector2(x-.5,(.5-y)*ratio));
 return new T.Shape(points);
}
