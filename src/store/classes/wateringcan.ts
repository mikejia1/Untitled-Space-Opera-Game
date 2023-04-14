import { TILE_HEIGHT, TILE_WIDTH } from '../../utils';
import { Coord, Gardener, Paintable, IGlobalState } from './';

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
        
        //canvas.fillStyle = "#808080"; // Grey
        canvas.strokeStyle = "#146356"; // Dark grey-ish maybe.
        //canvas.fillRect(  base.x - (TILE_WIDTH * 0.4), base.y - 5, TILE_WIDTH * 0.2, 5);
        //canvas.strokeRect(base.x - (TILE_WIDTH * 0.4), base.y - 5, TILE_WIDTH * 0.2, 5);
        canvas.strokeRect(this.pos.x, this.pos.y - TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
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
 