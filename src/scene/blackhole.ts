import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, computeBackgroundShift, Coord, computeCurrentFrame, drawClippedImage, CANVAS_RECT, FPS } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';

// Number of frames in the black hole animation.
const NUM_BLACK_HOLE_FRAMES = 30;

// Black hole pulsation speed.
const PULSE_SPEED = 0.005;

// The black hole's base radius.
const BASE_RADIUS = 55;

// The four pulse magnitudes that the black hole transitions through.
export const PULSE_STOP    = 0;
export const PULSE_SUBTLE  = 0.2;
export const PULSE_MILD    = 0.5;
export const PULSE_MEDIUM  = 2.5;
export const PULSE_INTENSE = 70;

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
        let dest = this.paintPosition(shift);
        let frame = this.computeAnimationFrame();

        // A lambda to draw the black hole.
        let bh = (): void => {
            this.drawPulsatingHeart(canvas, dest);
        };

        // A lambda to draw the disc of material around the black hole.
        let disc = (): void => {
            let shake = state.screenShaker.shake(state.currentFrame, 0);
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
        };

        if (this.pulseMagnitude < 23) {
            // Draw black hole behind disc.
            bh();
            disc();
        } else {
            // Draw disc behind black hole (only for split second when BH is really large).
            disc();
            bh();
        }

        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    // Get the position on the canvas where the black hole should be painted.
    paintPosition(shift: Coord): Coord {
        // Shift it.
        let dest = this.pos.plus(shift.x, shift.y);
        // Drift it.
        dest = dest.plus(0, this.driftDistance());
        return dest.toIntegers();
    }

    // Compute the vertical drift distance for the black hole.
    driftDistance(): number {
        return (computeCurrentFrame() - this.startFrame) * 0.5;
    }

    drawPulsatingHeart(canvas: CanvasRenderingContext2D, dest: Coord): void {
        let alpha = 1;
        let t = Date.now() - (this.startFrame * FPS) - 310;
        let radOrange = this.pulseRadius(t);
        let radWhite  = this.pulseRadius(t + 50);
        let radBlack  = this.pulseRadius(t + 100);
        // An orange ring.
        canvas.save();
        canvas.strokeStyle = `rgba(242,140,40,${alpha})`;
        canvas.lineWidth = 4;
        canvas.beginPath();
        canvas.arc(                         // Draw a circle.
            dest.x + 256, dest.y + 256,     // Centre of circle.
            radOrange,                      // Radius of the circle.
            0, 2 * Math.PI);                // Start and end angles.
        for (let i = 0; i < 5; i++) canvas.stroke();  // The outline of the circle.
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
        for (let i = 0; i < 5; i++) canvas.stroke();  // The outline of the circle.
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
        for (let i = 0; i < 5; i++) canvas.stroke();  // The outline of the circle.
        canvas.restore();
    }

    // A pulse radius as a function of time.
    pulseRadius(t: number): number {
        let pulse = Math.sin(t * PULSE_SPEED);
        if (pulse > 0) pulse = Math.sqrt(pulse) * 2.0;
        pulse = (1.0 + pulse) * this.pulseMagnitude;
        return BASE_RADIUS + pulse;
    }

    // Have the black hole's pulse magnitude move (asymptotically) closed to its target magnitude.
    adjustPulseMagnitude(): BlackHole {
        let newMag = this.pulseMagnitude + ((this.targetPulseMagnitude - this.pulseMagnitude) * 0.1);
        return new BlackHole(this.pos, this.startFrame, newMag, this.targetPulseMagnitude);
    }

    // Make a new version of the black hole with a different target pulse magnitude.
    setTargetPulseMagnitude(targ: number): BlackHole {
        return new BlackHole(this.pos, this.startFrame, this.pulseMagnitude, targ);
    }

    // Compute the current animation frame to use for the black hole.
    computeAnimationFrame(): number {
        const rate = 5;
        return Math.floor(((computeCurrentFrame() - this.startFrame) % (NUM_BLACK_HOLE_FRAMES * rate)) / rate);
    }

    // Compute a displacement that will place the black hole at the correct place on the canvas.
    // Using no-delta shake to keep black hole aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
 