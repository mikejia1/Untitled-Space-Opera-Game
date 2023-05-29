import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, 
    computeBackgroundShift, Coord, drawClippedImage, 
    CANVAS_RECT, CANVAS_WIDTH, randomInt, BACKGROUND_HEIGHT } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// Min and max scale values for planets in the three distance ranges.
const SCALE_MIN: number[] = [0.02, 0.1,  0.5];
const SCALE_MAX: number[] = [0.4,  1.0,  2.4];

// Lifetime, in frames, of planets, depending on their distance range.
const LIFETIME: number[] = [2000, 1500, 1000];

// How much bigger is a planet when it disappears compared to when it first appears.
const EXPAND_FACTOR: number = 10;

// Identifiers for the three distance ranges of drifting planets.
export enum PlanetRange {
    Background, Midground, Foreground,
}

export function indexToPlanetRange(i: number): PlanetRange {
    if (i === 0) return PlanetRange.Background;
    else if (i === 1) return PlanetRange.Midground;
    else return PlanetRange.Foreground;
}

export function planetRangeToIndex(r: PlanetRange): number {
    if (r === PlanetRange.Background) return 0;
    else if (r === PlanetRange.Midground) return 1;
    else return 2;
}

// A rotating planet that can drift by.
export class Planet implements Paintable {
    pos: Coord;
    range: PlanetRange;     // Whether this is a background, midground, or foreground planet.
    startFrame: number;     // The frame when the planet first appeared.
    endFrame: number;       // The frame when the planet will disappear (ignoring black hole effects).
    size: number;           // Width and height of the planet in source image.
    frames: number;         // The number of frames in the planet animation.
    scaleStart: number;     // Scaling factor used when planet is spawned.
    scaleEnd: number;       // Scaling factor used but the time planet is done.
    startY: number;         // The vertical (y) position of the planet when it first appears.
    endY: number;           // The vertical (y) position of the planet when it will disappear (ignoring black hole effects).
    spinRate: number;       // Number of animation frames between sprite frames.
    flipped: boolean;       // Whether or not the planet is flipped horizontally.
    image: any;             // The sprite sheet source image.
    blackHolePull: number;  // How far the fall into the black hole has progressed. Range 0 to 1.
  
    constructor(
        pos: Coord, range: PlanetRange, startFrame: number, endFrame: number, size: number,
        frames: number, scaleStart: number, scaleEnd: number, startY: number, endY: number,
        spinRate: number, flipped: boolean, image: any, blackHolePull: number) {
        this.pos = pos;
        this.range = range;
        this.startFrame = startFrame;
        this.endFrame = endFrame;
        this.size = size;
        this.frames = frames;
        this.scaleStart = scaleStart;
        this.scaleEnd = scaleEnd;
        this.startY = startY;
        this.endY = endY;
        this.spinRate = spinRate;
        this.flipped = flipped;
        this.image = image;
        this.blackHolePull = blackHolePull;
    }

    // Pick some random values for position, scale, and spin rate.
    randomizedClone(state: IGlobalState, range: PlanetRange) {
        let f = state.currentFrame;
        let i = planetRangeToIndex(range);

        // Pick a scale in range but biased toward smaller scales.
        let scaleEnd: number = 2;
        for (let j = 0; j < 2; j++) {
            let alternative = randomInt(SCALE_MIN[i] * 1000, SCALE_MAX[i] * 1000) / 1000;
            scaleEnd = Math.min(scaleEnd, alternative);
        }
        let scaleStart = scaleEnd / EXPAND_FACTOR;

        // How fast does the planet spin.
        let spinRate = randomInt(10, 30);

        // Horizontal starting position of the planet.
        let x = randomInt(0, CANVAS_WIDTH - (this.size * scaleStart));

        // Vertical start and end positions (y coordinates) for the planet.
        let startY = 0 - (scaleStart * this.size * 1.2);
        let endY   = BACKGROUND_HEIGHT + (scaleEnd * this.size * 1.2);

        // Start and end frames for the planet (ignoring black hole effects).
        let startFrame = f;
        let endFrame = f + LIFETIME[i];

        let flipped = ((randomInt(0, 99) % 2) === 0);
        return new Planet(
            new Coord(x, startY),                   // Planet starting position.
            range,                                  // Distance range (background, midground, foreground).
            startFrame, endFrame,                   // Expected frame lifetime of planet.
            this.size, this.frames,                 // Source image size and number of frames.
            scaleStart, scaleEnd,                   // Scale of planet at start and end of lifetime.
            startY, endY,                           // Start and end y coordinates over planet's lifetime.
            spinRate, flipped, this.image, 0);      // Rotation speed, left-right flip, image, and black hole pull.
    }

    // Paint the planet on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the planet should be painted.
        let shift = this.computeShift(state);
        let dest = this.paintPosition(state, shift);

        // Drop it into the black hole.
        let tweak = this.blackHoleTweak(dest, state);
        dest = dest.plus(tweak.fall.x, tweak.fall.y);
        dest = dest.toIntegers();

        // Paint it.
        let sc = this.currentScale(state) * tweak.shrink;
        let frame = this.computeAnimationFrame(state);
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
    paintPosition(state: IGlobalState, shift: Coord): Coord {
        // Drift it and shift it.
        return new Coord(this.pos.x, this.verticalPosition(state)).plus(shift.x, shift.y).toIntegers();
    }

    // Return a position and scale adjustment, allowing the planet to "fall" into the black hole.
    blackHoleTweak(paintPos: Coord, state: IGlobalState): any {
        if (state.blackHole !== null) {
            let bhPos = state.blackHole.paintPosition(state.blackHole.computeShift(state));
            let sz = this.size * this.currentScale(state);
            let dst = state.blackHole.driftDistance();
            let travel = Math.min(Math.max(dst - 20, 0) / 150, 1);
            console.log("travel " + travel);
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

    // The lifestage of the planet, where 0 means it just spawned and 1 means it's ready to disappear.
    lifeStage(state: IGlobalState): number {
        return ((state.currentFrame - this.startFrame) / (this.endFrame - this.startFrame));
    }

    // Check to see if the planet has drifted far enough that we can stop painting it.
    isFinished(state: IGlobalState): boolean {
        return (this.lifeStage(state) >= 1) && (state.blackHole === null);
    }

    // Determine what the planet's vertical postion should be right now (ignoring black hole effects).
    verticalPosition(state: IGlobalState): number {
        return this.startY + ((this.endY - this.startY) * this.lifeStage(state));
    }

    // Determine the current scale factor for the planet.
    currentScale(state: IGlobalState): number {
        return this.scaleStart + ((this.scaleEnd - this.scaleStart) * this.lifeStage(state));
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
    return new Planet(new Coord(0,0), PlanetRange.Background, 0, 0, size, frames, 1, 1, 0, 0, 1, false, image, 0);
}
