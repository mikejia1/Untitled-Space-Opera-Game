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
    // Scaling factor for expulsion through the air lock. Non-null only when being ejected through
    // the air lock regardless of original cause of death.
    ejectionScaleFactor: number | null;
}

// Compute sprite size and shift values for air lock ejection. (48 and 0, respectively, when not being ejected)
function ejectionScaleAndShift(death: Death): any {
    let scaledSize = (death.ejectionScaleFactor !== null) ? death.ejectionScaleFactor : 1;
    scaledSize = scaledSize * 48;
    let shiftToCentre = (48 - scaledSize) / 2;  // Maintains sprite centre, despite scaling.
    return { scaledSize: scaledSize, shiftToCentre: shiftToCentre };
}

// Paint a humanoid skeleton in throngs of death
export function paintSkeletonDeath(canvas: CanvasRenderingContext2D, state: IGlobalState, newPos: Coord, flip: boolean, death: Death): void {
    // The walking animation has 20 frames. Stay on the initial skeleton frame for 10 frames,
    let frameTicker = Math.max(state.currentFrame - state.gameoverFrame - 0, 0);
    let frame = Math.min(Math.floor(frameTicker / 2), 19);

    // Determine where, on the canvas, the gardener should be painted.
    let dest = flip
        ? new Coord((newPos.x * -1) - 14, newPos.y - 18)
        : new Coord(newPos.x - 3, newPos.y - 18);
    dest = dest.toIntegers();
    let xScale = flip ? -1 : 1;
    canvas.save();
    canvas.scale(xScale, 1);

    // Sprite size and shift for ejection from air lock.
    let ejection = ejectionScaleAndShift(death);
    let scaledSize = ejection.scaledSize;
    let shiftToCentre = ejection.shiftToCentre;

    // Paint gardener sprite for current frame.
    canvas.drawImage(
        state.skeleton,                                             // Walking base source image
        (frame * 96) + 40, 18,                                      // Top-left corner of frame in source
        48, 48,                                                     // Size of frame in source
        dest.x + (shiftToCentre * xScale), dest.y + shiftToCentre,  // Position of sprite on canvas
        scaledSize, scaledSize);                                    // Sprite size on canvas

    // Restore canvas transforms to normal.
    canvas.restore();
}