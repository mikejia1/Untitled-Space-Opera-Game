import { Coord } from './';

// A Rect represents a rectangle. It contains a Coord called "a" which is the
// top left corner, and a Coord called "b" which is the bottom right corner.
export interface Rect {
    a: Coord
    b: Coord
}
