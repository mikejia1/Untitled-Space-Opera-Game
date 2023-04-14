import { Coord, Rect } from './';
import { TILE_WIDTH, TILE_HEIGHT } from '../reducers';
import { FPS, computeCurrentFrame } from '../../utils';

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
  size: number;
  growthTime: number;
  dehydrationTime: number;
  alive: boolean;

  constructor(pos: Coord, initialHealth: number, size = 0, growthTime = FPS * 30, dehydrationTime = FPS * 15, timestamp = computeCurrentFrame()) {
    this.pos = pos;
    this.health = initialHealth;
    this.width = 0;   // Dummy value to silence an error message.
    this.height = 0;  // Dummy value to silence an error message.
    this.spawnTimestamp = timestamp;
    this.growthTime = growthTime;
    this.dehydrationTime = dehydrationTime;
    this.size = size;
    console.log("this.size" + this.size);
    this.alive = true;
    this.updateWidthAndHeight();
  }

  growPlant(): Plant {
    if (this.size < 1) {
      return new Plant(this.pos, this.health, this.size + 0.25, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
    }
    return this;
  }

  dehydratePlant(): Plant {
    if (this.health > 0) {
      return new Plant(this.pos, this.health - 1, this.size, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
    }
    return this;
  }

  // Set plant width and height from current health.
  updateWidthAndHeight(): void {
    this.height = MIN_PLANT_HEIGHT + (this.size * (MAX_PLANT_HEIGHT - MIN_PLANT_HEIGHT));
    this.width = MIN_PLANT_WIDTH + (this.size * (MAX_PLANT_WIDTH - MIN_PLANT_WIDTH));
  }

  // Absorb water and return a new plant because state is supposed to be immutable.
  absorbWater(): Plant {
    if (!this.alive) {
      return this;
    }
    var h = this.health + WATERING_HEALTH_INCREMENT;
    h = Math.min(h, MAX_PLANT_HEALTH);
    return new Plant(this.pos, h, this.size, this.growthTime, this.dehydrationTime, this.spawnTimestamp);
  }

  // Paint the plant on the canvas.
  paint(canvas: CanvasRenderingContext2D): void {
    //Assume MAX_PLANT_HEALTH is 5
    let color = ["#170000", "#541704", "#964d03", "#968703", "#00a313", "#00c92f"]
    canvas.fillStyle = color[this.health];   // Green
    canvas.strokeStyle = "#146356"; // Dark grey-ish maybe.
    canvas?.fillRect(this.pos.x + (TILE_WIDTH / 2) - (this.width / 2), this.pos.y - this.height, this.width, this.height);
    canvas?.strokeRect(this.pos.x + (TILE_WIDTH / 2) - (this.width / 2), this.pos.y - this.height, this.width, this.height);
  }

  // Return the invisible rectangle that determines collision behaviour for the plant.
  collisionRect(): Rect {
    return {
      a: this.pos.plus(0, -TILE_HEIGHT),
      b: this.pos.plus(TILE_WIDTH, 0),
    }
  }

  // Return the invisible rectangle that determines how close you need to be to water the plant.
  wateringRect(): Rect {
    let span = Math.max(TILE_WIDTH, TILE_HEIGHT);
    let base = this.pos.plus(TILE_WIDTH / 2, 0);
    return {
      a: base.plus(-span * 2, -span * 2),
      b: base.plus(span * 2, span * 2),
    }
  }
}