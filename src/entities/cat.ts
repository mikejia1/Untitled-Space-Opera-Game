import { ColliderType, IGlobalState } from "../store/classes";
import { Direction, Coord, outlineRect, shiftRect, Colour, positionRect, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED, Rect, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, rectanglesOverlap, EJECTION_SHRINK_RATE, dir8ToDeltas, directionCloseToDir8, Dir8, FPS, randomDir8, adjacentRandomDir8, ALL_DIR8S, rectangleContained } from "../utils";
import { Gardener } from "./gardener";
import { NonPlayer, RESPAWN_DELAY } from "./nonplayer";
import { CausaMortis, Death } from "./skeleton";

// Murderous space cat
export class Cat extends NonPlayer {
    // Cat colour
    color: number = 0;
    // Initial cat rampage (they are charging at the player)
    withinCatZone: boolean = false;
    startFrame: number = Math.floor(Math.random() * 15);
    // Cats are invisible before they exit the portal.
    invisible: boolean = true;
    // Frame time of last attack
    attackFrame: number;
    death: Death | null;

    constructor(params: any) {
        super(params);
        this.color = params.color;
        this.colliderType = ColliderType.CatCo; // The type of collider that NPCs are.
        this.facing = Dir8.Left;
        this.moving = true;
        this.death = null;
        this.attackFrame = 0;
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
        if(this.invisible)  return;
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

        let image = state.catImages.run;
        if(state.currentFrame - this.attackFrame < 8){
            frame = Math.floor(( state.currentFrame - this.attackFrame ) / 2);
            image = state.catImages.attack;
        }

        if(this.death !== null && this.death.cause === CausaMortis.Liquification){
            image = state.catImages.death;
            frame = Math.min(11, Math.floor(( state.currentFrame - this.death.time ) / 2));
        }
        
        //paint fade out if cat is dead.
        canvas.globalAlpha = this.deathFadeAlpha(state);// * 0.75;

        // Paint gardener sprite for current frame.
        canvas.drawImage(
            image,                                            // Walking base source image
            frame * 40, this.color * 40,                                // Top-left corner of frame in source
            40, 40,                                                     // Size of frame in source
            dest.x + (shiftToCentre * xScale), dest.y + shiftToCentre,  // Position of sprite on canvas
            scaledSize, scaledSize);                                    // Sprite size on canvas
    
        // Restore canvas transforms to normal.
        canvas.restore();

        //Cat zone box
        //outlineRect(canvas, shiftRect(catZone(), shift.x, shift.y), Colour.COLLISION_RECT);
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
            a: this.pos.plus(0, -ENTITY_RECT_HEIGHT),
            b: this.pos.plus(ENTITY_RECT_WIDTH, 0),
        };
    }

    // Let the NPC move. Randomly (more or less). Returns new updated version of the NPC.
    move(): Cat {
        let oldPos : Coord = this.pos;
        // Select a new direction on average every 5 seconds.
        if (this.withinCatZone && Math.random() < 1 / (3 * FPS)) {
            this.facing = adjacentRandomDir8(this.facing);
        }
        // Add directional deltas to NPC position and keep it within the background rectangle.
        var delta = dir8ToDeltas(this.facing, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED);
        this.pos = new Coord(
            (this.pos.x + delta[0]),
            (this.pos.y + delta[1]));
        // Check to see if newPos is still within bounds. Change direction/movement if not.
        while(this.withinCatZone && !rectangleContained(catZone(), this.collisionRect())){
            this.pos = oldPos;
            this.facing = ALL_DIR8S[Math.floor(Math.random()*8)];
            delta = dir8ToDeltas(this.facing, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED);
            this.pos = new Coord(
                (this.pos.x + delta[0]),
                (this.pos.y + delta[1]));
        }
        // Return a clone of this NPC, but with a the new position.
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

// Rect within which cats are allowed to roam.
function catZone() : Rect {
    return {
        a: new Coord(20, 190),
        b: new Coord(BACKGROUND_WIDTH-30, BACKGROUND_HEIGHT - 60),
    };
}

export function updateCatState(state: IGlobalState): IGlobalState {
    let cats : Cat[] = [];
    let npcs : NonPlayer[] = [];
    let gardener : Gardener = state.gardener;
    for (let i = 0; i < state.cats.length; i++) {
        let cat = state.cats[i];
        // Skip update if cat is dead
        if (cat.death !== null) {
            if (cat.death.ejectionScaleFactor !== null) {
                cat.death.ejectionScaleFactor *= EJECTION_SHRINK_RATE;
            }
            if(state.currentFrame < cat.death.time + RESPAWN_DELAY) {
                cats = [...cats, cat];
            }
            continue;
        }
        // Kill gardener if cat is attacking
        if (rectanglesOverlap(cat.deathRect(), gardener.collisionRect())) {
            // If previous attack frame has expired
            if (state.currentFrame - cat.attackFrame > 8) 
                cat.attackFrame = state.currentFrame;
            gardener.dieOf(CausaMortis.Laceration, state.currentFrame);
        }
        cat.withinCatZone = rectangleContained(catZone(), cat.collisionRect());
        cat = cat.move();
        // Hide cat if in portal
        cat.invisible = state.portal!= null && rectanglesOverlap(state.portal.collisionRect(), cat.collisionRect()); 
        cats = [...cats, cat]
    }
    let newLastNPCDeath = state.lastNPCDeath;
    state.npcs.forEach(npc => {
        for (let i = 0; i < state.cats.length; i++) {
            let cat = state.cats[i];
            if (cat.death !== null) continue;
            if (rectanglesOverlap(cat.deathRect(), npc.collisionRect())) {
                // If previous attack frame has expired
                if (state.currentFrame - cat.attackFrame > 8) 
                    cat.attackFrame = state.currentFrame;
                npc.dieOf(CausaMortis.Laceration, state.currentFrame);
                newLastNPCDeath = state.currentFrame;
                break;
            }
        }
        npcs = [...npcs, npc];
    });
    return {...state, cats: cats, npcs: npcs, lastNPCDeath: newLastNPCDeath, gardener: gardener};
}


// Create a grid of NPCs with top-left one at given position, and with given spacing.
export function gridOfCats(pos: Coord, spacing: number, cols: number, rows: number): Cat[] {
    let all: Cat[] = [];
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        let randX = Math.floor(Math.random() * 8);
        let randY = Math.floor(Math.random() * 8);
        let deltaX = col * spacing;
        let deltaY = (col % 2 == 1) ? row * spacing : row * spacing + Math.floor (spacing /2);
        let cat = new Cat({
          colliderId: -1,                                   // Dummy value. Will assign proper value when cat invation actually begins.
          pos: pos.plus(deltaX + randX, deltaY + randY), 
          color: Math.floor(Math.random() * 5),
          id: (rows * col) + row,
        });
        all = [...all, cat];
      }
    }
    return all;
}