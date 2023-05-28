import { ColliderType, IGlobalState } from "../store/classes";
import { Direction, Coord, outlineRect, shiftRect, Colour, positionRect, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED, Rect, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, rectanglesOverlap, EJECTION_SHRINK_RATE, dir8ToDeltas, directionCloseToDir8, Dir8 } from "../utils";
import { Gardener } from "./gardener";
import { NonPlayer } from "./nonplayer";
import { CausaMortis, Death } from "./skeleton";

// Murderous space cat
export class Cat extends NonPlayer {
    // Cat colour
    color: number = 0;
    // Initial cat rampage (they are charging at the player)
    rampage: boolean = true;
    startFrame: number = Math.floor(Math.random() * 15);
    death: Death | null;

    constructor(params: any) {
        super(params);
        this.color = params.color;
        this.colliderType = ColliderType.CatCo; // The type of collider that NPCs are.
        this.facing = Dir8.Left;
        this.moving = true;
        this.death = null;
    }

    // Compute sprite size and shift values for air lock ejection. (40 and 0, respectively, when not being ejected)
    ejectionScaleAndShift(): any {
        if (this.death === null) return { scaledSize: 40, shiftToCentre: 0 };
        let scaledSize = (this.death.ejectionScaleFactor !== null) ? this.death.ejectionScaleFactor : 1;
        scaledSize = scaledSize * 40;
        let shiftToCentre = (40 - scaledSize) / 2;  // Maintains sprite centre, despite scaling.
        return { scaledSize: scaledSize, shiftToCentre: shiftToCentre };
    }

    // Paint the NPC on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // The walking animation has 15 frames.
        let frameCount = 15;
        let frame = this.moving ? Math.floor((state.currentFrame + this.startFrame) % (2 * frameCount) / 2) : 0;
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);
        let flip = directionCloseToDir8(Direction.Left, this.facing) || this.facing === Dir8.Up;   // 4 of 8 directions.

        // Determine where, on the canvas, the cat should be painted.
        let dest = flip
            ? new Coord((newPos.x * -1) - 25, newPos.y - 30)
            : new Coord(newPos.x - 14, newPos.y - 30);
        dest = dest.toIntegers();
        let xScale = flip ? -1 : 1;
        canvas.save();
        canvas.scale(xScale, 1);

        // Sprite scale and shift for ejection from air lock.
        let ejection = this.ejectionScaleAndShift();
        let scaledSize = ejection.scaledSize;
        let shiftToCentre = ejection.shiftToCentre;
        
        // Paint gardener sprite for current frame.
        canvas.drawImage(
            state.catImages.run,                                             // Walking base source image
            frame * 40, this.color * 40,                                // Top-left corner of frame in source
            40, 40,                                                     // Size of frame in source
            dest.x + (shiftToCentre * xScale), dest.y + shiftToCentre,  // Position of sprite on canvas
            scaledSize, scaledSize);                                    // Sprite size on canvas
    
        // Restore canvas transforms to normal.
        canvas.restore();

        // Extra debug displays.
        if (state.debugSettings.showCollisionRects) {
            outlineRect(canvas, shiftRect(this.collisionRect(), shift.x, shift.y), Colour.COLLISION_RECT);
        }
        if (state.debugSettings.showPositionRects) {
            outlineRect(canvas, shiftRect(positionRect(this), shift.x, shift.y), Colour.POSITION_RECT);
        }
    }

    deathRect(): Rect {
        return {
            a: this.pos.plus(0, -ENTITY_RECT_HEIGHT*3),
            b: this.pos.plus(ENTITY_RECT_WIDTH*2, 0),
        };
    }

    // Let the NPC move. Randomly (more or less). Returns new updated version of the NPC.
    move(): Cat {
        // Add directional deltas to NPC position and keep it within the background rectangle.
        var delta = dir8ToDeltas(this.facing, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED);
        let newPos = new Coord(
            (this.pos.x + delta[0] + BACKGROUND_WIDTH) % BACKGROUND_WIDTH,
            (this.pos.y + delta[1] + BACKGROUND_HEIGHT) % BACKGROUND_HEIGHT);
        // Return a clone of this NPC, but with a the new position.
        this.pos = newPos;
        return this;
    }

    // Have the cat die.
    dieOf(cause: CausaMortis, time: number) {
        let scale: number | null = (cause === CausaMortis.Ejection) ? 1 : null;
        if (this.death === null) this.death = { cause: cause, time: time, ejectionScaleFactor: scale };
        else {
            // The only death you can inflict *after* having already died is ejection of the corpse through the air lock.
            // In such a case, the cause of death and the time of death remain the same, but ejectionScaleFactor gets set.
            // Additionally, in case ejection death is assigned more than once (for whatever reason) only the first time counts.
            if (cause !== CausaMortis.Ejection) return;             // Only ejection "death" can occur after death.
            if (this.death.ejectionScaleFactor !== null) return;    // Ejection scale factor will not be reset.
            this.death.ejectionScaleFactor = 1;                     // Ejection scale factor starts at 1.
        }
    }
}

export function updateCatState(state: IGlobalState): IGlobalState {
    let cats : Cat[] = [];
    let npcs : NonPlayer[] = [];
    let gardener : Gardener = state.gardener;
    for (let i = 0; i < state.cats.length; i++) {
        let cat = state.cats[i];
        if (rectanglesOverlap(cat.deathRect(), gardener.collisionRect())) {
            gardener.dieOf(CausaMortis.Laceration, state.currentFrame);
        }
        if (cat.death !== null) {
            if (cat.death.ejectionScaleFactor !== null) {
                cat.death.ejectionScaleFactor *= EJECTION_SHRINK_RATE;
            }
        }
        cats = [...cats, state.cats[i].move()]
    }
    let newLastNPCDeath = state.lastNPCDeath;
    state.npcs.forEach(npc => {
        for (let i = 0; i < state.cats.length; i++) {
            let cat = state.cats[i];
            if (rectanglesOverlap(cat.deathRect(), npc.collisionRect())) {
                npc.dieOf(CausaMortis.Laceration, state.currentFrame);
                newLastNPCDeath = state.currentFrame;
                break;
            }
        }
        npcs = [...npcs, npc];
    });
    return {...state, cats: cats, npcs: npcs, lastNPCDeath: newLastNPCDeath, gardener: gardener};
}