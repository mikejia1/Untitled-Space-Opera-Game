import { IGlobalState, Collider, Paintable } from '../store/classes';
import {
    Direction, Colour, shiftForTile, shiftRect, positionRect, outlineRect,
    ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, BACKGROUND_WIDTH, BACKGROUND_HEIGHT,
    computeBackgroundShift, GARDENER_V_PIXEL_SPEED, GARDENER_H_PIXEL_SPEED, GARDENER_DH_PIXEL_SPEED, GARDENER_DV_PIXEL_SPEED,
    Coord, Rect,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/collisions';
import { Tile } from '../scene';

// The height of the gardener in pixels.
export const GARDENER_HEIGHT = 20;
  
// The gardener who tends the garden.
export class Gardener implements Paintable, Collider {
    pos: Coord;             // Position of the gardener in the environment.
    facing: Direction;      // Direction the gardener is currently facing.
    itemEquipped: boolean;  // Whether or not the gardener has an item equipped.
    moving: boolean;        // Whether or not the gardener is moving.
    colliderId: number;     // The ID that distinguishes the collider from all others.
  
    constructor(colliderId: number, pos: Coord, facing: Direction, itemEquipped: boolean=false, moving: boolean=false) {
        this.colliderId = colliderId;
        this.pos = pos;
        this.facing = facing;
        this.itemEquipped = itemEquipped;
        this.moving = moving;
    }
    
    opposingDirection(direction1: Direction, direction2: Direction){
        switch(direction1) {
            case Direction.Left:  return direction2 === Direction.Right;
            case Direction.Right: return direction2 === Direction.Left;
            case Direction.Up:    return direction2 === Direction.Down;
            case Direction.Down:  return direction2 === Direction.Up;
        }
    }

    // Move the gardener along the direction its currently facing. Return new gardener.
    move(directions: Direction[]): Gardener {
      var delta = [0,0]
      // Diagonal gardener movement.
      if(directions.length > 1 && !this.opposingDirection(directions[0], directions[1])){
        const diagonalDirection = directions.slice(0,2);
        if(diagonalDirection.includes(Direction.Up) && diagonalDirection.includes(Direction.Left)){
            delta = [-GARDENER_DH_PIXEL_SPEED, -GARDENER_DV_PIXEL_SPEED];
        }
        else if(diagonalDirection.includes(Direction.Up) && diagonalDirection.includes(Direction.Right)){
            delta = [GARDENER_DH_PIXEL_SPEED, -GARDENER_DV_PIXEL_SPEED];
        }
        else if(diagonalDirection.includes(Direction.Down) && diagonalDirection.includes(Direction.Left)){
            delta = [-GARDENER_DH_PIXEL_SPEED, GARDENER_DV_PIXEL_SPEED];
        }
        else if(diagonalDirection.includes(Direction.Down) && diagonalDirection.includes(Direction.Right)){
            delta = [GARDENER_DH_PIXEL_SPEED, GARDENER_DV_PIXEL_SPEED];
        }
      }
      else {
        switch (directions[0]) {
            case Direction.Down:
              delta = [0, GARDENER_V_PIXEL_SPEED];
              break;
            case Direction.Up:
              delta = [0, -GARDENER_V_PIXEL_SPEED];
              break;
            case Direction.Left:
              delta = [-GARDENER_H_PIXEL_SPEED, 0];
              break;
            case Direction.Right:
              delta = [GARDENER_H_PIXEL_SPEED, 0];
              break;
          }
      }
      // Add deltas to gardener position and keep it within the background rectangle.
      let newPos = new Coord(
        (this.pos.x + delta[0] + BACKGROUND_WIDTH) % BACKGROUND_WIDTH,
        (this.pos.y + delta[1] + BACKGROUND_HEIGHT) % BACKGROUND_HEIGHT);
      return new Gardener(this.colliderId, newPos, this.facing, this.itemEquipped, true);
    }

    stop(): Gardener {
      return new Gardener(this.colliderId, this.pos, this.facing, this.itemEquipped, false);
    }

    // Change facing direction of the gardener but without changing its position.
    changeFacingDirection(direction: Direction): Gardener {
        return new Gardener(this.colliderId, this.pos, direction, this.itemEquipped, this.moving /* Assume: moving = true */);
    }
  
    // Set value of itemEquipped. Return new gardener.
    setItemEquipped(itemEquipped: boolean): Gardener {
      return new Gardener(this.colliderId, this.pos, this.facing, itemEquipped);
    }
  
    // Paint the gardener on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // If the gardener is moving, animate the sprite. 
        let frame = this.moving ? Math.floor(state.currentFrame % 24 / 6) : 0;
        let row = 0;
        switch (this.facing) {
            case Direction.Down:
                row = 0; break;
            case Direction.Up:
                row = 1; break;
            case Direction.Left:
                row = 2; break;
            case Direction.Right:
                row = 3; break;
        }

        // Determine where, on the canvas, the gardener should be painted.
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);

        // Paint gardener with small adjustment to place it exactly where you'd expect it to be.
        canvas.drawImage(
            state.gimage,          // Sprite source image
            frame * 48, row * 48,  // Top-left corner of frame in source
            48, 48,                // Size of frame in source
            newPos.x - 7,          // X position of top-left corner on canvas
            newPos.y - 20,         // Y position of top-left corner on canvas
            30, 30);               // Sprite size on canvas
    
        // Extra debug displays.
        if (state.debugSettings.showCollisionRects) {
            outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
        }
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
        if (state.debugSettings.showFacingRects) {
            outlineRect(canvas, shiftRect(this.facingDetectionRect(), shift.x, shift.y), Colour.FACING_RECT);
        }
    }

    // Compute a displacement that will place the Gardener at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state));
    }

    // Determine the grid tile that is the closest approximation to the Gardener's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    // Return the invisible rectangle that determines collision behaviour for the gardener.
    collisionRect(): Rect {
        return {
            a: this.pos.plus(0, -ENTITY_RECT_HEIGHT),
            b: this.pos.plus(ENTITY_RECT_WIDTH, 0),
        }
    }

    // Return a rectangle adjacent to the gardener in the direction it is facing.
    facingDetectionRect(): Rect {
        let rect = this.collisionRect();
        switch (this.facing) {
            case Direction.Up:    return shiftRect(rect, 0, -ENTITY_RECT_HEIGHT);
            case Direction.Down:  return shiftRect(rect, 0, ENTITY_RECT_HEIGHT);
            case Direction.Left:  return shiftRect(rect, -ENTITY_RECT_WIDTH, 0);
            case Direction.Right: return shiftRect(rect, ENTITY_RECT_WIDTH, 0);
        }
    }
  }