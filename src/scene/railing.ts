import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame, drawClippedImage, CANVAS_RECT, CANVAS_WIDTH, randomInt, BACKGROUND_HEIGHT, Rect } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState, ColliderType, Collider } from '../store/classes';
import { Tile } from '../scene';

// The railing just above the air lock.
export class Railing implements Paintable, Collider {
    pos: Coord;
    colliderId: number;
    colliderType: ColliderType;
  
    constructor(pos: Coord, colliderId: number) {
        this.pos = pos;
        this.colliderId = colliderId;
        this.colliderType = ColliderType.WallCo;
    }

    // Paint the railing on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the railing should be painted.
        let shift = this.computeShift(state);
        let dest = this.paintPosition(shift);

        // Paint it.
        canvas.drawImage(state.backgroundImages.airLockRailing, dest.x, dest.y);

        // Extra debug displays.
        if (state.debugSettings.showCollisionRects) {
            outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
        }
    }

    // Get the position where the railing should be painted on the canvas.
    paintPosition(shift: Coord): Coord {
        return this.pos.plus(shift.x, shift.y).minus(0, 11).toIntegers();
    }

    // Compute a displacement that will place the railing at the correct place on the canvas.
    // Using no-delta shake to keep railing aligned with ship interior background image.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the railing's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    // The thin collision rect at the base of the railing.
    collisionRect(): Rect {
        return {
            a: this.pos.plus(1, -1),   // Top-left corner
            b: this.pos.plus(51, 0),   // Bottom-right corner
        };
    }
}
