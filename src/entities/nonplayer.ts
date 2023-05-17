import { Collider, ColliderType, IGlobalState, Paintable } from '../store/classes';
import {
    BACKGROUND_HEIGHT, BACKGROUND_WIDTH, Colour, Direction, NPC_H_PIXEL_SPEED,
    ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, NPC_V_PIXEL_SPEED, computeBackgroundShift,
    outlineRect, positionRect, randomDirection, shiftForTile, shiftRect,
    Coord, Rect, randomInt,
} from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Tile } from '../scene';
import { paintGameOver } from './skeleton';

// Complete set of possible NPC mental states.
export enum MentalState {
    Normal,     // NPC acting "normal" wandering randomly around the ship
    Frazzled,   // NPC has cabin fever, acting erratic
}

export class NonPlayer implements Paintable, Collider {
    pos: Coord;                             // NPC's current location, in pixels, relative to background image.
    facing: Direction;                      // The direction that the NPC is currently facing.
    stationeryCountdown: number;            // A countdown (measured in frames) for when the NPC stands still.
    moving: boolean;                        // Whether or not the NPC is currently walking (vs standing still).
    mentalState: MentalState;               // The current mental state of the NPC.
    gardenerAvoidanceCountdown: number;     // NPC is avoiding the gardener when this is non-zero.
    colliderId: number;                     // ID to distinguish the collider from all others.
    colliderType: ColliderType = ColliderType.NPCCo; // The type of collider that NPCs are.

    constructor(params: any) {
        // Some default values to satisfy the requirement that everything be initialized in the constructor.
        this.colliderId = 8675309;              // A dummy collider ID, meant to be overwritten.
        this.pos = new Coord(50, 50);           // A dummy position, meant to be overwritten.
        this.facing = randomDirection();        // Choose a random facing direction.
        this.stationeryCountdown = 0;           // Start with NPC not standing still.
        this.moving = true;                     // Start with NPC moving.
        this.mentalState = MentalState.Normal;  // Start NPC in normal (~calm) mental state.
        this.gardenerAvoidanceCountdown = 0;    // NPC *not* initially avoiding gardener.

        // If the NPC is to be cloned from another, do that first before setting any specifically designated field.
        if (params.clone !== undefined) this.cloneFrom(params.clone);
        if (params.colliderId !== undefined) this.colliderId = params.colliderId;
        if (params.pos !== undefined) this.pos = params.pos;
        if (params.facing !== undefined) this.facing = params.facing;
        if (params.stationeryCountdown !== undefined) this.stationeryCountdown = params.stationeryCountdown;
        if (params.moving !== undefined) this.moving = params.moving;
        if (params.mentalState !== undefined) this.mentalState = params.mentalState;
        if (params.gardenerAvoidanceCountdown !== undefined) this.gardenerAvoidanceCountdown = params.gardenerAvoidanceCountdown;
    }

    // An initializer that clones an existing NPC.
    cloneFrom(other: NonPlayer): void {
        this.colliderId = other.colliderId;
        this.pos = other.pos;
        this.facing = other.facing;
        this.stationeryCountdown = other.stationeryCountdown;
        this.moving = other.moving;
        this.mentalState = other.mentalState;
        this.gardenerAvoidanceCountdown = other.gardenerAvoidanceCountdown;
    }

    // Return the invisible rectangle that determines collision behaviour for the NPC.
    collisionRect(): Rect {
        return {
            a: this.pos.plus(0, -ENTITY_RECT_HEIGHT),
            b: this.pos.plus(ENTITY_RECT_WIDTH, 0),
        }
    }

