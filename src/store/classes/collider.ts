import { Rect } from './';

// A Collider has a collisionRect method that returns a rectangle to use when
// checking for collisions.
export interface Collider {
    colliderId: number;
    
    collisionRect: () => Rect
}