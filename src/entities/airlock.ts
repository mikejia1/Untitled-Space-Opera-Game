import { shiftForTile, computeBackgroundShift, Coord, Rect, AIRLOCK_PIXEL_SPEED, rectanglesOverlap, AIRLOCK_PULL_SCALE } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState, collisionDetected, ColliderType } from '../store/classes';
import { Tile } from '../scene';
import { Cat } from './cat';
import { NonPlayer } from './nonplayer';
import { Plant } from './plant';
import { off } from 'process';
import { CausaMortis } from './skeleton';

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
        switch (this.state) {
            case AirlockState.CLOSED:
                this.state = AirlockState.OPENING;
                this.lastInteraction = state.currentFrame;
                break;
            case AirlockState.OPEN:
                this.state = AirlockState.CLOSING;
                this.lastInteraction = state.currentFrame;
                break;
            case AirlockState.OPENING:
                if ((state.currentFrame - this.lastInteraction) < DOOR_DELAY) this.state = AirlockState.CLOSED;
                else {
                    // Set state to CLOSING and set lastInteraction time to one that would put door at exactly its current position.
                    let offset = this.doorOffset(state);
                    this.state = AirlockState.CLOSING;
                    this.lastInteraction = state.currentFrame - (MAX_DOOR_OFFSET - offset);
                }
                break;
            case AirlockState.CLOSING:  // No change if door is closing.
        };
        return this;
    }

    getMovementDelta(pos: Coord, log: boolean): Coord {
        let directVec = this.pos.minus(pos.x, pos.y);
        let actualDist = directVec.magnitude();
        if (actualDist <= 1) return new Coord(0,0);
        let unitVec = directVec.times(1 / actualDist);
        let dist = actualDist;
        dist = 1 + ((dist - 1) * AIRLOCK_PULL_SCALE);
        let pull = Math.min(AIRLOCK_PIXEL_SPEED / (dist * dist), AIRLOCK_PIXEL_SPEED);
        pull = Math.min(pull, actualDist);
       if (log) console.log("Pull " + pull + " dist " + dist + " actual " + actualDist);
        return unitVec.times(pull);
    }

    deathRect(): Rect {
        return {
            a: this.pos.plus(-18, -18),
            b: this.pos.plus(18, 18),
        }
    }

    // Compute the current door offset value.
    doorOffset(state: IGlobalState): number {
        let offset: number;
        // Door offset calculation varies by air lock state.
        let timeDelta = state.currentFrame - this.lastInteraction;
        switch (this.state) {
            case AirlockState.OPENING:
                offset = timeDelta - DOOR_DELAY;
                break;
            case AirlockState.CLOSING:
                offset = MAX_DOOR_OFFSET - timeDelta;
                break;
            case AirlockState.OPEN:
                offset = MAX_DOOR_OFFSET;
                break;
            case AirlockState.CLOSED:
                offset = 0;
        };
        // Clamp to legal range.
        return Math.min(MAX_DOOR_OFFSET, Math.max(0, offset));
    }

    // Paint the air lock on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState, shift: Coord = this.computeShift(state)): void {
        let base: Coord = this.pos.plus(MAP_TILE_SIZE / 2, 0);
        base = base.plus(shift.x, shift.y).toIntegers();
        canvas.save();
        let doorOffset = this.doorOffset(state);
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

        //canvas.fillStyle = `rgb(255,0,0)`;
        //let debug = this.pos.plus(shift.x, shift.y);
        //canvas.fillRect(debug.x - 4, debug.y - 4, 8, 8);

        canvas.restore();
    }

    // Compute a displacement that will place the air lock at the correct place on the canvas.
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
    let move: Coord = state.airlock.getMovementDelta(actor.pos, actor.pos === state.gardener.pos);
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
        return {
            ...state,
            plants: plantsWithColliderType(state, ColliderType.PlantCo),
        };
    }
    let cats: Cat[] = [];
    for (let i = 0; i < state.cats.length; i++) {
        let cat : Cat = getAirlockShiftedEntity(state, state.cats[i]) as Cat;
        if (rectanglesOverlap(state.airlock.deathRect(), cat.collisionRect()) && cat.death == null) {
            cat.death = {time : state.currentFrame, cause: CausaMortis.Ejection}
        }
        cats = [...cats, cat];
    }
    let npcs: NonPlayer[] = [];
    for (let i = 0; i < state.npcs.length; i++) {
        let npc : NonPlayer = getAirlockShiftedEntity(state, state.npcs[i]) as NonPlayer;
        if (rectanglesOverlap(state.airlock.deathRect(), npc.collisionRect()) && npc.death == null) {
            npc.death = {time : state.currentFrame, cause: CausaMortis.Ejection}
        }
        npcs = [...npcs, npc];
    }
    let gardener = getAirlockShiftedEntity(state, state.gardener);
    if (rectanglesOverlap(state.airlock.deathRect(), gardener.collisionRect()) && gardener.death == null) {
        console.log("gardener ejected");
        gardener.death = {time : state.currentFrame, cause: CausaMortis.Ejection}
    }
    return {
        ...state,
        cats: cats,
        npcs: npcs,
        gardener: gardener,
        airlock: state.airlock.updateDoorState(state),
        plants: plantsWithColliderType(state, ColliderType.NoneCo),
    };
}

function plantsWithColliderType(state: IGlobalState, cType: ColliderType): Plant[] {
    if (state.plants[0].colliderType === cType) return state.plants;
    let newPlants: Plant[] = [];
    for (let i = 0; i < state.plants.length; i++) {
        let p = state.plants[i];
        newPlants = [...newPlants, new Plant(p.colliderId, p.pos, p.health, p.growthStage, p.lastDehydrationTimestamp, p.lastGrowthTimestamp, cType)];
    }
    return newPlants;
}