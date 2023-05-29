import { Tile } from "../scene";
import { IGlobalState, Paintable } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/positions";
import { Colour, Coord, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, Rect, SHAKE_CAP, computeBackgroundShift, outlineRect, shiftForTile, shiftRect } from "../utils";

export class Coin implements Paintable {
    [x: string]: any;
    pos: Coord;
    count : number;
    lastCoinGenTimestamp : number;
    
    constructor(pos : Coord, lastCoinGenTimestamp : number) {
        this.pos = pos;
        this.count = 1;
        this.lastCoinGenTimestamp = lastCoinGenTimestamp
    }

    // Compute a displacement that will place the Plant at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, SHAKE_CAP));
    }

    paint (canvas: CanvasRenderingContext2D, state: IGlobalState) {
        let shift = this.computeShift(state);
        this.paintAtPos(canvas, state, this.pos.plus(shift.x, shift.y));
    }

    paintAtPos(canvas: CanvasRenderingContext2D, state: IGlobalState, pos: Coord) {
        let coinFrame = Math.floor((state.currentFrame - this.lastCoinGenTimestamp) / 4) % 8;
      canvas.drawImage(
        state.coinImage,                            // Plant base image
        coinFrame * 16, 0,                          // Top-left corner of frame in source
        16, 16,                                     // Size of frame in source
        pos.x-2, pos.y - 10,                        // Position of sprite on canvas. 
        16, 16);                                    // Sprite size on canvas
    }

    collisionRect(): Rect {
        return {
          a: this.pos.plus(3, -ENTITY_RECT_HEIGHT),
          b: this.pos.plus(ENTITY_RECT_WIDTH+3, 0),
        }
    }

    // Determine the grid tile that is the closest approximation to the Gardener's position.
  closestTile(): Tile {
    return new Tile(
        Math.floor(this.pos.x / MAP_TILE_SIZE),
        Math.floor(this.pos.y / MAP_TILE_SIZE));
  }

}