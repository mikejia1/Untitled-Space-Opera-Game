import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame } from '../utils';
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
        // Draw the current animation frame.
        canvas.drawImage(state.blackHoleImage,
            frame * 512, 0,                 // Top-left corner of frame in source
            512, 512,                       // Size of frame in source
            dest.x, dest.y,                 // Position of sprite on canvas
            512, 512);                      // Sprite size on canvas

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
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
 