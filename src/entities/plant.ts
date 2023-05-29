import { ColliderType, IGlobalState } from '../store/classes';
import {
  ENTITY_RECT_WIDTH, ENTITY_RECT_HEIGHT, Colour, computeCurrentFrame, shiftForTile, shiftRect,
  positionRect, outlineRect, computeBackgroundShift, Coord, Rect, DEHYDRATION_TIME, GROWTH_TIME, rectanglesOverlap,
} from '../utils';
import { FPS, SHAKE_CAP } from '../utils/constants';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';
import { Coin } from './coin';

// Initial, min, and max value for plant health.
export const INITIAL_PLANT_HEALTH = 4;
export const MAX_PLANT_HEALTH = 5;

// The amount of health imparted to a plant when it gets watered.
export const WATERING_HEALTH_INCREMENT = 1;

// The number of frames after trampling that a plant cannot be re-trampled.
export const TRAMPLE_IMMUNITY_DUR = FPS * 2;

// A plant that needs watering to grow.
export class Plant {
  pos: Coord;
  colliderId: number;
  colliderType: ColliderType = ColliderType.PlantCo;
  health: number;                                       // How healthy the plant currently is.
  // Stages of growth from 0 (just planted), 1 (seedling) - 4 (mature), 5 (harvested)
  growthStage: number;                                  // The plant's current stage of growth.
  lastGrowthTimestamp: number;                          // The last time the plant grew.
  lastDehydrationTimestamp: number;                     // The last time the plant dehydrated.
  lastTrampleTimestamp: number;                         // The last time the plant was trampled.
  lastCoinGenTimestamp: number;                         // The last time the plant generated a coin.
  coin: Coin | null;                                    // Coins the plant has generated that are not yet collected.

