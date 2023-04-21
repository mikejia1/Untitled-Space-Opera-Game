import { Rect } from '../../utils';

// A Collider has a collisionRect method that returns a rectangle to use when
// checking for collisions.
export interface Collider {
    colliderId: number;

    collisionRect: () => Rect
}