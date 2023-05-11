import { Colour, positionRect, outlineRect, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, shiftRect, shiftForTile, computeBackgroundShift, Coord, Rect, GardenerDirection } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Gardener } from './gardener';
import { Tile } from '../scene';

// The watering can.
export class WateringCan implements Paintable {
    pos: Coord;
    isEquipped: boolean;
  
    constructor(pos: Coord, isEquipped: boolean) {
      this.pos = pos;
      this.isEquipped = isEquipped;
    }

    // Paint the plant on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Don't paint watering can when gardener is watering.
        // This is just a temporary hack and will certainly change soon.
        if (state.gardener.watering) return;

        // Determine where, on the canvas, the plant should be painted.
        let shift = this.computeShift(state);

        let size = 32;
        // Compute base, the bottom-middle point for the watering can.
        let base: Coord;
        if (this.isEquipped) {
            // Above head of gardener.
            base = this.pos.plus(MAP_TILE_SIZE / 2+4, 0);
        } else {
            // On the ground.
            base = this.pos.plus(MAP_TILE_SIZE / 2, 0);
        }
        base = base.plus(shift.x, shift.y).toIntegers();
        canvas.save();
        // Flip watering can image to face the same direction as the gardener.
        let flip = this.isEquipped && state.gardener.facing == GardenerDirection.Left;
        canvas.scale(flip ? -1 : 1, 1);
        canvas.drawImage(state.wateringCanImage, flip ? (- base.x - 4) : (base.x - 8) , base.y - size + 18);
        canvas.restore();

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
        if (state.debugSettings.showEquipRects && !this.isEquipped) {
            outlineRect(canvas, shiftRect(this.equipRect(), shift.x, shift.y), Colour.EQUIP_RECT);
        }
    }

    // Compute a displacement that will place the Plant at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, false));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    // Rectangle that determines how close you need to be to equip the watering can.
    equipRect(): Rect {
        let centre = this.pos.plus(ENTITY_RECT_WIDTH / 2, ENTITY_RECT_HEIGHT * -0.5);
        let span = Math.max(ENTITY_RECT_WIDTH, ENTITY_RECT_HEIGHT) * 0.6;
        return {
            a: centre.plus(-span * 2, -span * 2),
            b: centre.plus(span * 2, span * 2),
        };
    }
  
    // A new watering can that is equipped by the gardener and moving with him/her.
    moveWithGardener(gar: Gardener): WateringCan {
        return new WateringCan(
            gar.pos.plus(0, 0.1), // Fractional increase in y coord so it paints on top of gardener.
            true // The watering can *is* equipped.
        );
    }

    // A new watering can that is not equipped and is laying on the ground.
    layOnTheGround(): WateringCan {
        return new WateringCan(
            this.pos.plus(0, -0.1), // Same position, but undo the fractional y coordiate increase.
            false // The watering can is *not* equipped anymore.
        );
    }
}
 