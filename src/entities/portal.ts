import { Tile } from "../scene";
import { IGlobalState, Paintable } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/positions";
import { Colour, Coord, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, Rect, SHAKE_CAP, computeBackgroundShift, outlineRect, shiftForTile, shiftRect } from "../utils";

export const PORTAL_X = 310;
export const PORTAL_Y = 200;

export const PHASE_FRAMES = 24;

export class Portal implements Paintable {
    pos: Coord;
    spawnTimestamp: number;
    openTime: number;
    
    constructor(spawnTime : number, openTime : number) {
        this.pos = new Coord(PORTAL_X, PORTAL_Y);
        this.spawnTimestamp = spawnTime;
        this.openTime = openTime;
    }
    
    paint (canvas: CanvasRenderingContext2D, state: IGlobalState) {
        if(state.currentFrame < this.spawnTimestamp) return;
        let scale = this.getPortalScale(state.currentFrame - this.spawnTimestamp);
        let shift = this.computeShift(state);
        let spriteFrame = state.currentFrame % 120;
        let pos = this.pos.plus(shift.x, shift.y);
        let spriteSize = Math.floor(128 * scale);
        let scaleOffset = new Coord(64 - spriteSize / 2, 64 - spriteSize / 2 );
        pos = pos.plus(scaleOffset.x, scaleOffset.y).toIntegers();

        canvas.drawImage(
            state.portalImage,                              // Portal base image
            spriteFrame * 128, 0,                               // Top-left corner of frame in source
            128, 128,                                     // Size of frame in source
            pos.x, pos.y,                                 // Position of sprite on canvas. 
            spriteSize, spriteSize);             

        // Extra debug displays.
        if (state.debugSettings.showCollisionRects) {
            outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
        }
    
    }

    getPortalScale(timeFrame : number) : number {
        if(timeFrame > this.openTime) return 0;
        if(timeFrame > this.openTime - PHASE_FRAMES) {
            return this.getOpeningPortalScaleFactor(this.openTime - timeFrame);
        }
        else return this.getOpeningPortalScaleFactor(timeFrame);
    }
    
    getOpeningPortalScaleFactor(timeFrame: number) : number {
        let scale = 1;
        if(timeFrame < PHASE_FRAMES) {
            scale = timeFrame / PHASE_FRAMES;
        } 
        return scale;
    }

    // Determine the grid tile that is the closest approximation to the Gardener's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }

    // Compute a displacement that will place the Plant at the correct place on the canvas.
    computeShift(state: IGlobalState): Coord {
    return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, SHAKE_CAP));
    }

    collisionRect(): Rect {
        return {
          a: this.pos.plus(60, 10),
          b: this.pos.plus(100, 120),
        }
    }
}

// Return null portal if portal animation has expired
export function updatePortalState(state: IGlobalState) : IGlobalState {
    if(state.portal != null && state.currentFrame - state.portal.spawnTimestamp > state.portal.openTime) {
        return {
            ...state,
            portal: null
        }
    }
    else return state;
}