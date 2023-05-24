import { Tile } from "../scene";
import { IGlobalState } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { BACKGROUND_HEIGHT, BACKGROUND_WIDTH, Coord, Rect, SHIP_INTERIOR_RECT, STARFIELD_RECT, computeBackgroundShift, computeCurrentFrame, drawClippedImage, shiftForTile } from "../utils";

// Amount of lag, in animation frames, between adjacent slats in the blast shield.
export const INTER_SLAT_DELAY = 10;

// Amount of time, in animation frames, required to close one of the 12 shield slats.
const SLAT_CLOSING_DUR = 15;

// Amount of time, in animation frames, during which time a shield slat remains closed.
const SLAT_CLOSED_DUR = 300;

// Amount of time, in animation frames, required to open one of the 12 shield slats.
const SLAT_OPENING_DUR = 40;

// The number of vertical pixels between a fully opened and a fully closed (top or bottom) half-slat.
// Plus similar value for the shadows of a half-slat.
const SLAT_CLOSE_DISTANCE = 96;
const SHADOW_CLOSE_DISTANCE = 150;

// Some important dimensions of the various shield door slat images.
const SLAT_WIDTH = 32;
const SLAT_TOP_HEIGHT = 96;

// Number of pixels to shift slat top images upward to get perfect alignment with closed door image.
// Plus corresponding value for slat shadows.
const SLAT_TOP_ADJUST = 5;
const SHADOW_TOP_ADJUST = 5;
// Number of pixels to shift slat bottom images downward to get perfect alignment with closed door image.
// Plus corresponding value for slat shadows.
const SLAT_BOTTOM_ADJUST = -27;
const SHADOW_BOTTOM_ADJUST = -28;

// Number of pixels to shift all door images upward. Used to have close close in *middle* of starfield.
// Plus a corresponding value for slat shadows.
const SHIELD_DOOR_ADJUST = 10;
const SHADOW_DOOR_ADJUST = 10;

// For use in debugging.
const SHOW_PERCENTAGES = false;

// Values for shield door slat indicator light configuration.
const LIGHT_COUNT = 4;
const LIGHT_RADIUS = 2;

// Alpha value determining how dark slat shadows are.
const SLAT_SHADOW_ALPHA = 0.3;

// A small adjustment to make slat shadows travel a bit faster.
const SHADOW_GAP_ADJUSTMENT = 1.08;

enum ShieldDoorState {OPENING, CLOSING, OPEN, CLOSED}

