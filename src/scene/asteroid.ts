import { IGlobalState, Paintable } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/positions";
import { BACKGROUND_HEIGHT, BACKGROUND_WIDTH, CANVAS_RECT, Coord, STARFIELD_RECT, computeBackgroundShift, drawClippedImage, randomInt, shiftForTile } from "../utils";
import { Tile } from "./tile";

// The number of asteroids in the swarm / field.
export const NUM_ASTEROIDS = 100;

// The distance beyond which an asteroid won't be painted.
export const CUTOFF_DISTANCE = 500;

// Size of an asteroid in source image. Same for all asteroids.
const SIZE = 256;

// Number of frames in source image sprite sheet. Same for all asteroids.
const FRAMES = 20;

// Minimum and maximum scale factors for sizing asteroids.
const MIN_SCALE = 0.3;
const MAX_SCALE = 1.5;

// Minimum and maximum spin speeds for asteroids. Note: smaller number is faster and vice versa.
const MAX_SPIN_SPEED = 1;
const MIN_SPIN_SPEED = 24;

// The amount of excluded padding space around the middle region when choosing random asteroid position.
// See comment above randomAsteroidStartPosition function.
const FUDGE = 80;

// How fast is the ship moving through the asteroids.
const SHIP_SPEED = 10;

// An asteroid. One of many in a swarm.
export class Asteroid implements Paintable {
    pos: Coord;                             // The asteroid's position with a big 3x3 region, excluding the centre square.
    distance: number;                       // The asteroid's distance from the ship - determines how much it is shrunk.
    scale: number;                          // Scaling factor for sizing the asteroid.
    spinSpeed: number;                      // Number of time frames between increments of animation frame number.
    image: any;                             // The sprite sheet source image.
    animationFrame: number;                 // The last animation frame that was painted.
    lastPaintFrame: number;                 // Frame number (time) when animationFrame was last changed.
    visible: boolean;                       // Whether or not the asteroid is visible.
  
    constructor(image: any) {
        this.pos = new Coord(0,0);
        this.distance = 0;
        this.scale = 0;
        this.spinSpeed = 1;
        this.image = image;
        this.animationFrame = 0;
        this.lastPaintFrame = 0;
        this.visible = false;
    }

    // Choose a new random starting postion beyond the cutoff distance and randomize properties.
    resetRandom(state: IGlobalState): Asteroid {
        this.pos = randomAsteroidStartPosition();
        this.distance = CUTOFF_DISTANCE + (Math.random() * CUTOFF_DISTANCE);
        this.scale = randomAsteroidScale();
        this.spinSpeed = randomAsteroidSpinSpeed();
        this.animationFrame = randomAsteroidFrame();
        this.lastPaintFrame = state.currentFrame;
        return this;
    }

    // Paint the asteroid on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Don't paint anything that's not meant to be visible.
        if (!this.visible) return;
        // Don't paint anything beyond cutoff distance.
        if (this.distance > CUTOFF_DISTANCE) return;

        // Determine where, on the canvas, the asteroid should be painted.
        let shift = this.computeShift(state);
        let shrink = shrinkFactorForDistance(this.distance);
        let cntr = this.paintCentre(shift, shrink.pos);
        let shake = state.screenShaker.shake(state.currentFrame, 0);
        let sz = SIZE * this.scale * shrink.scale;
        let dest = cntr.minus(sz / 2, sz / 2).toIntegers();

        // Paint it.
        canvas.save();
        let clipRect = {
            a: CANVAS_RECT.a.plus(shake.x, shake.y),
            b: CANVAS_RECT.b.plus(shake.x, shake.y),
        };
        drawClippedImage(
            canvas,
            this.image,
            this.animationFrame * SIZE, 0,  // Top-left corner of frame in source
            SIZE, SIZE,                     // Size of frame in source
            dest.x, dest.y,                 // Position of sprite on canvas
            sz, sz,                         // Sprite size on canvas
            clipRect);                      // Paint only what's inside this rectangle