  constructor(
    colliderId: number,
    pos: Coord,
    initialHealth: number,
    size = 1,
    dehydTimestamp = computeCurrentFrame(),
    growthTimestamp = computeCurrentFrame(),
    colliderType = ColliderType.PlantCo,
    lastTrampleTimestamp: number = 0) {
    this.colliderId = colliderId;
    this.colliderType = colliderType;
    this.pos = pos;
    this.health = initialHealth;
    this.lastGrowthTimestamp = growthTimestamp;
    this.lastDehydrationTimestamp = dehydTimestamp;
    this.growthStage = size;
    this.lastTrampleTimestamp = lastTrampleTimestamp;
    this.lastCoinGenTimestamp = 0;
    this.coin = null;
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

  dehydratePlant(state: IGlobalState, forced: boolean = false): Plant {
    if (this.health > 0 && this.growthStage > 0) {
      if (forced || (state.currentFrame > this.lastDehydrationTimestamp + DEHYDRATION_TIME)) {
        this.health--;
        this.lastDehydrationTimestamp = state.currentFrame;
        if (forced) this.lastTrampleTimestamp = state.currentFrame;
      }
    }
    return this;
  }

  // Absorb water and return a new plant because state is supposed to be immutable.
  absorbWater(): Plant {
    if (this.health == MAX_PLANT_HEALTH){
      this.lastDehydrationTimestamp = computeCurrentFrame();
      return this;
    }
    if (this.health == 0) {
      // Return plant to seed state if it's dead.
      this.health = MAX_PLANT_HEALTH;
      this.growthStage = 0;
      this.lastGrowthTimestamp = computeCurrentFrame();
      return this;
    }
    if(this.growthStage == 4){
      this.lastCoinGenTimestamp = computeCurrentFrame();
      if(this.coin == null){
        this.coin = new Coin(this.pos.plus(0,8), this.lastCoinGenTimestamp);
      }
      else {
        this.coin.count++;
        this.coin.lastCoinGenTimestamp = this.lastCoinGenTimestamp
      }
    }
    var h = this.health + WATERING_HEALTH_INCREMENT;
    this.health = Math.min(h, MAX_PLANT_HEALTH);
    return this;
  }

  oxygenOutput(): number {
    return this.growthStage * this.growthStage * this.health * 0.01;
  }

  // Should the plant draw a coin?
  shouldDrawCoin(state: IGlobalState) : boolean { 
    return this.coin != null && (this.coin.count > 1 || this.coin.count == 1 && state.currentFrame - this.lastCoinGenTimestamp > 15);
  }
  // Paint the plant on the canvas.
  paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
    // Determine where, on the canvas, the plant should be painted.
    let shift = this.computeShift(state);
    let newPos = this.pos.plus(shift.x, shift.y);
    
    // Draw coin generation
    if(this.lastCoinGenTimestamp + 15 >= state.currentFrame ){
      let coinFrame = Math.floor((state.currentFrame - this.lastCoinGenTimestamp)/2);
      // Paint plant.
      canvas.drawImage(
        state.plantImages.coinGeneration,           // Plant base image
        coinFrame * 16, 0,                         // Top-left corner of frame in source
        16, 32,                                     // Size of frame in source
        newPos.x-2, newPos.y - 26,                  // Position of sprite on canvas. Offsets were manually adjusted to align with collision box
        16, 32);                                    // Sprite size on canvas

    }else {
      // Paint plant.
      canvas.drawImage(
        state.plantImages.base,                           // Plant base image
        ((this.growthStage) * 16), this.health * 16,// Top-left corner of frame in source
        16, 16,                                     // Size of frame in source
        newPos.x-2, newPos.y - 10,                  // Position of sprite on canvas. Offsets were manually adjusted to align with collision box
        16, 16);                                    // Sprite size on canvas
    }

    // Paint coin.
    if(this.coin != null && this.shouldDrawCoin(state)){
      this.coin.paint(canvas, state);

      /*
      let coinFrame = Math.floor((state.currentFrame - this.lastCoinGenTimestamp) / 4) % 8;
      canvas.drawImage(
        state.coinImage,                            // Plant base image
        coinFrame * 16, 0,                          // Top-left corner of frame in source
        16, 16,                                     // Size of frame in source
        newPos.x-2, newPos.y -2,                   // Position of sprite on canvas. +8px on the y axis to fall below plant
        16, 16);                                    // Sprite size on canvas
        */
    }

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
    return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, SHAKE_CAP));
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
      a: this.pos.plus(3, -ENTITY_RECT_HEIGHT),
      b: this.pos.plus(ENTITY_RECT_WIDTH+3, 0),
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

  // Check whether the collision rect of the gardener or any NPC is overlapping with the plant.
  // If the plant's current collider type is NoneCo (when air lock if open) then there's no trampling happening.
  isBeingTrampled(state: IGlobalState): boolean {
    // Passing over a plant when the air lock is open doesn't count as trampling.
    if (this.colliderType === ColliderType.NoneCo) return false;
    // Fully matured plant at full health cannot be trampled. 
    if (this.growthStage == 4 && this.health == MAX_PLANT_HEALTH) return false;
    // If the plant was *just* trampled, it cannot be immediately trampled again.
    if ((state.currentFrame - this.lastTrampleTimestamp) < TRAMPLE_IMMUNITY_DUR) return false;
    // Otherwise check collision rect overlap with gardener and with NPCs.
    let plantRect = this.collisionRect();
    if (rectanglesOverlap(state.gardener.collisionRect(), plantRect)) return true;
    for (let i = 0; i < state.npcs.length; i++) {
      let npc = state.npcs[i];
      if (npc.isOffScreen || npc.invisible) continue;
      if (rectanglesOverlap(npc.collisionRect(), plantRect)) return true;
    }
    return false;
  }
}

export function updatePlantState(state: IGlobalState): IGlobalState{
  let newPlants: Plant[] = [];
  state.plants.forEach(plant => {
    let newPlant = plant.dehydratePlant(state).growPlant(state);
    if (newPlant.isBeingTrampled(state)) newPlant = newPlant.dehydratePlant(state, true);
    newPlants = [...newPlants, newPlant];
  });
  return {...state, plants: newPlants};
}