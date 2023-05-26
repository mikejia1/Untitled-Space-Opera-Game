import { FPS } from "./constants";
import { Coord } from "./coord";

// Max horz and vert shake displacement for non-background objects.
const SHAKE_MAX = 2.5;

// A Shaker that is used to shake the screen.
export class Shaker {
  magnitude: number;  // How big can the shake deltas get?
  speed: number;      // How fast do the shake deltas change?

  constructor(magnitude: number, speed: number) {
    this.magnitude = magnitude;
    this.speed = speed;
  }

  // Return a shake delta in the form of a Coord.
  shake(): Coord {
      let t = Date.now();
      let x = Math.sin(t * this.speed) * this.magnitude;
      let y = Math.cos(t * this.speed * 0.777) * this.magnitude;
      return new Coord(
          Math.max(-SHAKE_MAX, Math.min(SHAKE_MAX, x)),
          Math.max(-SHAKE_MAX, Math.min(SHAKE_MAX, y))
      );
  }

  // Returns a shake delta that is based on a given frame number.
  shakeDeterministic(frameNumber: number): Coord {
    let t = frameNumber * FPS;
    return new Coord(
        Math.sin(t * this.speed) * this.magnitude,
        Math.cos(t * this.speed * 0.777) * this.magnitude
    );
  }
}

export const SHAKER_NO_SHAKE = new Shaker(0, 0);
export const SHAKER_SUBTLE   = new Shaker(0.005, 0.008);
export const SHAKER_MILD     = new Shaker(0.05, 0.03);
export const SHAKER_MEDIUM   = new Shaker(1.8, 0.09);
export const SHAKER_INTENSE  = new Shaker(5, 1);
