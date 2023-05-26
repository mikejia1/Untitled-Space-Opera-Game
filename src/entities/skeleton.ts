import { IGlobalState } from '../store/classes';
import { Coord } from '../utils';

export enum CausaMortis {
    Asphyxiation, // Oxygen ran out
    Laceration,   // Cat attack
    Incineration, // Black hole or explosion
    Ejection,     // Airlock opened
}

export interface Death {
    time: number;
    cause: CausaMortis;
}

// Paint a humanoid skeleton in throngs of death
export function paintSkeletonDeath(canvas: CanvasRenderingContext2D, state: IGlobalState, newPos: Coord, flip: boolean): void {
    // The walking animation has 20 frames. Stay on the initial skeleton frame for 10 frames,
    let frameTicker = Math.max(state.currentFrame - state.gameoverFrame - 0, 0);
    let frame = Math.min(Math.floor(frameTicker / 2), 19);

    // Determine where, on the canvas, the gardener should be painted.
    let dest = flip
        ? new Coord((newPos.x * -1) - 14, newPos.y - 18)
        : new Coord(newPos.x - 3, newPos.y - 18);
    dest = dest.toIntegers();
    canvas.save();
    canvas.scale(flip ? -1 : 1, 1);
    
    // Paint gardener sprite for current frame.
    canvas.drawImage(
        state.skeleton,                    // Walking base source image
        (frame * 96) + 40, 18,             // Top-left corner of frame in source
        48, 48,                            // Size of frame in source
        dest.x, dest.y,                    // Position of sprite on canvas
        48, 48);                           // Sprite size on canvas

    // Restore canvas transforms to normal.
    canvas.restore();
}