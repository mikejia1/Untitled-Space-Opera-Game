import { ColliderType, IGlobalState } from '../store/classes';
import {
  ENTITY_RECT_WIDTH, ENTITY_RECT_HEIGHT, FPS, Colour, computeCurrentFrame, shiftForTile, shiftRect,
  positionRect, fillRect, outlineRect, computeBackgroundShift, Coord, Rect,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';

// Initial, min, and max value for plant health.
export const INITIAL_PLANT_HEALTH = 0;
export const MIN_PLANT_HEALTH = 1;
export const MAX_PLANT_HEALTH = 5;

// Min and max values for plant size.
// NOTE: This will probably change when plants become sprites, not rectangles.
export const MIN_PLANT_WIDTH = 5;
export const MAX_PLANT_WIDTH = 20;
export const MIN_PLANT_HEIGHT = 10;
export const MAX_PLANT_HEIGHT = 60;

// The amount of health imparted to a plant when it gets watered.
export const WATERING_HEALTH_INCREMENT = 1;

// A plant that needs watering to grow.
export class Plant {
  pos: Coord;
  health: number;
  width: number;
  height: number;
  spawnTimestamp: number;
  //stages of growth from 0 (just planted), 1 (seedling) - 4 (mature), 5 (harvested)
  growthStage: number;
  growthTime: number;
  dehydrationTime: number;
  alive: boolean;
  colliderId: number;
  colliderType: ColliderType = ColliderType.PlantCo;

  constructor(colliderId: number, pos: Coord, initialHealth: number, size = 4, growthTime = FPS * 30, dehydrationTime = FPS * 15, timestamp = computeCurrentFrame()) {
    this.colliderId = colliderId;
    this.pos = pos;
    this.health = initialHealth;
    this.width = 0;   // Dummy value to silence an error message.
    this.height = 0;  // Dummy value to silence an error message.
    this.spawnTimestamp = timestamp;
    this.growthTime = growthTime;
    this.dehydrationTime = dehydrationTime;
    this.growthStage = size;
    this.alive = true;
    this.updateWidthAndHeight();
  }

  /*
  // See if the plant is ready and able to grow its fruit.
  // Return boolean indicating whether or not growth occurred,
  // and, if growth occurred, also return the new plant.
  growFruits(frame: number): any {
    let noGrow = { didGrow: false };
    if (!this.alive) return noGrow;
    if (this.health < MAX_PLANT_HEALTH) return noGrow;
    let anyGrew = false;
    let newFruits: Fruit[] = [];
    if (this.fruits.length === 0) {
        newFruits = [ new Fruit(1, frame) ];
        anyGrew = true;
    } else {
        this.fruits.forEach(fruit => {
            let result = fruit.grow(frame);
            if (result.didGrow) newFruits = [ ...newFruits, result.newFruit ];
            else newFruits = [ ...newFruits, fruit ];
            anyGrew = anyGrew || result.didGrow;
        });
    };
    if (!anyGrew) return noGrow;
    return {
        didGrow: true,
        newPlant: new Plant(this.colliderId, this.pos, this.health, this.size, newFruits, this.growthTime, this.dehydrationTime, this.spawnTimestamp),
    }
  }
  */

  growPlant(): Plant {
    if (this.growthStage < 4) {
      return new Plant(this.colliderId, this.pos, this.health, this.growthStage + 1, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
    }
    return this;
  }

  dehydratePlant(): Plant {
    if (this.health > 0) {
      return new Plant(this.colliderId, this.pos, this.health - 1, this.growthStage, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
    }
    return this;
  }

  // Set plant width and height from current health.
  updateWidthAndHeight(): void {
    this.height = MIN_PLANT_HEIGHT + (this.growthStage * (MAX_PLANT_HEIGHT - MIN_PLANT_HEIGHT));
    this.width = MIN_PLANT_WIDTH + (this.growthStage * (MAX_PLANT_WIDTH - MIN_PLANT_WIDTH));
  }

  // Absorb water and return a new plant because state is supposed to be immutable.
  absorbWater(): Plant {
    if (!this.alive) {
      return this;
    }
    var h = this.health + WATERING_HEALTH_INCREMENT;
    h = Math.min(h, MAX_PLANT_HEALTH);
    return new Plant(this.colliderId, this.pos, h, this.growthStage, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
  }

  // Paint the plant on the canvas.
  paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
    // Determine where, on the canvas, the plant should be painted.
    let shift = this.computeShift(state);
    let newPos = this.pos.plus(shift.x, shift.y);

      // Paint plant.
      canvas.drawImage(
        state.plantImage,                           // Plant base image
        ((this.growthStage) * 16), this.health * 16,// Top-left corner of frame in source
        16, 16,                                     // Size of frame in source
        newPos.x-2, newPos.y - 10,                  // Position of sprite on canvas. Offsets were manually adjusted to align with collision box
        16, 16);                                    // Sprite size on canvas

    // Restore canvas transforms to normal.
      canvas.restore();


    // Extra debug displays.
    if (state.debugSettings.showCollisionRects) {
        outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
    }
    if (state.debugSettings.showPositionRects) {
        outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
    }
    if (state.debugSettings.showWateringRects) {
        outlineRect(canvas, shiftRect(this.wateringRect(), shift.x, shift.y), Colour.WATERING_RECT);
    }
  }

  // Compute a displacement that will place the Plant at the correct place on the canvas.
  computeShift(state: IGlobalState): Coord {
    return shiftForTile(this.closestTile(), state, computeBackgroundShift(state));
  }

  // Determine the grid tile that is the closest approximation to the Gardener's position.
  closestTile(): Tile {
    return new Tile(
        Math.floor(this.pos.x / MAP_TILE_SIZE),
        Math.floor(this.pos.y / MAP_TILE_SIZE));
  }

  // Return the invisible rectangle that determines collision behaviour for the plant.
  collisionRect(): Rect {
    return {
      a: this.pos.plus(0, -ENTITY_RECT_HEIGHT),
      b: this.pos.plus(ENTITY_RECT_WIDTH, 0),
    }
  }

  // Return the invisible rectangle that determines how close you need to be to water the plant.
  wateringRect(): Rect {
    let span = Math.max(ENTITY_RECT_WIDTH, ENTITY_RECT_HEIGHT) * 0.6;
    let base = this.pos.plus(ENTITY_RECT_WIDTH / 2, -ENTITY_RECT_HEIGHT / 2);
    return {
      a: base.plus(-span * 2, -span * 2),
      b: base.plus(span * 2, span * 2),
    }
  }
}