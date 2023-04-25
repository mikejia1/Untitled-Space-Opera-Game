import { IGlobalState, Collider, Paintable } from '../store/classes';
import {
    Direction, Colour, shiftForTile, shiftRect, positionRect, outlineRect,
    ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, BACKGROUND_WIDTH, BACKGROUND_HEIGHT,
    computeBackgroundShift, GARDENER_V_PIXEL_SPEED, GARDENER_H_PIXEL_SPEED, GARDENER_DH_PIXEL_SPEED, GARDENER_DV_PIXEL_SPEED,
    Coord, Rect, GardenerDirection,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';

// The height of the gardener in pixels.
export const GARDENER_HEIGHT = 20;

// The gardener who tends the garden.
export class Gardener implements Paintable, Collider {
    pos: Coord;                 // Position of the gardener in the environment.
    facing: GardenerDirection;  // Direction the gardener is currently facing.
    itemEquipped: boolean;      // Whether or not the gardener has an item equipped.
    moving: boolean;            // Whether or not the gardener is moving.
    watering: boolean;          // Whether or not the gardener is watering.
    colliderId: number;         // The ID that distinguishes the collider from all others.
 
    constructor(colliderId: number, pos: Coord, facing: GardenerDirection, itemEquipped: boolean=false, moving: boolean=false, watering: boolean) {
        this.colliderId = colliderId;
        this.pos = pos;
        this.facing = facing;
        this.itemEquipped = itemEquipped;
        this.moving = moving;
        this.watering = watering;
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
      return new Gardener(this.colliderId, newPos, this.facing, this.itemEquipped, true, this.watering);
    }

    stop(): Gardener {
      return new Gardener(this.colliderId, this.pos, this.facing, this.itemEquipped, false, this.watering);
    }

    setWatering(watering: boolean): Gardener {
        return new Gardener(this.colliderId, this.pos, this.facing, this.itemEquipped, this.moving, watering);
    }

    // Change facing direction of the gardener but without changing its position.
    changeFacingDirection(direction: Direction): Gardener {
        // Up and Down won't change gardener facing direction.
        if ((direction === Direction.Up ) || (direction === Direction.Down)) {
            return new Gardener(this.colliderId, this.pos, this.facing, this.itemEquipped, this.moving, this.watering);
        }
        // Left and Right will change gardener facing direction.
        let dir = (direction === Direction.Left) ? GardenerDirection.Left : GardenerDirection.Right;
        return new Gardener(this.colliderId, this.pos, dir, this.itemEquipped, this.moving, this.watering);
    }
  
    // Set value of itemEquipped. Return new gardener.
    setItemEquipped(itemEquipped: boolean): Gardener {
      return new Gardener(this.colliderId, this.pos, this.facing, itemEquipped, this.moving, this.watering);
    }
  
    // Paint the gardener on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);        
        let flip = (this.facing === GardenerDirection.Left);

        // The particular sprite cycle to use depends on what the gardener is currently doing.
        if (this.watering) this.paintWatering(canvas, state, shift, newPos, flip);
        else this.paintWalking(canvas, state, shift, newPos, flip);

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

    // Paint the gardener standing still or walking.
    paintWalking(canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord, newPos: Coord, flip: boolean): void {
        // The walking animation has 8 frames.
        let frameCount = 8;
        let frame = this.moving ? Math.floor(state.currentFrame % (6 * frameCount) / 6) : 0;

        // Determine where, on the canvas, the gardener should be painted.
        let dest = flip
            ? new Coord((newPos.x * -1) - 14, newPos.y - 18)
            : new Coord(newPos.x - 3, newPos.y - 18);
        canvas.save();
        canvas.scale(flip ? -1 : 1, 1);
        
        // Paint gardener sprite for current frame.
        canvas.drawImage(
            state.gardenerImages.walkingBase,  // Walking base source image
            (frame * 96) + 40, 20,             // Top-left corner of frame in source
            48, 48,                            // Size of frame in source
            dest.x, dest.y,                    // Position of sprite on canvas
            48, 48);                           // Sprite size on canvas
    
        // Restore canvas transforms to normal.
        canvas.restore();
    }

    // Paint the gardener while it's watering.
    paintWatering(canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord, newPos: Coord, flip: boolean): void {
        // The watering animation only has 5 frames.
        let frameCount = 5;
        let frame = Math.floor(state.currentFrame % (3 * frameCount) / 3);

        // Determine where, on the canvas, the gardener should be painted.
        let dest = flip
            ? new Coord((newPos.x * -1) - 14, newPos.y - 18)
            : new Coord(newPos.x - 3, newPos.y - 18);
        canvas.save();
        canvas.scale(flip ? -1 : 1, 1);

        // Paint gardener sprite for current frame.
        canvas.drawImage(
            state.gardenerImages.wateringBase,  // Watering base source image
            (frame * 96) + 40, 20,              // Top-left corner of frame in source
            48, 48,                             // Size of frame in source
            dest.x, dest.y,                     // Position of sprite on canvas
            48, 48);                            // Sprite size on canvas
        canvas.drawImage(
            state.gardenerImages.waterPouring,  // Pouring water and watering can
            (frame * 96) + 40, 20,              // Top-left corner of frame in source
            48, 48,                             // Size of frame in source
            dest.x, dest.y,                     // Position of sprite on canvas
            48, 48);                            // Sprite size on canvas
    
        // Restore canvas transforms to normal.
        canvas.restore();
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
        case GardenerDirection.Left:  return shiftRect(rect, -ENTITY_RECT_WIDTH, 0);
        case GardenerDirection.Right: return shiftRect(rect, ENTITY_RECT_WIDTH, 0);
       }
    }
  }