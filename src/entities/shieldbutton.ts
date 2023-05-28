import { IGlobalState, Paintable, Interactable } from '../store/classes';
import {
    Colour, shiftForTile, shiftRect, positionRect, outlineRect,
    computeBackgroundShift, Coord, computeCurrentFrame, FPS, Rect, SHAKE_CAP,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';

// A button to activate a section of the multi-panel blast shield.
export class ShieldButton implements Paintable, Interactable {
    index: number;              // Index to number buttons from left to right, starting at zero.
    pos: Coord;                 // Position of the button in the environment.
    alarmStartTime: number;     // The frame number when the alarm began.
    isAlarming: boolean;        // Whether or not the alarm is flashing.
 
    constructor(index: number, pos: Coord, alarmStartTime: number, isAlarming: boolean) {
        this.index = index;
        this.pos = pos;
        this.alarmStartTime = alarmStartTime;
        this.isAlarming = isAlarming;
    }

    startAlarm(state: IGlobalState): ShieldButton {
        this.alarmStartTime = state.currentFrame;
        this.isAlarming = true;
        return this;
    }
    
    // Paint the button on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);        

        // The button animation has 4 frames.
        let frameCount = 4;
        let frame = Math.floor(state.currentFrame % (6 * frameCount) / 6);

        // Determine where, on the canvas, the button should be painted.
        let dest = new Coord(newPos.x - 11, newPos.y - 28);
        dest = dest.toIntegers();
        
        // Paint the concentric expanding rings of transparent red, if button is currently alarming.
        // Draw alarm pulses first so they'll be *behind* the buttons.
        if (this.isAlarming) this.paintAlarmPulses(canvas, dest);

        // Paint button sprite for current frame.
        canvas.drawImage(
            state.shieldButtonImage,    // Shield button source image
            (frame * 32), 0,            // Top-left corner of frame in source
            32, 32,                     // Size of frame in source
            dest.x, dest.y,             // Position of sprite on canvas
            32, 32);                    // Sprite size on canvas
            
        // Extra debug displays.
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
        if (state.debugSettings.showInteractionRects) {
            outlineRect(canvas, shiftRect(this.interactionRect(), shift.x, shift.y), Colour.INTERACTION_RECT);
        }
    }

    // Paint expanding concentric circles representing the alarm going off.
    paintAlarmPulses(canvas: CanvasRenderingContext2D, dest: Coord): void {
        let f = computeCurrentFrame();
        let alarmTime = Math.max(f - this.alarmStartTime, 0);   // Time since alarm began.
        if (alarmTime > (FPS * 5)) {    // Urgent mode.
            for (let i = 0; i < 4; i++) {
                this.paintPulseForAlarmTime(canvas, dest, Math.max(alarmTime - (i * 10), 0));
            }
        } else {                        // Non-urgent mode.
            for (let i = 0; i < 2; i++) {
                this.paintPulseForAlarmTime(canvas, dest, Math.max(alarmTime - (i * 20), 0));
            }
        }
    }

    paintPulseForAlarmTime(canvas: CanvasRenderingContext2D, dest: Coord, alarmTime: number): void {
        if (alarmTime === 0) return;                    // Ignore pulses of age zero.
        let rad = alarmTime % 30;                       // Radius is pulse age mod 30.
        let alpha = (29 - rad) / 30;                    // Alpha transparency fades to zero by the time radius is 29.
        if (alarmTime < (FPS * 5)) alpha *= 0.75;       // Non-urgent pulses are 25% more transparent.
        let thick = alpha * 6;                          // Line thickness goes from thick to thin.
        canvas.strokeStyle = `rgba(255,0,0,${alpha})`;  // Set stroke colour to transparent red.
        canvas.lineWidth = thick;                       // Set stroke thickness.
        canvas.beginPath();
        canvas.arc(                         // Draw a single alarm pulse circle.
            dest.x + 16, dest.y + 16,       // Centre of circle.
            rad,                            // Radius of the circle.
            0, 2 * Math.PI);                // Start and end angles.
        canvas.stroke();
    }

    // Compute a displacement that will place the button at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, SHAKE_CAP));
    }

    // Determine the grid tile that is the closest approximation to the button's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    interactionRect(): Rect {
        return {
            a: this.pos.plus(-10, -10),
            b: this.pos.plus(20, 8),
        };
    }

    activate(state: IGlobalState): ShieldButton {
        // TODO: Trigger 4 blast shield panels here as well.
        return new ShieldButton(this.index, this.pos, this.alarmStartTime, false);
    }
  }
