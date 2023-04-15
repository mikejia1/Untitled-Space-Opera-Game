import { Coord } from './';
import { Colour } from '../../utils';

// Maximum size that a fruit can reach.
export const MAX_FRUIT_SIZE = 8;

// Number of frames between growth increments of the fruit.
export const GROWTH_DELAY_IN_FRAMES = 96;

export class Fruit {
    size: number;
    lastGrowthTime: number;

    constructor(size: number, lastGrowthTime: number) {
        this.size = size;
        this.lastGrowthTime = lastGrowthTime;
    }

    grow(frame: number): any {
        let since = frame - this.lastGrowthTime;
        if (since < GROWTH_DELAY_IN_FRAMES) return { didGrow: false };
        if (this.size >= MAX_FRUIT_SIZE) return { didGrow: false };
        return {
            didGrow: true,
            newFruit: new Fruit(this.size + 1, this.lastGrowthTime + GROWTH_DELAY_IN_FRAMES),
        };
    }

    // Paint the fruit on the canvas at the given centre point.
    paint(canvas: CanvasRenderingContext2D, centre: Coord): void {
        canvas.fillStyle = this.currentFruitColour();
        canvas.strokeStyle = Colour.FRUIT_OUTLINE;
        canvas.beginPath();
        canvas.arc(centre.x, centre.y, this.size / 2, 0, 2 * Math.PI);
        canvas.fill();
        canvas.stroke();
    }

    // The colour the fruit currently has. Red is ripe. Before that, green.
    currentFruitColour(): Colour {
        if (this.size === MAX_FRUIT_SIZE) return Colour.RIPE_FRUIT;
        return Colour.UNRIPE_FRUIT;
    }
}
