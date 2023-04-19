import { Collider, Rect } from './';

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
}