    // Paint the NPC on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Additional vertical displacement caused by mental state.
        let jitter: number;
        switch (this.mentalState) {
            case MentalState.Normal:
                jitter = 0;
                break;
            case MentalState.Frazzled:
                jitter = randomInt(-1, 1);
                break;
        }
        // The walking animation has 8 frames.
        let frameCount = 8;
        let frame: number;
        switch (this.mentalState) {
            // A normal NPC moves at a normal walking pace.
            case MentalState.Normal:
                frame = this.moving ? Math.floor(state.currentFrame % (6 * frameCount) / 6) : 0;
                break;
            // A frazzled NPC moves at a frantic pace.
            case MentalState.Frazzled:
                frame = this.moving ? Math.floor(state.currentFrame % (3 * frameCount) / 3) : 0;
                break;
        }
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);
        newPos = newPos.plus(0, jitter);
        let flip = (this.facing === Direction.Left);
        if (state.gameover) return paintGameOver(canvas, state, newPos, flip);

        // Determine where, on the canvas, the gardener should be painted.
        let dest = flip
            ? new Coord((newPos.x * -1) - 14, newPos.y - 18)
            : new Coord(newPos.x - 3, newPos.y - 18);
        dest = dest.toIntegers();
        canvas.save();
        canvas.scale(flip ? -1 : 1, 1);
        
        // Paint gardener sprite for current frame.
        canvas.drawImage(
            (this.mentalState === MentalState.Normal) ? state.npcImages.normalWalkCycle : state.npcImages.frazzledWalkCycle,
            (frame * 96) + 40, 20,             // Top-left corner of frame in source
            48, 48,                            // Size of frame in source
            dest.x, dest.y,                    // Position of sprite on canvas
            48, 48);                           // Sprite size on canvas
    
        // For debugging only. To be removed.
        if (this.gardenerAvoidanceCountdown > 0) outlineRect(canvas, { a: dest, b: dest.plus(18, 20) }, Colour.WATERING_RECT);

        // Restore canvas transforms to normal.
        canvas.restore();

        // Extra debug displays.
        if (state.debugSettings.showCollisionRects) {
            outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
        }
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
        // No need to show facing rectangle for NPCs since they don't interact with anything (yet).
        // if (state.debugSettings.showFacingRects) {
        //     outlineRect(canvas, shiftRect(this.facingDetectionRect(), shift.x, shift.y), Colour.FACING_RECT);
        // }
    }

    // Compute a displacement that will place the NPC at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, false));
    }

    // Determine the grid tile that is the closest approximation to the NPC's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    // Let the NPC move. Randomly (more or less). Returns new updated version of the NPC.
    move(): NonPlayer {
        let vPixelSpeed: number;
        let hPixelSpeed: number;
        switch (this.mentalState) {
            // A normal NPC moves at a slow speed.
            case MentalState.Normal:
                // NPCs walk faster when avoiding the gardener.
                let multiplier = (this.gardenerAvoidanceCountdown > 0) ? 1.5 : 1;
                vPixelSpeed = NPC_V_PIXEL_SPEED * multiplier;
                hPixelSpeed = NPC_H_PIXEL_SPEED * multiplier;
                break;
            // A frazzled NPC moves faster.
            case MentalState.Frazzled:
                vPixelSpeed = Math.floor(NPC_V_PIXEL_SPEED * 1.5);
                hPixelSpeed = Math.floor(NPC_H_PIXEL_SPEED * 1.5);
                break;
        }
        var delta = [0,0]
        switch (this.facing) {
            case Direction.Down:
            delta = [0, vPixelSpeed];
            break;
            case Direction.Up:
            delta = [0, -vPixelSpeed];
            break;
            case Direction.Left:
            delta = [-hPixelSpeed, 0];
            break;
            case Direction.Right:
            delta = [hPixelSpeed, 0];
             break;
        }
        // Add deltas to NPC position and keep it within the background rectangle.
        let newPos = new Coord(
            (this.pos.x + delta[0] + BACKGROUND_WIDTH) % BACKGROUND_WIDTH,
            (this.pos.y + delta[1] + BACKGROUND_HEIGHT) % BACKGROUND_HEIGHT);
        // Return a clone of this NPC, but with a the new position.
        return new NonPlayer({
            clone: this,
            pos: newPos,
            gardenerAvoidanceCountdown: Math.max(this.gardenerAvoidanceCountdown-1, 0),
        });
    }

    // Make a new version of the NPC that now begins avoiding the gardener.
    startAvoidingGardener(): NonPlayer {
        return new NonPlayer({
            clone: this,
            gardenerAvoidanceCountdown: 150,
            stationeryCountdown: 0,
        });
    }
}