export function initialShieldDoor(): ShieldDoor {
    return new ShieldDoor(
        [ShieldDoorState.OPEN, ShieldDoorState.OPEN, ShieldDoorState.OPEN], // Doors start in OPEN state.
        [0, 0, 0],  // Dummy values for door activation times.
        [false, false, false],  // Flags that prompt doors to open early (false == not currently prompted).
        0   // Initial ambient shade from the shields is zero.
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
    // Total ambient shade from the shield doors. Range 0 to 1 where 0 is all slats fully open and 1 is fully closed.
    ambientShadeFactor: number;
    
    constructor(states: ShieldDoorState[], activationTimes: number[], openingEarly: boolean[], ambientShadeFactor: number) {
        this.pos = new Coord(0,0);
        // The state of each door.
        this.shieldDoorStates = states;
        // Most recent door activation times.
        this.shieldDoorActivationTimes = activationTimes;
        // Whether or not the doors are being opened early.
        this.openingEarly = openingEarly;
        // Total ambient shade (0.0 to 1.0) from the all the slats combined.
        this.ambientShadeFactor = ambientShadeFactor;
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

    // Paint the shadows cast by the shield.
    paintShadows(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        let f = computeCurrentFrame();
        let shift = this.computeShift(state);
        let clipRect = {
            a: SHIP_INTERIOR_RECT.a.plus(shift.x, shift.y),
            b: SHIP_INTERIOR_RECT.b.plus(shift.x, shift.y),
        };
        for (let i = 0; i < 3; i++) {
            this.paintShieldDoorShadows(i, canvas, state, f, shift, clipRect);
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

    // Paint the shadows from one of the blast shield doors.
    paintShieldDoorShadows(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        switch (this.shieldDoorStates[i]) {
            case ShieldDoorState.OPEN:      return; // Nothing to paint if door is fully open.
            case ShieldDoorState.OPENING:   return this.paintOpeningDoorShadows(i, canvas, state, currentFrame, shift, clipRect);
            case ShieldDoorState.CLOSING:   return this.paintClosingDoorShadows(i, canvas, state, currentFrame, shift, clipRect);
            case ShieldDoorState.CLOSED:    return this.paintClosedDoorShadows(i, canvas, state, currentFrame, shift, clipRect);
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
                this.paintClosedSlat(i, j, canvas, state, currentFrame, shift, clipRect);
            } else {            
                let x = this.slatX(i, j);

                // Top of slat.
                let y = SLAT_CLOSE_DISTANCE - SLAT_TOP_HEIGHT - gap - SLAT_TOP_ADJUST - SHIELD_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.top, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                this.drawTopLights(canvas, slatPos, clipRect, st);

                // Bottom of slat.
                y = SLAT_CLOSE_DISTANCE + gap + SLAT_BOTTOM_ADJUST - SHIELD_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.bottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                this.drawBottomLights(canvas, slatPos, clipRect, st);
            }
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    // Paint shadows from one of the three blast shield doors while it is opening.
    paintOpeningDoorShadows(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
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
            let gap = percent * SHADOW_CLOSE_DISTANCE * SHADOW_GAP_ADJUSTMENT;
            // If a slat is (basically) closed, paint the full closed slat shadow instead of the 2 parts.
            if (gap < 2) {
                this.paintClosedSlatShadow(i, j, canvas, state, currentFrame, shift, clipRect);
            } else {            
                let x = this.slatX(i, j);

                // Top of slat - which casts the bottom shadow.
                let y = BACKGROUND_HEIGHT - SHADOW_CLOSE_DISTANCE + gap + SHADOW_TOP_ADJUST + SHADOW_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                canvas.save();
                canvas.globalAlpha = SLAT_SHADOW_ALPHA;
                drawClippedImage(canvas, state.shieldImages.blackTop, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                if (y + 95 < BACKGROUND_HEIGHT) {
                    canvas.globalAlpha = 1;
                    canvas.fillStyle = `rgba(0,0,0,${SLAT_SHADOW_ALPHA})`;
                    canvas.fillRect(slatPos.x, slatPos.y + 96, 32, BACKGROUND_HEIGHT - (slatPos.y + 96));
                }
                canvas.restore();

                // Bottom of slat - which casts the top shadow.
                y = SHIP_INTERIOR_RECT.a.y + SHADOW_CLOSE_DISTANCE - SLAT_TOP_HEIGHT - gap + SHADOW_BOTTOM_ADJUST + SHADOW_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                canvas.save();
                canvas.globalAlpha = SLAT_SHADOW_ALPHA;
                drawClippedImage(canvas, state.shieldImages.blackBottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                if (y > 145) {
                    canvas.globalAlpha = 1;
                    canvas.fillStyle = `rgba(0,0,0,${SLAT_SHADOW_ALPHA})`;
                    canvas.fillRect(slatPos.x, 145 + shift.y, SLAT_WIDTH, y - 145);
                }
                canvas.restore();
            }
        }
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
                this.paintClosedSlat(i, j, canvas, state, currentFrame, shift, clipRect);
            } else {
                let x = this.slatX(i, j);

                // Top of slat.
                let y = dist - SLAT_TOP_HEIGHT - SLAT_TOP_ADJUST - SHIELD_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.top, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                this.drawTopLights(canvas, slatPos, clipRect, st);

                // Bottom of slat.
                y = SLAT_CLOSE_DISTANCE + (SLAT_CLOSE_DISTANCE - dist) + SLAT_BOTTOM_ADJUST - SHIELD_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                drawClippedImage(canvas, state.shieldImages.bottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                this.drawBottomLights(canvas, slatPos, clipRect, st);
            }
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    // Paint shadows from one of the three blast shield doors while it is closing.
    paintClosingDoorShadows(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let debug = "Closing: ";
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            st = Math.max(st, 0);
            let percent = Math.min(st / SLAT_CLOSING_DUR, 1);
            let prcnt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(percent * 100);
            debug = debug + " " + prcnt;
            let dist = 1 - ((1 - (percent * SHADOW_CLOSE_DISTANCE)) * SHADOW_GAP_ADJUSTMENT);
            // If a slat is (basically) closed, paint the full closed slat shadow instead of the 2 parts.
            if (percent > 0.98) {
                this.paintClosedSlatShadow(i, j, canvas, state, currentFrame, shift, clipRect);
            } else {
                let x = this.slatX(i, j);

                // Top of slat - which casts bottom shadow.
                let y = BACKGROUND_HEIGHT - dist + SHADOW_TOP_ADJUST + SHADOW_DOOR_ADJUST;
                let slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                canvas.save();
                canvas.globalAlpha = SLAT_SHADOW_ALPHA;
                drawClippedImage(canvas, state.shieldImages.blackTop, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                if (y + 95 < BACKGROUND_HEIGHT) {
                    canvas.globalAlpha = 1;
                    canvas.fillStyle = `rgba(0,0,0,${SLAT_SHADOW_ALPHA})`;
                    canvas.fillRect(slatPos.x, slatPos.y + 96, 32, BACKGROUND_HEIGHT - (slatPos.y + 96));
                }
                canvas.restore();

                // Bottom of slat - which casts top shadow.
                y = SHIP_INTERIOR_RECT.a.y + dist - SLAT_TOP_HEIGHT + SHADOW_BOTTOM_ADJUST + SHADOW_DOOR_ADJUST;
                slatPos = new Coord(x + shift.x, y + shift.y);
                slatPos = slatPos.toIntegers();
                canvas.save();
                canvas.globalAlpha = SLAT_SHADOW_ALPHA;
                drawClippedImage(canvas, state.shieldImages.blackBottom, 0,0, 32, 96, slatPos.x, slatPos.y, 32, 96, clipRect);
                if (y > 145) {
                    canvas.globalAlpha = 1;
                    canvas.fillStyle = `rgba(0,0,0,${SLAT_SHADOW_ALPHA})`;
                    canvas.fillRect(slatPos.x, 145 + shift.y, SLAT_WIDTH, y - 145);
                }
                canvas.restore();
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
            this.paintClosedSlat(i, j, canvas, state, currentFrame, shift, clipRect);
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    // Paint shadows from one of the three blast shield doors in its fully closed state.
    paintClosedDoorShadows(i: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let debug = "Closed: ";
        for (let j = 0; j < 4; j++) {
            let st = this.slatTime(i, j, currentFrame);
            st = Math.max(st - (SLAT_CLOSING_DUR + (INTER_SLAT_DELAY * 3)), 0);
            let percent = Math.min(st / SLAT_CLOSED_DUR, 1);
            let prcnt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(percent * 100);
            debug = debug + " " + prcnt;
            this.paintClosedSlatShadow(i, j, canvas, state, currentFrame, shift, clipRect);
        }
        if (SHOW_PERCENTAGES) console.log(debug);
    }

    paintClosedSlat(door: number, slat: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let y = 0 - SHIELD_DOOR_ADJUST;
        let x = this.slatX(door, slat);
        let slatPos = new Coord(x + shift.x, y + shift.y);
        slatPos = slatPos.toIntegers();
        drawClippedImage(canvas, state.shieldImages.closed, 0,0, 32, 160, slatPos.x, slatPos.y, 32, 160, clipRect);
        let st = this.slatTime(door, slat, currentFrame);
        this.drawAllLights(canvas, slatPos, clipRect, st);
    }

    paintClosedSlatShadow(door: number, slat: number, canvas: CanvasRenderingContext2D, state: IGlobalState, currentFrame: number, shift: Coord, clipRect: Rect): void {
        let y = 145;
        let x = this.slatX(door, slat);
        let slatPos = new Coord(x + shift.x, y + shift.y);
        slatPos = slatPos.toIntegers();
        canvas.save();
        canvas.fillStyle = `rgba(0,0,0,${SLAT_SHADOW_ALPHA})`;
        canvas.fillRect(
            slatPos.x, slatPos.y,
            SLAT_WIDTH, BACKGROUND_HEIGHT - STARFIELD_RECT.b.y + 1);
        canvas.restore();
    }

    // Paint the indicator lights on a shield door top slat.
    drawTopLights(canvas: CanvasRenderingContext2D, slatPos: Coord, clipRect: Rect, slatTime: number): void {
        let p = Math.min(slatTime / (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6)), 1);
        for (let i = 0; i < LIGHT_COUNT; i++) {
            let lightOn = (p + 0.1) > ((i + 1) / LIGHT_COUNT);
            this.paintLight(canvas, slatPos.plus(12, 23 + 4), 1, lightOn, i);
        }
    }

    // Paint the indicator lights on a shield door bottom slat.
    drawBottomLights(canvas: CanvasRenderingContext2D, slatPos: Coord, clipRect: Rect, slatTime: number): void {
        let p = Math.min(slatTime / (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6)), 1);
        for (let i = 0; i < LIGHT_COUNT; i++) {
            let lightOn = (p + 0.1) > ((i + 1) / LIGHT_COUNT);
            this.paintLight(canvas, slatPos.plus(12, 69 - 4), -1, lightOn, i);
        }
    }

    // Paint the indicator lights on a shield door closed slat (top and bottom together).
    drawAllLights(canvas: CanvasRenderingContext2D, slatPos: Coord, clipRect: Rect, slatTime: number): void {
        let p = Math.min(slatTime / (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6)), 1);
        for (let i = 0; i < LIGHT_COUNT; i++) {
            let lightOn = (p + 0.1) > ((i + 1) / LIGHT_COUNT);
            this.paintLight(canvas, slatPos.plus(12,  18 + 4),  1, lightOn, i);
            this.paintLight(canvas, slatPos.plus(12, 140 - 4), -1, lightOn, i);
        }
    }

    // Paint a single indicator light on a shield door slat.
    paintLight(canvas: CanvasRenderingContext2D, startPos: Coord, stepFactor: number, lightIsOn: boolean, index: number): void {
        let loc = startPos.plus(0, (LIGHT_RADIUS + 1) * 2 * stepFactor * 1.75 * index).toIntegers();
        canvas.save();
        canvas.strokeStyle = lightIsOn ? `rgba(195,155,175,1.0)` : `rgba(55,55,105,1.0)`;
        canvas.fillStyle =   lightIsOn ? `rgba(205,85,85,1.0)`   : `rgba(105,55,55,1.0)`;
        canvas.lineWidth = 1;
        canvas.beginPath();
        canvas.arc(                                         // Draw a circle.
            loc.x + LIGHT_RADIUS, loc.y + LIGHT_RADIUS,     // Centre of circle.
            LIGHT_RADIUS - 1,                               // Radius of the circle.
            0, 2 * Math.PI);                                // Start and end angles.
        for (let i = 0; i < 5; i++) canvas.stroke()         // The outline of the circle.
        canvas.fill();                                      // The inside of the circle.
        canvas.restore();
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
        return new ShieldDoor(newStates, newTimes, this.openingEarly, this.ambientShadeFactor);
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
        return new ShieldDoor(newStates, newTimes, newEarlyOpenFlags, this.ambientShadeFactor);
    }

    // Compute shade factor for a single slat, based on how closed it is. 0.0 to 1.0. Fully open is 0 and fully closed is 1.
    slatShadeFactor(door: number, slat: number): number {
        switch (this.shieldDoorStates[door]) {
            case ShieldDoorState.CLOSED:    return 1.0;
            case ShieldDoorState.OPEN:      return 0.0;
            case ShieldDoorState.CLOSING:   return Math.min(Math.max(this.slatTime(door, slat, computeCurrentFrame()), 0) / SLAT_CLOSING_DUR, 1);
            case ShieldDoorState.OPENING:   return Math.min(Math.max(this.slatTime(door, slat, computeCurrentFrame()) - (this.openingEarly[door] ? 0 : (SLAT_CLOSING_DUR + SLAT_CLOSED_DUR + (INTER_SLAT_DELAY * 6))), 0) / SLAT_OPENING_DUR, 1);
        }
    }

    // Update the door states to what they should be, based on the current frame number.
    updateState(state: IGlobalState): IGlobalState {
        let f = state.currentFrame;
        let newStates: ShieldDoorState[] = [];
        let newTimes: number[] = [];
        let newEarlyOpenFlags: boolean[] = [];
        let debug = "";
        let shadeFactorSum: number = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) shadeFactorSum = shadeFactorSum + this.slatShadeFactor(i, j);
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
        return {...state, shieldDoors: new ShieldDoor(newStates, newTimes, newEarlyOpenFlags, shadeFactorSum / 12)};
    }
}