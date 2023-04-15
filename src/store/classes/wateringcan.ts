import { positionRect, outlineRect, TILE_HEIGHT, TILE_WIDTH } from '../../utils';
import { Rect, Coord, Gardener, Paintable, IGlobalState } from './';

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
        let size = 32;
        // Compute base, the bottom-middle point for the watering can.
        let base: Coord;
        if (this.isEquipped) {
            // Above head of gardener.
            base = this.pos.plus(TILE_WIDTH / 2, -8);
        } else {
            // On the ground.
            base = this.pos.plus(TILE_WIDTH / 2, 0);
        }
        canvas.drawImage(state.wateringCanImage, base.x - (size / 2) + 8, base.y - size + 18);

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, positionRect(this), "#22FF00");
        }
        if (state.debugSettings.showEquipRects && !this.isEquipped) {
            outlineRect(canvas, this.equipRect(), "#FF22FF");
        }
    }

    // Rectangle that determines how close you need to be to equip the watering can.
    equipRect(): Rect {
        let centre = this.pos.plus(TILE_WIDTH / 2, TILE_HEIGHT / 2);
        let span = Math.max(TILE_WIDTH, TILE_HEIGHT);
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
 