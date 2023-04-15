

// Width and height of the 2D canvas;
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 240;

// The number of pixels wide/tall a single spot on the grid occupies.
export const TILE_WIDTH = 16;
export const TILE_HEIGHT = 8;

// The number of pixels left/right/up/down that the gardener moves on WASD input.
export const MOVE_HORZ = 5;
export const MOVE_VERT = 1;

// An enum for the directions.
export enum Direction {
    Up,
    Down,
    Left,
    Right,
}

// Named constants for colours.
export enum Colour {
    PLANT_OUTLINE   = "#146356",
    COLLISION_RECT  = "#FF2200",
    POSITION_RECT   = "#22FF00",
    WATERING_RECT   = "#0022FF",
    FACING_RECT     = "#2288FF",
    EQUIP_RECT      = "#FF22FF",
}
