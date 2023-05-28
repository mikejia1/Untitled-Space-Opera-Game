import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame, drawClippedImage, CANVAS_RECT, FPS, CANVAS_WIDTH, randomInt, CANVAS_HEIGHT, BACKGROUND_HEIGHT } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// A rotating planet that can drift by.
export class Planet implements Paintable {
    pos: Coord;
    startFrame: number;     // The frame when the planet first appeared.
    size: number;           // Width and height of the planet in source image.
    frames: number;         // The number of frames in the planet animation.
    scale: number;          // Scaling factor used when painting on canvas.
    spinRate: number;       // Number of animation frames between sprite frames.
    flipped: boolean;       // Whether or not the planet is flipped horizontally.
    image: any;             // The sprite sheet source image.
    blackHolePull: number;  // How far the fall into the black hole has progressed. Range 0 to 1.
  
    constructor(pos: Coord, startFrame: number, size: number, frames: number, scale: number, spinRate: number, flipped: boolean, image: any, blackHolePull: number) {
        this.pos = pos;
        this.startFrame = startFrame;
        this.size = size;
        this.frames = frames;
        this.scale = scale;
        this.spinRate = spinRate;
        this.flipped = flipped;
        this.image = image;
        this.blackHolePull = blackHolePull;
    }

    // Pick some random values for position, scale, and spin rate.
    randomizedClone() {
        let scale = randomInt(15, 100) / 100;
        scale = scale * scale; // A bias toward smaller scales.
        let spinRate = randomInt(1, 10);
        let x = randomInt(0, CANVAS_WIDTH - (this.size * scale));
        let flipped = ((randomInt(0, 99) % 2) === 0);
        return new Planet(
            new Coord(x, (-1 * this.size * scale) - 50),
            computeCurrentFrame(),
            this.size, this.frames, scale, spinRate, flipped, this.image, 0);
    }

    // Paint the planet on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the planet should be painted.
        let shift = this.computeShift(state);
        let dest = this.paintPosition(shift);

        // Drop it into the black hole.
        let tweak = this.blackHoleTweak(dest, state);
        dest = dest.plus(tweak.fall.x, tweak.fall.y);
        dest = dest.toIntegers();

        // Paint it.
        let sc = this.scale * tweak.shrink;
        let frame = this.computeAnimationFrame();
        let shake = state.screenShaker.shake(state.currentFrame, 0);
        let paintSize = this.size * sc;
        let flipScale = this.flipped ? -1 : 1;
        let flipShift = this.flipped ? (this.size * sc) : 0;
        canvas.save();
        canvas.scale(flipScale, 1);
        let clipRect = {
            a: CANVAS_RECT.a.plus(shake.x, shake.y),
            b: CANVAS_RECT.b.plus(shake.x, shake.y),
        };
        if (this.flipped) clipRect = {
            a: new Coord(-1 * clipRect.b.x, clipRect.a.y),
            b: new Coord(-1 * clipRect.a.x, clipRect.b.y),
        };
        drawClippedImage(
            canvas,
            this.image,
            frame * this.size, 0,                       // Top-left corner of frame in source
            this.size, this.size,                       // Size of frame in source
            (dest.x * flipScale) - flipShift, dest.y,   // Position of sprite on canvas
            paintSize, paintSize,                       // Sprite size on canvas
            clipRect);                                  // Paint only what's inside this rectangle
        canvas.restore();

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    // Get the position where the planet should be painted on the canvas (before black hole adjustment).
    paintPosition(shift: Coord): Coord {
        // Shift it.
        let dest = this.pos.plus(shift.x, shift.y);
        // Drift it.
        dest = dest.plus(0, this.driftDistance());
        return dest.toIntegers();
    }

    // Return a position and scale adjustment, allowing the planet to "fall" into the black hole.
    blackHoleTweak(paintPos: Coord, state: IGlobalState): any {
        if (state.blackHole !== null) {
            let bhPos = state.blackHole.paintPosition(state.blackHole.computeShift(state));
            let sz = this.size * this.scale;
            let dst = state.blackHole.driftDistance();
            let travel = Math.min(Math.max(dst - 20, 0) / 150, 1);
            let shrink = 1.0 - travel;
            shrink *= shrink;
            let finalDest = bhPos.plus(256, 256).minus(sz * 0.5 * shrink, sz * 0.5 * shrink);
            //console.log("Shrink " + shrink + " drift " + dst);
            return {
                fall: finalDest.minus(paintPos.x, paintPos.y).times(travel),
                shrink: shrink,
            };
        }
        // No black hole => a zero-effecct tweak.
        return {
            fall: new Coord(0, 0),
            shrink: 1.0,
        };
    }

    // Check to see if the planet has drifted far enough that we can stop painting it.
    isFinished(): boolean {
        return this.pos.y + this.driftDistance() > (BACKGROUND_HEIGHT * 1.5); // Times 1.5 to give time to complete fall into black hole.
    }

    // Determine how far the planet should be shifted by now.
    driftDistance(): number {
        let parallaxSpeed = Math.min(5.0 * Math.sqrt(this.scale), 2);
        return (computeCurrentFrame() - this.startFrame) * parallaxSpeed * 0.5;
    }

    // Compute the current animation sprite frame to use for the planet.
    computeAnimationFrame(): number {
        return Math.floor(((computeCurrentFrame() - this.startFrame) % (this.frames * this.spinRate)) / this.spinRate);
    }

    // Compute a displacement that will place the planet at the correct place on the canvas.
    // Using no-delta shake to keep planet aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}

// Make a new planet. Takes all constructor arguments that don't have a default.
export function makePlanet(size: number, frames: number, image: any): Planet {
    return new Planet(new Coord(0,0), 0, size, frames, 1, 1, false, image, 0);
}
