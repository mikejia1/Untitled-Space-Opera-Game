import { Coord } from './';
import { TILE_WIDTH, TILE_HEIGHT } from '../reducers';

// Initial, min, and max value for plant health.
export const INITIAL_PLANT_HEALTH = 5;
export const MIN_PLANT_HEALTH = 1;
export const MAX_PLANT_HEALTH = 20;

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
  
    constructor(pos: Coord, initialHealth: number) {
      this.pos = pos;
      this.health = initialHealth;
      this.width = 0;   // Dummy value to silence an error message.
      this.height = 0;  // Dummy value to silence an error message.
      this.updateWidthAndHeight();
    }
  
    // Set plant width and height from current health.
    updateWidthAndHeight(): void {
        let growth = this.health / MAX_PLANT_HEALTH;
        this.height = MIN_PLANT_HEIGHT + (growth * (MAX_PLANT_HEIGHT - MIN_PLANT_HEIGHT));
        this.width  = MIN_PLANT_WIDTH  + (growth * (MAX_PLANT_WIDTH - MIN_PLANT_WIDTH));  
    }

    // Absorb water and return a new plant because state is supposed to be immutable.
    absorbWater(): Plant {
      var h = this.health + WATERING_HEALTH_INCREMENT;
      h = Math.min(h, MAX_PLANT_HEALTH);
      return new Plant(this.pos, h);
    }
  
    // Paint the plant on the canvas.
    paint(canvas: CanvasRenderingContext2D): void {
      canvas.fillStyle = "#00FF00";   // Green
      canvas.strokeStyle = "#146356"; // Dark grey-ish maybe.
      canvas?.fillRect(this.pos.x + (TILE_WIDTH / 2) - (this.width / 2), this.pos.y - this.height, this.width, this.height);
      canvas?.strokeRect(this.pos.x + (TILE_WIDTH / 2) - (this.width / 2), this.pos.y - this.height, this.width, this.height);
    }

    // Return the invisible rectangle that determines collision behaviour for the plant.
    collisionRect(): any {
        return {
            a: this.pos.plus(0, -TILE_HEIGHT),
            b: this.pos.plus(TILE_WIDTH, 0),
        }
    }
  }