import { IGlobalState } from '../store/classes';
import { CANVAS_RECT, BACKGROUND_WIDTH, Coord, Rect, rectanglesOverlap } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/collisions';

// An enum indicating which of the two "sectors" a grid tile would need to be painted in to be visible on the canvas.
// Left   - To the left of the boundary between two background images if the boundary is in view (on canvas).
// Right  - To the right of the boundary between two background images if the boundary is in view (on canvas).
// Anything not in view (on canvas) will default to WrapSector.Left;
export enum WrapSector {
  Left,
  Right,
};

// A tile on the background grid.
export class Tile {
    col: number;
    row: number;
  
    constructor(col: number, row: number) {
      this.col = col;
      this.row = row;
    }

    // Determine which WrapSector to put the cell in to make it visible on canvas.
    sector(state: IGlobalState, shift: Coord): WrapSector {
      // Position of tile's top-left corner, in pixels, within background image.
      let pos = new Coord(this.col * MAP_TILE_SIZE, this.row * MAP_TILE_SIZE);
      // Apply background image shift to see where that position ends up relative to canvas.
      pos = pos.plus(shift.x, shift.y);
      // A version of tile's rectangle if it were in the WrapSector.Right sector.
      let rightRect = this.rectInSector(WrapSector.Right, shift, pos, MAP_TILE_SIZE, MAP_TILE_SIZE);
      // If having it in the WrapSector.Right sector would overlap with canvs, then that's the sector we want.
      if (rectanglesOverlap(CANVAS_RECT, rightRect)) return WrapSector.Right;
      // Else default to WrapSector.Left sector.
      return WrapSector.Left;
    }

    // Given a desired sector and the current background shift, return a rect with given top-left
    // Coord, width, and height, but shifted to the given sector.
    rectInSector(sector: WrapSector, shift: Coord, pos: Coord, width: number, height: number): Rect {
      let topLeft = pos.plus((sector === WrapSector.Left) ? 0 : BACKGROUND_WIDTH, 0);
      return {
        a: topLeft,
        b: topLeft.plus(width - 1, height - 1),
      };
    }

    toString(): string {
      return "( " + this.col + ", " + this.row + " )";
    }
};
