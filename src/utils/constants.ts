//import { Coord } from './';
export const FPS = 24;

// Width and height of background image.
export const BACKGROUND_WIDTH = 384;//2000;
export const BACKGROUND_HEIGHT = 384;//600;

// Width and height of the 2D canvas.
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 240;

// The default collision/action rectangle width and height for visible colliders.
export const ENTITY_RECT_WIDTH = 10;
export const ENTITY_RECT_HEIGHT = 5;

// The number of pixels left/right/up/down that the gardener moves on WASD input.
export const MOVE_HORZ = 5;
export const MOVE_VERT = 1;

// Walking speed of gardener.
export const GARDENER_V_PIXEL_SPEED = 3;
export const GARDENER_H_PIXEL_SPEED = 3;

// Diagonal alking speed of gardener.
export const GARDENER_DV_PIXEL_SPEED = 2.12;
export const GARDENER_DH_PIXEL_SPEED = 2.12;

// Walking speed of NPCs.
export const NPC_V_PIXEL_SPEED = 1;
export const NPC_H_PIXEL_SPEED = 1;

// Running speed of cats.
export const CAT_V_PIXEL_SPEED = 2.5;
export const CAT_H_PIXEL_SPEED = 2.5;

// An enum for the directions.
export enum Direction {
    Up, Down, Left, Right,
}

// An enum for gardener facing direction.
export enum GardenerDirection {
    Left, Right,
}

export const ALL_DIRECTIONS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

// Named constants for colours.
export enum Colour {
    PLANT_OUTLINE       = "#146356",
    COLLISION_RECT      = "#FF2200",
    POSITION_RECT       = "#22FF00",
    WATERING_RECT       = "#0022FF",
    FACING_RECT         = "#2288FF",
    EQUIP_RECT          = "#FF22FF",
    INTERACTION_RECT    = "#FFFF22",
}

// Named constants for colours.
export var GROWTH_TIME = FPS * 35;
export var DEHYDRATION_TIME = FPS * 15;