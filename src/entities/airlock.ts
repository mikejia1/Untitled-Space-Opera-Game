import { shiftForTile, computeBackgroundShift, Coord, Rect, AIRLOCK_PIXEL_SPEED, rectanglesOverlap, outlineRect, Colour } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState, collisionDetected } from '../store/classes';
import { Tile } from '../scene';
import { Cat } from './cat';
import { NonPlayer } from './nonplayer';

export enum AirlockState { OPENING, CLOSING, OPEN, CLOSED }
const MAX_DOOR_OFFSET = 32;
const DOOR_DELAY = 12;

// The airlock
export class Airlock implements Paintable {
    pos: Coord;
    state: AirlockState;
    // Time of last interaction in frame number
    lastInteraction: number;

    constructor() {
        this.pos = new Coord(188, 272);
        this.state = AirlockState.CLOSED;
        this.lastInteraction = 0;
    }

    // Return the position of the centre of the air lock.
    centre(): Coord {
        return this.pos.plus(MAP_TILE_SIZE / 2, 0);
    }

    // Is the airlock airtight or sucking everything into the void?
    isAirtight(state : IGlobalState): boolean {
        return this.state == AirlockState.CLOSED || this.state == AirlockState.OPENING && state.currentFrame - this.lastInteraction < DOOR_DELAY;
    }

    updateDoorState(state: IGlobalState): Airlock {
        // Assume door transition takes MAX_DOOR_OFFSET frames
        let stateTransition: boolean = state.currentFrame - this.lastInteraction > MAX_DOOR_OFFSET + DOOR_DELAY;
        if (this.state == AirlockState.OPENING) {
            this.state = stateTransition ? AirlockState.OPEN : this.state;
        }
        if (this.state == AirlockState.CLOSING) {
            this.state = stateTransition ? AirlockState.CLOSED : this.state;
        }
        return this;
    }

    // Activate the airlock
    activate(state: IGlobalState): Airlock {
        if (this.state == AirlockState.CLOSED) {
            this.state = AirlockState.OPENING;
            this.lastInteraction = state.currentFrame;
        }
        else if (this.state == AirlockState.OPEN) {
            this.state = AirlockState.CLOSING;
            this.lastInteraction = state.currentFrame;
        }
        return this;
    }

    getMovementDelta(pos: Coord): Coord {
        let directVec = this.pos.minus(pos.x, pos.y);
        let scalar = AIRLOCK_PIXEL_SPEED / directVec.magnitude();
        return new Coord(directVec.x * scalar, directVec.y * scalar);
    }

    deathRect(): Rect {
        return {
            a: this.pos.plus(-18, -18),
            b: this.pos.plus(18, 18),
        }
    }

    // Paint the plant on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord = this.computeShift(state)): void {
        let base: Coord = this.pos.plus(MAP_TILE_SIZE / 2, 0);
        base = base.plus(shift.x, shift.y).toIntegers();
        canvas.save();
        let doorOffset = 0;
        if (this.state == AirlockState.OPENING) {
            doorOffset = Math.max(0, state.currentFrame - this.lastInteraction - DOOR_DELAY);
        }
        else if (this.state == AirlockState.CLOSING) {
            doorOffset = MAX_DOOR_OFFSET - Math.max(0, state.currentFrame - this.lastInteraction - DOOR_DELAY);
        }
        else if (this.state == AirlockState.OPEN) {
            doorOffset = MAX_DOOR_OFFSET;
        }
        //Left door
        canvas.drawImage(
            state.airlockDoorImage,             // Watering base source image
            64, 0,                              // Top-left corner of frame in source
            64, 64,                             // Size of frame in source
            base.x - doorOffset - 32, base.y - 32,// Position of sprite on canvas
            64, 64);                            // Sprite size on canvas

        //Right door
        canvas.drawImage(
            state.airlockDoorImage,             // Watering base source image
            128, 0,                             // Top-left corner of frame in source
            64, 64,                             // Size of frame in source
            base.x + doorOffset - 32, base.y - 32,  // Position of sprite on canvas
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

function getAirlockShiftedEntity(state: IGlobalState, actor: any) : any {
    let move: Coord = state.airlock.getMovementDelta(actor.pos);
    let oldPos: Coord = actor.pos;
    actor.pos = oldPos.plus(move.x, move.y);
    // If there is a collision, negate it.
    if (collisionDetected(state, state.colliderMap, actor)) {
        actor.pos = oldPos;
    }
    return actor;
}

export function updateAirlockState(state: IGlobalState): IGlobalState {
    if (state.airlock.isAirtight(state)) {
        return state;
    }
    let cats: Cat[] = [];
    for (let i = 0; i < state.cats.length; i++) {
        let cat : Cat = getAirlockShiftedEntity(state, state.cats[i]) as Cat;
        if (!rectanglesOverlap(state.airlock.deathRect(), cat.collisionRect())) {
            cats = [...cats, cat];
        }
    }
    let npcs: NonPlayer[] = [];
    for (let i = 0; i < state.npcs.length; i++) {
        let npc : NonPlayer = getAirlockShiftedEntity(state, state.npcs[i]) as NonPlayer;
        if (!rectanglesOverlap(state.airlock.deathRect(), npc.collisionRect())) {
            npcs = [...npcs, npc];
        } else {
            // An NPC lost to the air lock is just moved to the off-screen "holding zone".
            npcs = [...npcs, npc.goOffScreen()];
        }
    }
    let gardener = getAirlockShiftedEntity(state, state.gardener);
    return { ...state, cats: cats, npcs: npcs, gardener: gardener, airlock: state.airlock.updateDoorState(state) };
}