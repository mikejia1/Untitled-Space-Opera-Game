import { FPS } from "./constants";
import { Coord } from "./coord";

// A Shaker that is used to shake the screen.
export class Shaker {
  magnitude: number;  // How big can the shake deltas get?
  speed: number;      // How fast do the shake deltas change?

  constructor(magnitude: number, speed: number) {
    this.magnitude = magnitude;
    this.speed = speed;
  }

  // Return shake delta for given frame number, plus capped-magnitude additional delta.
  shake(frameNumber: number, deltaCap: number): Coord {
    let t = frameNumber * FPS;
    let shake = new Coord(
        Math.sin(t * this.speed) * this.magnitude,
        Math.cos(t * this.speed * 0.777) * this.magnitude
    );
    return shake.plus(
      Math.max(Math.min(shake.x, deltaCap), -deltaCap),
      Math.max(Math.min(shake.y, deltaCap), -deltaCap));
  }
}

export const SHAKER_NO_SHAKE = new Shaker(0, 0);
export const SHAKER_SUBTLE   = new Shaker(0.05, 0.03); // Level 1
export const SHAKER_MILD     = new Shaker(0.5, 0.06);  // Level 2
export const SHAKER_MEDIUM   = new Shaker(1.8, 0.09);  // Level 3
export const SHAKER_INTENSE  = new Shaker(5, 1);       // Level 4
