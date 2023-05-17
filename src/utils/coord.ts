// A coordinate on the environment grid.
export class Coord {
    x: number;
    y: number;
  
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
    
    magnitude(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y);
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

    toString(): string {
      return "( " + this.x.toPrecision(4) + ", " + this.y.toPrecision(4) + " )";
    }

    toIntegers(): Coord {
      return new Coord(Math.floor(this.x), Math.floor(this.y));
    }
  }
  