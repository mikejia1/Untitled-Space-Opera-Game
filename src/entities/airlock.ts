import { Colour, positionRect, outlineRect, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, shiftRect, shiftForTile, computeBackgroundShift, Coord, Rect, GardenerDirection } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Gardener } from './gardener';
import { Tile } from '../scene';

export enum AirlockState {OPENING, CLOSING, OPEN, CLOSED}
const MAX_DOOR_OFFSET = 32;
const DOOR_DELAY = 12;

// The airlock
export class Airlock implements Paintable {
    pos: Coord;
    state: AirlockState;
    // Time of last interaction in frame number
    lastInteraction: number;
  
    constructor() {
      this.pos = new Coord(156,240);
      this.state = AirlockState.CLOSED;
      this.lastInteraction = 0;
    }

    updateState(state: IGlobalState): Airlock{
        // Assume door transition takes MAX_DOOR_OFFSET frames
        let stateTransition : boolean = state.currentFrame - this.lastInteraction > MAX_DOOR_OFFSET + DOOR_DELAY;
        if(this.state == AirlockState.OPENING){
            this.state = stateTransition ? AirlockState.OPEN : this.state;
        }
        if(this.state == AirlockState.CLOSING){
            this.state = stateTransition ? AirlockState.CLOSED : this.state;
        }
        return this;
    }

    // Activate the airlock
    activate(state: IGlobalState): Airlock{
        if(this.state == AirlockState.CLOSED){
            this.state = AirlockState.OPENING;
            this.lastInteraction = state.currentFrame;
        }
        else if(this.state == AirlockState.OPEN){
            this.state = AirlockState.CLOSING;
            this.lastInteraction = state.currentFrame;
        }
        return this;
    }

    // Paint the plant on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord = this.computeShift(state)): void {
        // Compute base, the bottom-middle point for the watering can.
        let base: Coord = this.pos.plus(MAP_TILE_SIZE / 2, 0);
        base = base.plus(shift.x, shift.y).toIntegers();
        canvas.save();
        let doorOffset = 0;
        if(this.state == AirlockState.OPENING){
            doorOffset = Math.max(0, state.currentFrame - this.lastInteraction -DOOR_DELAY);
        }
        else if(this.state == AirlockState.CLOSING){
            doorOffset = MAX_DOOR_OFFSET - Math.max(0, state.currentFrame - this.lastInteraction - DOOR_DELAY);
        }
        else if(this.state == AirlockState.OPEN){
            doorOffset = MAX_DOOR_OFFSET;
        }
        //Left door
        canvas.drawImage(
            state.airlockDoorImage,             // Watering base source image
            64, 0,                              // Top-left corner of frame in source
            64, 64,                             // Size of frame in source
            base.x - doorOffset, base.y,        // Position of sprite on canvas
            64, 64);                            // Sprite size on canvas
            
        //Right door
        canvas.drawImage(
            state.airlockDoorImage,             // Watering base source image
            128, 0,                             // Top-left corner of frame in source
            64, 64,                             // Size of frame in source
            base.x + doorOffset, base.y,        // Position of sprite on canvas
            64, 64);                            // Sprite size on canvas
        canvas.restore();
    }

    // Compute a displacement that will place the Plant at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, false));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}
 