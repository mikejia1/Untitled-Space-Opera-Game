import { Collider, Rect } from './';

// An invisible object that exists just to collide.
export class InvisibleCollider implements Collider {
    rect: Rect;
  
    constructor(rect: Rect) {
      this.rect = rect;
    }
  
    collisionRect(): Rect {
        return this.rect;
    }
}
