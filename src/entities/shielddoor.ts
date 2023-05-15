import { Tile } from "../scene";
import { IGlobalState } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { Coord, Rect, STARFIELD_RECT, computeBackgroundShift, computeCurrentFrame, drawClippedImage, shiftForTile } from "../utils";

// Amount of lag, in animation frames, between adjacent slats in the blast shield.
export const INTER_SLAT_DELAY = 10;

// Amount of time, in animation frames, required to close one of the 12 shield slats.
const SLAT_CLOSING_DUR = 15;

// Amount of time, in animation frames, during which time a shield slat remains closed.
const SLAT_CLOSED_DUR = 300;

// Amount of time, in animation frames, required to open one of the 12 shield slats.
const SLAT_OPENING_DUR = 40;

// The number of vertical pixels between a fully opened and a fully closed (top or bottom) half-slat.
const SLAT_CLOSE_DISTANCE = 96;

// Some important dimensions of the various shield door slat images.
const SLAT_WIDTH = 32;
const SLAT_TOP_HEIGHT = 96;

// Number of pixels to shift slat top images upward to get perfect alignment with closed door image.
const SLAT_TOP_ADJUST = 5;
// Number of pixels to shift slat bottom images downward to get perfect alignment with closed door image.
const SLAT_BOTTOM_ADJUST = -27;

// Number of pixels to shift all door images upward. Used to have close close in *middle* of starfield.
const SHIELD_DOOR_ADJUST = 10;

// For use in debugging.
const SHOW_PERCENTAGES = false;

enum ShieldDoorState {OPENING, CLOSING, OPEN, CLOSED}

export function initialShieldDoor(): ShieldDoor {
    return new ShieldDoor(
        [ShieldDoorState.OPEN, ShieldDoorState.OPEN, ShieldDoorState.OPEN], // Doors start in OPEN state.
        [0, 0, 0],  // Dummy values for door activation times.
        [false, false, false]  // Flags that prompt doors to open early (false == not currently prompted).
    );
}

export class ShieldDoor implements Paintable {
    // Unused coords
    pos: Coord;
    // There are 3 shield doors
    shieldDoorStates: ShieldDoorState[];
    // The timestamp of that last activation of each door.
    // This may be the activation time when the door began closing, but if openingEarly is true, it's
    // the time when early opening began.
    shieldDoorActivationTimes: number[];
    // Whether or not the doors are being opened early.
    openingEarly: boolean[];
    
    constructor(states: ShieldDoorState[], activationTimes: number[], openingEarly: boolean[]) {
        this.pos = new Coord(0,0);
        // The state of each door.
        this.shieldDoorStates = states;
        // Most recent door activation times.
        this.shieldDoorActivationTimes = activationTimes;
        // Whether or not the doors are being opened early.
        this.openingEarly = openingEarly;
    }

