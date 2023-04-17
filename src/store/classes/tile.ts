import { IGlobalState, Coord } from './';
import { CANVAS_WIDTH, TILE_HEIGHT, TILE_WIDTH, computeBackgroundShift } from '../../utils';

// A tile on the background grid.
export class Tile {
    col: number;
    row: number;
  
    constructor(col: number, row: number) {
      this.col = col;
      this.row = row;
    }

    // Determine which WrapSector to put the cell in to make it visible non canvas.
    sector(state: IGlobalState): WrapSector {
      let shift = computeBackgroundShift(state);
      let pos = new Coord(this.col * TILE_WIDTH, this.row * TILE_HEIGHT).plus(shift.x, shift.y);
      if ((pos.x + TILE_WIDTH) <= 0) return WrapSector.Right;
      if (pos.x >= CANVAS_WIDTH) return WrapSector.Left;
      return WrapSector.Middle;
    }
};

// An enum indicating which of the three "sectors" a grid tile
// would need to be painted in to be visible on the canvas.
// Left   - A copy of the world just to the left of the "real" middle one.
//          Shows far-right columns just to the left of column zero, if those
//          columns should be visible there to make the world wrap around.
// Middle - The "real" version of the world. Used most often to make tiles visible.
// Right  - A copy of the world just to the right of the "real" middle one.
//          Shows far-left columns just to the right of the final column, if
//          those columns should be visible there to make the world warp around.
export enum WrapSector {
    Left,
    Middle,
    Right,
};
