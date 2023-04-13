import { Coord, Rect, Collider, Paintable } from './';
import { Direction, IGlobalState } from '../reducers';
import { TILE_HEIGHT, TILE_WIDTH } from '../reducers';
import { shiftRect } from '../../utils';

// The height of the gardener in pixels.
export const GARDENER_HEIGHT = 20;
  
// The gardener who tends the garden.
export class Gardener implements Paintable, Collider {
    pos: Coord;             // Position of the gardener in the environment.
    facing: Direction;      // Direction the gardener is currently facing.
    itemEquipped: boolean;  // Whether or not the gardener has an item equipped.
    moving: boolean;        // Whether or not the gardener is moving.
    vPixelSpeed = 1;
    hPixelSpeed = 1;
  
    constructor(pos: Coord, facing: Direction, itemEquipped: boolean=false, moving: boolean=false) {
      this.pos = pos;
      this.facing = facing;
      this.itemEquipped = itemEquipped;
      this.moving = moving;
    }
    
    // Move the gardener along the direction its currently facing. Return new gardener.
    move(): Gardener {
      //move payload to gardeners
      var delta = [0,0]
      switch (this.facing) {
        case Direction.Down:
          delta = [0, this.vPixelSpeed];
          break;
        case Direction.Up:
          delta = [0, -this.vPixelSpeed];
          break;
        case Direction.Left:
          delta = [-this.hPixelSpeed, 0];
          break;
        case Direction.Right:
          delta = [this.hPixelSpeed, 0];
          break;
      }
      let newPos = new Coord(this.pos.x + delta[0], this.pos.y + delta[1]);
      return new Gardener(newPos, this.facing, this.itemEquipped, true);
    }

    stop(): Gardener {
      return new Gardener(this.pos, this.facing, this.itemEquipped, false);
    }

    // Change facing direction of the gardener but without changing its position.
    changeFacingDirection(direction: Direction): Gardener {
        return new Gardener(this.pos, direction, this.itemEquipped, this.moving /* Assume: moving = true */);
    }
  
    // Set value of itemEquipped. Return new gardener.
    setItemEquipped(itemEquipped: boolean): Gardener {
      return new Gardener(this.pos, this.facing, itemEquipped);
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
        // The -20s and 60s here stretch the sprite and place it exactly where you'd expect it to be.
        canvas.drawImage(state.gimage, frame * 48, row * 48, 48, 48, this.pos.x - 20, this.pos.y - 20 - GARDENER_HEIGHT, 60, 60);
    
        //canvas.fillStyle = "#FFA500";   // Orange
        //canvas.strokeStyle = "#146356"; // Dark grey-ish maybe.
        //canvas.fillRect(this.pos.x, this.pos.y, 20, 20);
        //canvas.strokeRect(this.pos.x, this.pos.y, 20, 20);
    }
  

    // Return the invisible rectangle that determines collision behaviour for the gardener.
    collisionRect(): Rect {
        return {
            a: this.pos.plus(0, -TILE_HEIGHT),
            b: this.pos.plus(TILE_WIDTH, 0),
        }
    }

    // Return a rectangle adjacent to the gardener in the direction it is facing.
    getFacingDetectionRect(): Rect {
        let rect = this.collisionRect();
        switch (this.facing) {
            case Direction.Up:    return shiftRect(rect, 0, -TILE_HEIGHT);
            case Direction.Down:  return shiftRect(rect, 0, TILE_HEIGHT);
            case Direction.Left:  return shiftRect(rect, -TILE_WIDTH, 0);
            case Direction.Right: return shiftRect(rect, TILE_WIDTH, 0);
        }
    }
  }