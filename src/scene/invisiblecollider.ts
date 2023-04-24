import { Collider } from '../store/classes';
import { Rect, rectToString } from '../utils';

// An invisible object that exists just to collide.
export class InvisibleCollider implements Collider {
    rect: Rect;
    colliderId: number;
  
    constructor(colliderId: number, rect: Rect) {
        this.colliderId = colliderId;
        this.rect = rect;
    }
  
    collisionRect(): Rect {
        return this.rect;
    }

    toString(): String {
        return rectToString(this.rect);
    }
}