        canvas.restore();
    }

    // Determine where the centre of this asteroid should be on the canvas, given
    // the background shift amount and shrink factor due to distance.
    paintCentre(shift: Coord, fac: number): Coord {
        // Same RADIAL_CENTRE calculation that's used in planet.ts.
        const RADIAL_CENTRE: Coord = new Coord(BACKGROUND_WIDTH / 2, ((STARFIELD_RECT.a.y + STARFIELD_RECT.b.y) / 2) * 1.5);
        return this.pos.times(fac).plus(shift.x, shift.y).plus(RADIAL_CENTRE.x, RADIAL_CENTRE.y);
    }

    // Compute a displacement that will place the asteroid at the correct place on the canvas.
    // Using no-delta shake to keep asteroid aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the asteroid's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }    
}

// Determine scaling factor that will shrink something based on how far away it is.
function shrinkFactorForDistance(dist: number): any {
    let fac1  = Math.atan2(1, dist / 100) / (Math.PI / 4);
    let fac2  = Math.atan2(1, dist / 120) / (Math.PI / 4);
    let fmin = Math.atan2(1, CUTOFF_DISTANCE / 100) / (Math.PI / 4);
    let fmax = 1;
    let scale = (fac1 - fmin) / (fmax - fmin);
    let pos = (fac2 - fmin) / (fmax - fmin);
    return {
        pos: pos,
        scale: scale,
    };
}

// Choose a random animation frame for an asteroid.
function randomAsteroidFrame(): number {
    return randomInt(0, FRAMES - 1);
}

// Choose a random spin speed for an asteroid.
function randomAsteroidSpinSpeed(): number {
    return MAX_SPIN_SPEED + (Math.random() * (MIN_SPIN_SPEED - MAX_SPIN_SPEED));
}

// Choose a random scale multiplier for an asteroid.
function randomAsteroidScale(): number {
    return MIN_SCALE + (Math.random() * (MAX_SCALE - MIN_SCALE));
}

// Choose a random positionn within a big square three times wider and three times taller than
// the background where the middle region represents the background plus some fudge space around
// it, which cannot be the chosen position (i.e. we exclude the middle region). The reason is
// that, by the time the asteroid reaches distance zero, we want it *off* screen, and that middle
// regions will, at distance 0, literally map to the game's canvas/background square.
function randomAsteroidStartPosition(): Coord {
    const right  = BACKGROUND_WIDTH * 1.5;
    const bottom = BACKGROUND_HEIGHT * 1.5;
    const left   = -right;
    const top    = -bottom;
    const width  = BACKGROUND_WIDTH * 3;
    const height = BACKGROUND_HEIGHT * 3;
    const centralWidth = BACKGROUND_WIDTH + (FUDGE * 2);
    const centralHeight = BACKGROUND_HEIGHT + (FUDGE * 2);
    const centralRight = centralWidth / 2;
    const centralBottom = centralHeight / 2;
    const centralLeft = -centralRight;
    const centralTop = -centralBottom;
    let okay = false;
    let pos: Coord = new Coord(0,0);    // Dummy value initialization.
    while (!okay) {
        let x = left + (Math.random() * width);
        let y = top  + (Math.random() * height);
        pos = new Coord(x, y);
        okay = !((x >= centralLeft) && (x <= centralRight) && (y >= centralTop) && (y <= centralBottom));
    }
    return pos;
}

// Update all the asteroids.
export function updateAsteroids(state: IGlobalState): IGlobalState {
    for (let i = 0; i < NUM_ASTEROIDS; i++) {
        let a: Asteroid = state.asteroids[i];
        if (!a.visible) continue;
        let t = state.currentFrame - a.lastPaintFrame;
        if (t >= a.spinSpeed) {
            a.animationFrame = (a.animationFrame + 1) % FRAMES;
            a.lastPaintFrame = state.currentFrame;
        }
        a.distance -= SHIP_SPEED;
        if (a.distance < 1) {
            if (state.asteroidsStillGoing) {
                a = a.resetRandom(state);
            }
            a.visible = state.asteroidsStillGoing;
        }
        state.asteroids[i] = a;
    }
    return state;
}
