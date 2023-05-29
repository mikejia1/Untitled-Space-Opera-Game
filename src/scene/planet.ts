import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, 
    computeBackgroundShift, drawClippedImage, Coord,
    CANVAS_RECT, randomInt, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, STARFIELD_RECT, FPS } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

const SCALE_CAP = 1.5;

// A rotating planet that can drift by.
export class Planet implements Paintable {
    pos: Coord;             // To comply with paintable, though it is not used.
    startFrame: number;     // The frame when the planet first appeared.
    size: number;           // Width and height of the planet in source image.
    frames: number;         // The number of frames in the planet animation.
    scale: number;          // Scaling factor for sizing the planet.
    spinRate: number;       // Number of animation frames between sprite frames.
    flipped: boolean;       // Whether or not the planet is flipped horizontally.
    image: any;             // The sprite sheet source image.
    angle: number;          // 0 to 2*PI. Angle that planet moves away from radial centre.
  
    constructor(
        startFrame: number, size: number,
        frames: number, scale: number,
        spinRate: number, flipped: boolean, image: any, angle: number) {
        this.pos = new Coord(0,0);
        this.startFrame = startFrame;
        this.size = size;
        this.frames = frames;
        this.scale = scale;
        this.spinRate = spinRate;
        this.flipped = flipped;
        this.image = image;
        this.angle = angle;
    }

    // Pick some random values for angle, scale, spin rate, etc.
    randomizedClone(state: IGlobalState) {
        let scale: number = randomInt(1500, 3500) / 1000;   // Planet scale multiplier.
        let spinRate = randomInt(10, 30);                   // Planet rotation speed.
        let startFrame = state.currentFrame;                // Spawning time of the planet.
        let angle = Math.random() * Math.PI * 2;            // Angle of recession from vanishing point.
        let flipped = ((randomInt(0, 99) % 2) === 0);       // 50-50 chance of being flipped horizontally.
        return new Planet(
            startFrame,                         // Expected frame lifetime of planet.
            this.size, this.frames,             // Source image size and number of frames.
            scale,                              // Scale multiplier.
            spinRate, flipped, this.image,      // Rotation speed, left-right flip, image.
            angle);                             // Direction to recede from vanishing point.
    }

    // Paint the planet on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the planet should be painted.
        let shift = this.computeShift(state);
        let cntr = this.paintCentre(state, shift);

        // Drop it into the black hole.
        let tweak = this.blackHoleTweak(cntr, state);
        cntr = cntr.plus(tweak.fall.x, tweak.fall.y);
        cntr = cntr.toIntegers();

        // Scale it, shake it, flip it.
        let sz = this.currentSize(state) * tweak.shrink;
        let dest = cntr.minus(sz/2, sz/2);
        let frame = this.computeAnimationFrame(state);
        let shake = state.screenShaker.shake(state.currentFrame, 0);
        let flipScale = this.flipped ? -1 : 1;
        let flipShift = this.flipped ? sz : 0;

        // Paint it.
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
            sz, sz,                                     // Sprite size on canvas
            clipRect);                                  // Paint only what's inside this rectangle

        canvas.restore();

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    // Position of the centre of the planet in space. Does not include background shift.
    spaceCentre(state: IGlobalState): Coord {
        const RADIAL_CENTRE: Coord = new Coord(BACKGROUND_WIDTH / 2, ((STARFIELD_RECT.a.y + STARFIELD_RECT.b.y) / 2) * 1.5);
        let t = state.currentFrame - this.startFrame;
        t = t / (5 * FPS);
        t *= t;
        let d = t * 200;
        let x = Math.sin(this.angle) * d;
        let y = Math.cos(this.angle) * d;
        return RADIAL_CENTRE.plus(x,y);
    }

    // Get the position where the centre of the planet should be painted on the canvas (before black hole adjustment).
    paintCentre(state: IGlobalState, shift: Coord): Coord {
        return this.spaceCentre(state).plus(shift.x, shift.y).toIntegers();
    }

    // Return a position and scale adjustment, allowing the planet to "fall" into the black hole.
    blackHoleTweak(paintPos: Coord, state: IGlobalState): any {
        if (state.blackHole !== null) {
            let bhPos = state.blackHole.paintPosition(state.blackHole.computeShift(state));
            let sz = this.size * this.currentScale(state);
            let dst = state.blackHole.driftDistance();
            let travel = Math.min(Math.max(dst - 20, 0) / 150, 1);
            let shrink = 1.0 - travel;
            shrink *= shrink;
            let finalDest = bhPos.plus(256, 256).minus(sz * 0.5 * shrink, sz * 0.5 * shrink);
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
    isFinished(state: IGlobalState): boolean {
        if (state.blackHole !== null) return false;
        let p = this.spaceCentre(state);
        let sz = this.currentSize(state);
        if (p.x < -(sz/2)) {
            console.log("Off to the left p.x " + p.x + " sz " + sz);
            return true;
        }
        if (p.x > (BACKGROUND_WIDTH + (sz/2))) {
            console.log("Off to the right p.x " + p.x + " sz " + sz);
            return true;
        }
        if (p.y < -(sz/2)) {
            console.log("Off the top p.y " + p.y + " sz " + sz);
            return true;
        }
        if (p.y > (BACKGROUND_HEIGHT + (sz/2))) {
            console.log("Off the bottom p.y " + p.y + " sz " + sz);
            return true;
        }
        return false;
    }

    // Determine the current scale factor for the planet.
    currentScale(state: IGlobalState): number {
        let t = state.currentFrame - this.startFrame;
        t = t / (12 * FPS);
        t *= t;
        return Math.min(this.scale * t, SCALE_CAP);
    }

    // Determine the current size of the planet.
    currentSize(state: IGlobalState): number {
        return this.size * this.currentScale(state);
    }

    // Compute the current animation sprite frame to use for the planet.
    computeAnimationFrame(state: IGlobalState): number {
        return Math.floor(((state.currentFrame - this.startFrame) % (this.frames * this.spinRate)) / this.spinRate);
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
    return new Planet(0, size, frames, 1, 1, false, image, 0);
}
