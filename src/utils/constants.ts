//import { Coord } from './';
export const FPS = 24;

// Width and height of background image.
export const BACKGROUND_WIDTH = 384;//2000;
export const BACKGROUND_HEIGHT = 384;//600;

// Width and height of the 2D canvas.
export const CANVAS_WIDTH = BACKGROUND_WIDTH;
export const CANVAS_HEIGHT = BACKGROUND_HEIGHT;

// The default collision/action rectangle width and height for visible colliders.
export const ENTITY_RECT_WIDTH = 5;
export const ENTITY_RECT_HEIGHT = 5;

// The number of pixels left/right/up/down that the gardener moves on WASD input.
export const MOVE_HORZ = 5;
export const MOVE_VERT = 1;

// Walking speed of gardener.
export const GARDENER_V_PIXEL_SPEED = 4;
export const GARDENER_H_PIXEL_SPEED = 4;

// Diagonal alking speed of gardener.
export const GARDENER_DV_PIXEL_SPEED = 2.83;
export const GARDENER_DH_PIXEL_SPEED = 2.83;

// Walking speed of NPCs.
export const NPC_V_PIXEL_SPEED = 1;
export const NPC_H_PIXEL_SPEED = 1;

// Running speed of cats.
export const CAT_V_PIXEL_SPEED = 2.5;
export const CAT_H_PIXEL_SPEED = 2.5;

// Max speed at which all things are sucked into the airlock.
export const AIRLOCK_PIXEL_SPEED = 5;
// Scaling factor affecting how quickly air lock pull falls off with distance.
export const AIRLOCK_PULL_SCALE = 0.01;

// Visual shrink factor, per frame, for anything being ejected out of the air lock.
export const EJECTION_SHRINK_RATE = 0.95;

// An enum for the directions.
export enum Direction {
    Up, Down, Left, Right,
}

// An enum for 8-way directions.
export enum Dir8 {
    Up, UpRight, Right, DownRight, Down, DownLeft, Left, UpLeft,
}

// An enum for gardener facing direction.
export enum GardenerDirection {
    Left, Right,
}

export const ALL_DIRECTIONS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
export const ALL_DIR8S = [Dir8.Up, Dir8.UpRight, Dir8.Right, Dir8.DownRight, Dir8.Down, Dir8.DownLeft, Dir8.Left, Dir8.UpLeft];

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
export var GROWTH_TIME = FPS * 8;
export var DEHYDRATION_TIME = FPS * 16;

// Max horz & vert extra shake for non-background objects.
export const SHAKE_CAP = 2.5;

// Size of "drifters" array in global state (max simultaneous drifting planets).
export const DRIFTER_COUNT = 7;

// Maximum number of drifters at once.
export const MAX_DRIFTERS = 2;

// Speed at which the starfield drifts downwards.
export const DOWNWARD_STARFIELD_DRIFT = 0.1;

// Initial speed at which the starfield drifts downwards (i.e. when GameScreen.INTRO begins).
export const INITIAL_DOWNWARD_STARFIELD_DRIFT = 7.0;

// Number of pixels below normal position for the ship to be painted.
// This is used during the GameScreen.INTRO and the GameScreen.OUTRO.
export const SPECIAL_SHIP_SHIFT = 170;

// The amount of time (in frames) required to shift the shift from
// normal position to SPECIAL_SHIP_SHIFT position.
export const SPECIAL_SHIP_SHIFT_TIME = 100;
