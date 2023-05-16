import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame, drawClippedImage, CANVAS_RECT } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// Number of frames in the black hole animation.
const NUM_BLACK_HOLE_FRAMES = 30;

// Black hole pulsation speed.
const PULSE_SPEED = 0.005;

// The big bad black hole.
export class BlackHole implements Paintable {
    pos: Coord;
    startFrame: number;             // The frame when the black hole first appeared.
    pulseMagnitude: number;         // Current pulse magnitude of the black hole.
    targetPulseMagnitude: number;   // The pulse magnitude the black hole is headed toward.
  
    constructor(pos: Coord, startFrame: number, pulseMagnitude: number, targetPulseMagnitude: number) {
        this.pos = pos;
        this.startFrame = startFrame;
        this.pulseMagnitude = pulseMagnitude;
        this.targetPulseMagnitude = targetPulseMagnitude;
    }

    // Paint the black hole on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the black hole should be painted.
        let shift = this.computeShift(state);
        // Shift it.
        let dest = this.pos.plus(shift.x, shift.y);
        // Drift it.
        dest = dest.plus(0, (computeCurrentFrame() - this.startFrame) * 0.5);
        dest = dest.toIntegers();
        let frame = this.computeAnimationFrame();
        let shake = state.screenShaker.shakeDeterministic(state.currentFrame);
        // Draw the pulsating heart of the black hole - i.e. the black hole.
        this.drawPulsatingHeart(canvas, dest);
        // Draw the current animation frame for the disc of material around the black hole.
        drawClippedImage(
            canvas,
            state.blackHoleImage,
            frame * 512, 0,                 // Top-left corner of frame in source
            512, 512,                       // Size of frame in source
            dest.x, dest.y,                 // Position of sprite on canvas
            512, 512,                       // Sprite size on canvas
            {
                a: CANVAS_RECT.a.plus(shake.x, shake.y),
                b: CANVAS_RECT.b.plus(shake.x, shake.y),
            });

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    drawPulsatingHeart(canvas: CanvasRenderingContext2D, dest: Coord): void {
        let alpha = 1;
        let t = Date.now();
        let radOrange = this.pulseRadius(t);
        let radWhite  = this.pulseRadius(t + 50);
        let radBlack  = this.pulseRadius(t + 100);
        // An orange ring.
        canvas.strokeStyle = `rgba(242,140,40,${alpha})`;
        canvas.lineWidth = 4;
        canvas.beginPath();
        canvas.arc(                         // Draw a circle.
            dest.x + 256, dest.y + 256,     // Centre of circle.
            radOrange,                      // Radius of the circle.
            0, 2 * Math.PI);                // Start and end angles.
        canvas.stroke();                    // The outline of the circle.
        // A white disc.
        canvas.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
        canvas.fillStyle = `rgba(255,255,255,${alpha})`;
        canvas.lineWidth = 4;
        canvas.beginPath();
        canvas.arc(                         // Draw a circle.
            dest.x + 256, dest.y + 256,     // Centre of circle.
            radWhite - 3,                   // Radius of the circle.
            0, 2 * Math.PI);                // Start and end angles.
        canvas.fill();                      // The inside of the circle.
        canvas.stroke();                    // The outline of the circle.
        // A black disc.
        canvas.strokeStyle = `rgba(20,20,20,${alpha * 0.5})`;
        canvas.fillStyle = `rgba(0,0,0,${alpha})`;
        canvas.lineWidth = 4;
        canvas.beginPath();
        canvas.arc(                         // Draw a circle.
            dest.x + 256, dest.y + 256,     // Centre of circle.
            radBlack - 6,                   // Radius of the circle.
            0, 2 * Math.PI);                // Start and end angles.
        canvas.fill();                      // The inside of the circle.
        canvas.stroke();                    // The outline of the circle.
    }

    // A pulse radius as a function of time.
    pulseRadius(t: number): number {
        let pulse = Math.sin(t * PULSE_SPEED);
        if (pulse > 0) pulse = Math.sqrt(pulse) * 2.0;
        pulse = (1.0 + pulse) * this.pulseMagnitude;
        return 55 + pulse;
    }

    // Compute the current animation frame to use for the black hole.
    computeAnimationFrame(): number {
        const rate = 5;
        return Math.floor(((computeCurrentFrame() - this.startFrame) % (NUM_BLACK_HOLE_FRAMES * rate)) / rate);
    }

    // Compute a displacement that will place the black hole at the correct place on the canvas.
    // Using deterministic shake to keep black hole aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, true));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
 