import { Tile } from "../scene";
import { IGlobalState } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { Coord, computeBackgroundShift, computeCurrentFrame, shiftForTile } from "../utils";

// Amount of lag, in animation frames, between adjacent slats in the blast shield.
const InterSlatDelay = 10;

// Amount of time, in animation frames, required to close one of the 12 shield slats.
const SlatClosingDuration = 20;

// Amount of time, in animation frames, during which time a shield slat remains closed.
const SlatClosedDuration = 200;

// Amount of time, in animation frames, required to open one of the 12 shield slats.
const SlatOpeningDuration = 40;

// The number of vertical pixels between a fully opened and a fully closed (top or bottom) half-slat.
const SlatCloseDistance = 96;

// Some important dimensions of the various shield door slat images.
const SlatWidth = 32;
const SlatTopHeight = 96;

enum ShieldDoorState {OPENING, CLOSING, OPEN, CLOSED}

export function initialShieldDoor(): ShieldDoor {
    return new ShieldDoor(
        [ShieldDoorState.OPEN, ShieldDoorState.OPEN, ShieldDoorState.OPEN], // Doors start in OPEN state.
        [0, 0, 0]   // Dummy values for door activation times.
    );
}

export class ShieldDoor implements Paintable {
    // Unused coords
    pos: Coord;
    // There are 3 shield doors
    shieldDoorStates: ShieldDoorState[];
    // The timestamp of that last activation of each door
    shieldDoorActivationTimes: number[];
    
    constructor(states: ShieldDoorState[], activationTimes: number[]) {
        this.pos = new Coord(0,0);
        // The state of each door.
        this.shieldDoorStates = states;
        // Most recent door activation times.
        this.shieldDoorActivationTimes = activationTimes;
    }

    // Paint the blast shield.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        let f = computeCurrentFrame();
        let shift = this.computeShift(state);
        for (let i = 0; i < 3; i++) {
            this.paintShieldDoor(i, canvas, state, f, shift);
        }
    }

    // Paint one of the three blast shield doors.
    paintShieldDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord): void {
        switch (this.shieldDoorStates[i]) {
            case ShieldDoorState.OPEN:      return; // Nothing to paint if door is fully open.
            case ShieldDoorState.OPENING:   return this.paintOpeningDoor(i, canvas, state, currentFrame, shift);
            case ShieldDoorState.CLOSING:   return this.paintClosingDoor(i, canvas, state, currentFrame, shift);
            case ShieldDoorState.CLOSED:    return this.paintClosedDoor(i, canvas, state, shift); // Closed door is static. Doesn't require currentFrame.
        }
    }

    // Paint one of the three blast shield doors while it is opening.
    paintOpeningDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord): void {
        console.log("OPENING");
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            st = st - (SlatClosingDuration + SlatClosedDuration);
            let percent = Math.min(st / SlatOpeningDuration, 1);
            if (j === 0) console.log("Opening percent: " + (percent * 100));
            let gap = percent * SlatCloseDistance;
            let y = SlatCloseDistance - SlatTopHeight - gap;
            let x = this.slatX(i, j);
            let slatPos = new Coord(x + shift.x, y + shift.y);
            slatPos = slatPos.toIntegers();
            canvas.drawImage(state.shieldImages.top, slatPos.x, slatPos.y);
        }
    }

    // Paint one of the three blast shield doors while it is closing.
    paintClosingDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord): void {
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            let percent = Math.min(st / SlatClosingDuration, 1);
            if (j === 0) console.log("Closing percent: " + (percent * 100));
            let dist = percent * SlatCloseDistance;
            let y = dist - SlatTopHeight;
            let x = this.slatX(i, j);
            let slatPos = new Coord(x + shift.x, y + shift.y);
            slatPos = slatPos.toIntegers();
            canvas.drawImage(state.shieldImages.top, slatPos.x, slatPos.y);
        }
    }

    // Paint one of the three blast shield doors in its fully closed state.
    paintClosedDoor(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord): void {
        for (let j = 0; j < 4; j++) {
            let y = 0;
            let x = this.slatX(i, j);
            let slatPos = new Coord(x + shift.x, y + shift.y);
            slatPos = slatPos.toIntegers();
            canvas.drawImage(state.shieldImages.closed, 0,0, 32, 160, slatPos.x, slatPos.y, 32, 160);
        }
    }

    // Compute the current animation frame number for a specific slat of a specific door.
    slatTime(door: number, slat: number, currentFrame: number): number {
        return Math.max(currentFrame - this.shieldDoorActivationTimes[door] - (slat * InterSlatDelay), 0);
    }

    // The x position for a given slat in a given door.
    slatX(door: number, slat: number): number {
        return SlatWidth * ((door * 4) + slat);
    }

    // Check whether all doors are now in fully closed state.
    allDoorsClosed(): boolean {
        return this.shieldDoorStates.every((state) => state == ShieldDoorState.CLOSED);
    }

    // Compute a displacement that will place the blast shield at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(new Tile(0,0), state, computeBackgroundShift(state));
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
                newStates = [...newStates, this.shieldDoorStates[door]];
                newTimes = [...newTimes, this.shieldDoorActivationTimes[door]];
            }
        }
        return new ShieldDoor(newStates, newTimes);
    }

    // Update the door states to what they should be, based on the current frame number.
    updateStates(): ShieldDoor {
        let f = computeCurrentFrame();
        let newStates: ShieldDoorState[] = [];
        let debug = "";
        for (let i = 0; i < 3; i++) {
            let ds: string = "";
            let s: ShieldDoorState = ShieldDoorState.OPEN;
            let t = f - this.shieldDoorActivationTimes[i];
            if (t > (SlatClosingDuration + SlatClosedDuration + SlatOpeningDuration + (InterSlatDelay * 3))) {
                s = ShieldDoorState.OPEN;
                ds = "OPEN   ";
            } else if (t > (SlatClosingDuration + SlatClosedDuration + (InterSlatDelay * 3))) {
                s = ShieldDoorState.OPENING;
                ds = "OPENING";
            } else if (t > (SlatClosingDuration + (InterSlatDelay * 3))) {
                s = ShieldDoorState.CLOSED;
                ds = "CLOSED  ";
            } else {
                s = ShieldDoorState.CLOSING;
                ds = "CLOSING";
            }
            newStates = [...newStates, s];
            debug = debug + " " + ds;
        }
        //console.log(debug);   // When this was uncommented, I could see states transitioning properly.
        return new ShieldDoor(newStates, this.shieldDoorActivationTimes);
    }
}