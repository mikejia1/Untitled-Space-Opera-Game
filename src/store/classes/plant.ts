import { Coord } from './coord';
import { TILE_SIZE } from '../reducers';

// A plant that needs watering to grow.
export class Plant {
    pos: Coord;
    health: number;
  
    constructor(pos: Coord, initialHealth: number) {
      this.pos = pos;
      this.health = initialHealth;
    }
  
    // Absorb water and return a new plant because state is supposed to be immutable.
    absorbWater(): Plant {
      var h = this.health + 3;
      h = h > 20 ? 20 : h;
      return new Plant(this.pos, h);
    }
  
    // Paint the plant on the canvas.
    paint(canvas: CanvasRenderingContext2D): void {
      canvas.fillStyle = "#00FF00";   // Green
      canvas.strokeStyle = "#146356"; // Dark grey-ish maybe.
      let psize = this.health > 20 ? TILE_SIZE : (this.health / 20 * TILE_SIZE);
      canvas?.fillRect(this.pos.x + 10 - (psize / 2), this.pos.y + 10 - (psize / 2), psize, psize);
      canvas?.strokeRect(this.pos.x + 10 - (psize / 2), this.pos.y + 10 - (psize / 2), psize, psize);
    }
  }