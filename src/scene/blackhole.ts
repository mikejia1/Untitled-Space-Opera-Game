import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame, drawClippedImage, CANVAS_RECT } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// Number of frames in the black hole animation.
const NUM_BLACK_HOLE_FRAMES = 30;

// The big bad black hole.
export class BlackHole implements Paintable {
    pos: Coord;
    startFrame: number;     // The frame when the black hole first appeared.
  
    constructor(pos: Coord, startFrame: number) {
      this.pos = pos;
      this.startFrame = startFrame;
    }

    // Paint the black hole on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the black hole should be painted.
        let shift = this.computeShift(state);
        // Shift it.
        let dest = this.pos.plus(shift.x, shift.y);
        // Drift it.
        dest = dest.plus(0, (computeCurrentFrame() - this.startFrame) * 0.5);
        dest = dest.toIntegers();
        let frame = this.computeAnimationFrame();
        let shake = state.screenShaker.shakeDeterministic(state.currentFrame);
        // Draw the current animation frame.
        drawClippedImage(
            canvas,
            state.blackHoleImage,
            frame * 512, 0,                 // Top-left corner of frame in source
            512, 512,                       // Size of frame in source
            dest.x, dest.y,                 // Position of sprite on canvas
            512, 512,                       // Sprite size on canvas
            {
                a: CANVAS_RECT.a.plus(shake.x, shake.y),
                b: CANVAS_RECT.b.plus(shake.x, shake.y),
            });

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    // Compute the current animation frame to use for the black hole.
    computeAnimationFrame(): number {
        const rate = 5;
        return Math.floor(((computeCurrentFrame() - this.startFrame) % (NUM_BLACK_HOLE_FRAMES * rate)) / rate);
    }

    // Compute a displacement that will place the black hole at the correct place on the canvas.
    // Using deterministic shake to keep black hole aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, true));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
 