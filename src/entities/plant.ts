import { ColliderType, IGlobalState } from '../store/classes';
import {
  ENTITY_RECT_WIDTH, ENTITY_RECT_HEIGHT, Colour, computeCurrentFrame, shiftForTile, shiftRect,
  positionRect, outlineRect, computeBackgroundShift, Coord, Rect, DEHYDRATION_TIME, GROWTH_TIME,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';

// Initial, min, and max value for plant health.
export const INITIAL_PLANT_HEALTH = 4;
export const MAX_PLANT_HEALTH = 5;

// The amount of health imparted to a plant when it gets watered.
export const WATERING_HEALTH_INCREMENT = 1;

// A plant that needs watering to grow.
export class Plant {
  pos: Coord;
  health: number;
  //stages of growth from 0 (just planted), 1 (seedling) - 4 (mature), 5 (harvested)
  growthStage: number;
  lastGrowthTimestamp: number;
  lastDehydrationTimestamp: number;
  colliderId: number;
  colliderType: ColliderType = ColliderType.PlantCo;

  constructor(colliderId: number, pos: Coord, initialHealth: number, size = 1, timestamp = computeCurrentFrame()) {
    this.colliderId = colliderId;
    this.pos = pos;
    this.health = initialHealth;
    this.lastGrowthTimestamp = timestamp;
    this.lastDehydrationTimestamp = timestamp;
    this.growthStage = size;
  }

  growPlant(state: IGlobalState): Plant {
    if (this.health > 0 && this.growthStage < 4) {
      if(state.currentFrame > this.lastGrowthTimestamp + GROWTH_TIME){
        this.growthStage++;
        this.lastGrowthTimestamp = state.currentFrame;
        this.lastDehydrationTimestamp = state.currentFrame;
      }
    }
    return this;
  }

  dehydratePlant(state: IGlobalState): Plant {
    if (this.health > 0 && this.growthStage > 0) {
      if(state.currentFrame > this.lastDehydrationTimestamp + DEHYDRATION_TIME){
        this.health--;
        this.lastDehydrationTimestamp = state.currentFrame;
      }
    }
    return this;
  }

  // Absorb water and return a new plant because state is supposed to be immutable.
  absorbWater(): Plant {
    if (this.health == 0) {
      // Return plant to seed state if it's dead.
      this.health = MAX_PLANT_HEALTH;
      this.growthStage = 0;
      this.lastGrowthTimestamp = computeCurrentFrame();
      return this;
    }
    var h = this.health + WATERING_HEALTH_INCREMENT;
    this.health = Math.min(h, MAX_PLANT_HEALTH);
    return this;
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
    return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, false));
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

export function updatePlantState(state: IGlobalState): IGlobalState{
  let newPlants: Plant[] = [];
  state.plants.forEach(plant => {
    newPlants = [...newPlants, plant.dehydratePlant(state).growPlant(state)];
  });
  return {...state, plants: newPlants};
}