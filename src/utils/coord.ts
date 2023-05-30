// A coordinate on the environment grid.
export class Coord {
    x: number;
    y: number;
  
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
    
    magnitude(): number {
      return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    equals(other: Coord): boolean {
      return this.x === other.x && this.y === other.y;
    }

    plus(deltaX: number, deltaY: number): Coord {
      return new Coord(this.x + deltaX, this.y + deltaY);
    }

    minus(deltaX: number, deltaY: number): Coord {
      return new Coord(this.x - deltaX, this.y - deltaY);
    }

    times(factor: number): Coord {
      return new Coord(this.x * factor, this.y * factor);
    }

    mod(n: number, m: number): Coord {
      return new Coord(((this.x % n) + n) % n, ((this.y % m) + m) % m);
    }

    toString(): string {
      return "( " + this.x.toPrecision(4) + ", " + this.y.toPrecision(4) + " )";
    }

    toIntegers(): Coord {
      return new Coord(Math.floor(this.x), Math.floor(this.y));
    }
}

// Return a length 1 vector pointing in a given direction (angle in radians).
// Zero  degrees: to the right.
// Pi/2  degrees: up.
// Pi    degrees: to the left.
// 3Pi/4 degrees: down.
export function unitVector(angle: number): Coord {
  return new Coord(Math.cos(angle), Math.sin(angle));
}
