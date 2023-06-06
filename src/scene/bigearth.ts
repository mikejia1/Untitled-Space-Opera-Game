import { shiftForTile, 
    computeBackgroundShift, drawClippedImage, Coord,
    CANVAS_RECT, randomInt, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, STARFIELD_RECT, FPS, DRIFTER_COUNT, CANVAS_WIDTH, clampRemap, SPECIAL_SHIP_SHIFT_TIME } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// Size of a single frame of big Earth in the sprite sheet.
const EARTH_SIZE = 512;

// Scale factor used when painting the big Earth.
const EARTH_SCALE = 1;

// Number of frames in the big Earth sprite sheet.
const EARTH_FRAMES = 32;

// A planet that looks a little like the Earth.
export class BigEarth implements Paintable {
    pos: Coord;                             // Displacement from initial hard-coded position.
    scale: number;                          // The scale factor used to size the planet when painting.
    image: any;                             // The sprite sheet source image.
    animationFrame: number;                 // The last animation frame that was painted.
    lastPaintFrame: number;                 // Frame number (time) when animationFrame was updated.
    spinSpeed: number;                      // Number of time frames between increments of animation frame number.
  
    constructor(
        pos: Coord,
        scale: number,
        animationFrame: number,
        lastPaintFrame: number,
        spinSpeed: number,
        image: any) {
        this.pos = pos;
        this.scale = scale;
        this.animationFrame = animationFrame;
        this.lastPaintFrame = lastPaintFrame;
        this.spinSpeed = spinSpeed;
        this.image = image;
    }

    // Paint the big Earth on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the planet should be painted.
        let shift = this.computeShift(state);
        let cntr = this.paintCentre(state, shift);

        // Scale it, shake it, flip it.
        let sz = this.currentSize(state);
        let dest = cntr.minus(sz/2, sz/2).toIntegers();
        let frame = this.animationFrame;
        let shake = state.screenShaker.shake(state.currentFrame, 0);

        // Paint it.
        canvas.save();
        let clipRect = {
            a: CANVAS_RECT.a.plus(shake.x, shake.y),
            b: CANVAS_RECT.b.plus(shake.x, shake.y),
        };
        drawClippedImage(
            canvas,
            this.image,
            frame * EARTH_SIZE, 0,                      // Top-left corner of frame in source
            EARTH_SIZE, EARTH_SIZE,                     // Size of frame in source
            dest.x, dest.y,                             // Position of sprite on canvas
            sz, sz,                                     // Sprite size on canvas
            clipRect);                                  // Paint only what's inside this rectangle

        canvas.restore();
    }

    // Get the position where the centre of the big Earth should be painted on the canvas.
    paintCentre(state: IGlobalState, shift: Coord): Coord {
        return this.spaceCentre(state).plus(shift.x, shift.y).toIntegers();
    }

    spaceCentre(state: IGlobalState): Coord {
        let cen = new Coord(CANVAS_WIDTH / 2, -225);
        return this.pos.plus(cen.x, cen.y);
    }

    // Determine the current scale factor for the big Earth.
    currentScale(state: IGlobalState): number {
        return EARTH_SCALE;
    }

    // Determine the current size of the big Earth.
    currentSize(state: IGlobalState): number {
        return EARTH_SIZE * this.currentScale(state);
    }

    // Update the big Earth for the current frame.
    update(state: IGlobalState): BigEarth {
        // Animation frame update
        let t = (state.currentFrame - this.lastPaintFrame);
        let animationFrame  = (t >= this.spinSpeed) ? ((this.animationFrame + 1) % EARTH_FRAMES) : this.animationFrame;
        let lastFrameUpdate = (t >= this.spinSpeed) ? state.currentFrame : this.lastPaintFrame;
        let y = clampRemap(
            state.currentFrame,
            state.introShipShiftStart, state.introShipShiftStart + SPECIAL_SHIP_SHIFT_TIME - 1,
            0, -100);
        let newPos = new Coord(0, y);

        // Updated version of big Earth.
        return new BigEarth(newPos, this.scale, animationFrame, lastFrameUpdate, this.spinSpeed, this.image);
    }

    // Compute a displacement that will place the big Earth at the correct place on the canvas.
    // Using no-delta shake to keep big Earth aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the big Earth's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
