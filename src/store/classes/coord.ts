// A coordinate on the environment grid.
export class Coord {
    x: number;
    y: number;
  
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  
    equals(other: Coord): boolean {
      return this.x === other.x && this.y === other.y;
    }
  }
  