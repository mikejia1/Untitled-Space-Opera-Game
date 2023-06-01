import { Tile } from "../scene";
import { IGlobalState, Paintable } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/positions";
import { Colour, Coord, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, Rect, SHAKE_CAP, computeBackgroundShift, outlineRect, shiftForTile, shiftRect } from "../utils";

export class Coin implements Paintable {
    [x: string]: any;
    pos: Coord;
    // Original position used to calculate collection arc.
    ghostPos: Coord;
    count : number;
    lastCoinGenTimestamp : number;
    lastCoinCollected : number = -1;
    
    constructor(pos : Coord, lastCoinGenTimestamp : number) {
        this.pos = pos;
        this.ghostPos = pos;
        this.count = 1;
        this.lastCoinGenTimestamp = lastCoinGenTimestamp
    }

    updateCoinState(state : IGlobalState) : Coin {
      let framesElapsed = state.currentFrame - this.lastCoinCollected
      let dX = this.pos.x - framesElapsed;
      if( this.collecTionComplete(state)) return this;
      let aX = 3;
      let aY = 24;
      let dY = (this.ghostPos.y  - aY) * (Math.sqrt(1 - (dX - this.ghostPos.x) * (dX - this.ghostPos.x) / ((this.ghostPos.x - aX) * (this.ghostPos.x - aX))))+aY;
      this.pos = new Coord(dX, Math.floor(dY));
      return this;
    }

    collecTionComplete(state: IGlobalState): boolean {
      let framesElapsed = state.currentFrame - this.lastCoinCollected
      let dX = this.pos.x - framesElapsed;
      return dX < 3;
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