    // Paint the blast shield.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        let f = computeCurrentFrame();
        let shift = this.computeShift(state);
        let clipRect = {
            a: STARFIELD_RECT.a.plus(shift.x, shift.y),
            b: STARFIELD_RECT.b.plus(shift.x, shift.y),
        };
        for (let i = 0; i < 3; i++) {
            this.paintShieldDoor(i, canvas, state, f, shift, clipRect);
        }
    }

    // Paint one of the three blast shield doors.
    paintShieldDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        switch (this.shieldDoorStates[i]) {
            case ShieldDoorState.OPEN:      return; // Nothing to paint if door is fully open.
            case ShieldDoorState.OPENING:   return this.paintOpeningDoor(i, canvas, state, currentFrame, shift, clipRect);
            case ShieldDoorState.CLOSING:   return this.paintClosingDoor(i, canvas, state, currentFrame, shift, clipRect);
            case ShieldDoorState.CLOSED:    return this.paintClosedDoor(i, canvas, state, currentFrame, shift, clipRect);
        }
    }

    // Paint one of the three blast shield doors while it is opening.
    paintOpeningDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let debug = "Opening: ";
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            if (this.openingEarly[i]) {
                st = Math.max(st, 0);
            } else {
                st = Math.max(st - (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6)), 0);
            }
            let percent = Math.min(st / SLAT_OPENING_DUR, 1);
            let prcnt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(percent * 100);
            debug = debug + " " + prcnt;
            let gap = percent * SLAT_CLOSE_DISTANCE;
            // If a slat is (basically) closed, paint the full closed slat image instead of the 2 parts.
            if (gap < 2) {
                this.paintClosedSlat(i, j, canvas, state, shift, clipRect);
            } else {            
                let x = this.slatX(i, j);

                // Top of slat.
                let y = SLAT_CLOSE_DISTANCE - SLAT_TOP_HEIGHT - gap - SLAT_TOP_ADJUST - SHIELD_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.top, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);

                // Bottom of slat.
                y = SLAT_CLOSE_DISTANCE + gap + SLAT_BOTTOM_ADJUST - SHIELD_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.bottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
            }
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    // Paint one of the three blast shield doors while it is closing.
    paintClosingDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let debug = "Closing: ";
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            st = Math.max(st, 0);
            let percent = Math.min(st / SLAT_CLOSING_DUR, 1);
            let prcnt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(percent * 100);
            debug = debug + " " + prcnt;
            let dist = percent * SLAT_CLOSE_DISTANCE;
            // If a slat is (basically) closed, paint the full closed slat image instead of the 2 parts.
            if (percent > 0.98) {
                this.paintClosedSlat(i, j, canvas, state, shift, clipRect);
            } else {
                let x = this.slatX(i, j);

                // Top of slat.
                let y = dist - SLAT_TOP_HEIGHT - SLAT_TOP_ADJUST - SHIELD_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.top, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);

                // Bottom of slat.
                y = SLAT_CLOSE_DISTANCE + (SLAT_CLOSE_DISTANCE - dist) + SLAT_BOTTOM_ADJUST - SHIELD_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.bottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
            }
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    // Paint one of the three blast shield doors in its fully closed state.
    paintClosedDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let debug = "Closed: ";
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            st = Math.max(st - (SLAT_CLOSING_DUR + (INTER_SLAT_DELAY * 3)), 0);
            let percent = Math.min(st / SLAT_CLOSED_DUR, 1);
            let prcnt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(percent * 100);
            debug = debug + " " + prcnt;
            this.paintClosedSlat(i, j, canvas, state, shift, clipRect);
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    paintClosedSlat(door: number, slat: number, canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord, clipRect: Rect): void {
        let y = 0 - SHIELD_DOOR_ADJUST;
        let x = this.slatX(door, slat);
        let slatPos = new Coord(x + shift.x, y + shift.y);
        slatPos = slatPos.toIntegers();
        drawClippedImage(canvas, state.shieldImages.closed, 0,0, 32, 160, slatPos.x, slatPos.y, 32, 160, clipRect);
    }

    // Compute the current animation frame number for a specific slat of a specific door.
    slatTime(door: number, slat: number, currentFrame: number): number {
        return Math.max(currentFrame - this.shieldDoorActivationTimes[door] - (slat * INTER_SLAT_DELAY), 0);
    }

    // The x position for a given slat in a given door.
    slatX(door: number, slat: number): number {
        return SLAT_WIDTH * ((door * 4) + slat);
    }

    // Check whether all doors are now in fully closed state.
    allDoorsClosed(): boolean {
        return this.shieldDoorStates.every((state) => state == ShieldDoorState.CLOSED);
    }

    // Compute a displacement that will place the blast shield at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(new Tile(0,0), state, computeBackgroundShift(state, true));
    }

    // Trigger a specific door to being its CLOSING -> CLOSED -> OPENING -> OPEN animation sequence.
    triggerDoor(door: number): ShieldDoor {
        // If the door is already animating, do nothing.
        if (this.shieldDoorStates[door] !== ShieldDoorState.OPEN) return this;
        let newStates: ShieldDoorState[] = [];
        let newTimes: number[] = [];
        for (let i = 0; i < 3; i++) {
            if (i === door) {
                newStates = [...newStates, ShieldDoorState.CLOSING];
                newTimes = [...newTimes, computeCurrentFrame()];
            } else {
                newStates = [...newStates, this.shieldDoorStates[i]];
                newTimes = [...newTimes, this.shieldDoorActivationTimes[i]];
            }
        }
        return new ShieldDoor(newStates, newTimes, this.openingEarly);
    }

    // Tell a door to begin opening early.
    openDoorEarly(door: number): ShieldDoor {
        // If the door is not currently CLOSED, you can't open it early.
        if (this.shieldDoorStates[door] !== ShieldDoorState.CLOSED) return this;
        let f = computeCurrentFrame();
        let newStates: ShieldDoorState[] = [];
        let newTimes: number[] = [];
        let newEarlyOpenFlags: boolean[] = [];
        for (let i = 0; i < 3; i++) {
            if (i === door) {
                newStates = [...newStates, ShieldDoorState.OPENING];
                newTimes = [...newTimes, f];
                newEarlyOpenFlags = [...newEarlyOpenFlags, true];
            } else {
                newStates = [...newStates, this.shieldDoorStates[i]];
                newTimes = [...newTimes, this.shieldDoorActivationTimes[i]];
                newEarlyOpenFlags = [...newEarlyOpenFlags, this.openingEarly[i]];
            }
        }
        return new ShieldDoor(newStates, newTimes, newEarlyOpenFlags);
    }

    // Update the door states to what they should be, based on the current frame number.
    updateStates(): ShieldDoor {
        let f = computeCurrentFrame();
        let newStates: ShieldDoorState[] = [];
        let newTimes: number[] = [];
        let newEarlyOpenFlags: boolean[] = [];
        let debug = "";
        for (let i = 0; i < 3; i++) {
            let ds: string = "";
            let s: ShieldDoorState = ShieldDoorState.OPEN;
            let acTime: number = this.shieldDoorActivationTimes[i];
            let earlyOpen: boolean = this.openingEarly[i];
            let t = f - this.shieldDoorActivationTimes[i];
            if (earlyOpen) {
                if (t > (SLAT_OPENING_DUR + (INTER_SLAT_DELAY * 3))) {
                    s = ShieldDoorState.OPEN;
                    ds = "OPEN(early)   ";
                    // Now that the early-opened shield door is open, clear the flag and the activation time.
                    earlyOpen = false;
                    acTime = 0;
                } else {
                    s = ShieldDoorState.OPENING;
                    ds = "OPENING(early)";
                }
            } else {
                if (t > (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + SLAT_OPENING_DUR + (INTER_SLAT_DELAY * 9))) {
                    s = ShieldDoorState.OPEN;
                    ds = "OPEN          ";
                    // Just as a precaution, clear the early open state.
                    earlyOpen = false;
                } else if (t > (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6))) {
                    s = ShieldDoorState.OPENING;
                    ds = "OPENING       ";
                } else if (t > (SLAT_CLOSING_DUR + (INTER_SLAT_DELAY * 3))) {
                    s = ShieldDoorState.CLOSED;
                    ds = "CLOSED        ";
                } else {
                    s = ShieldDoorState.CLOSING;
                    ds = "CLOSING       ";
                    // Just as a precaution, clear the early open state.
                    earlyOpen = false;
                }
            }
            newStates = [...newStates, s];
            newTimes = [...newTimes, acTime];
            newEarlyOpenFlags = [...newEarlyOpenFlags, earlyOpen];
            debug = debug + " " + ds;
        }
        //console.log(debug);   // When this was uncommented, I could see states transitioning properly.
        return new ShieldDoor(newStates, newTimes, newEarlyOpenFlags);
    }
}