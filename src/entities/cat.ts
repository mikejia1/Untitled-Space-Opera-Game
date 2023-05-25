import { ColliderType, IGlobalState } from "../store/classes";
import { Direction, Coord, outlineRect, shiftRect, Colour, positionRect, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED, Rect, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, rectanglesOverlap } from "../utils";
import { Gardener } from "./gardener";
import { NonPlayer } from "./nonplayer";
import { CausaMortis } from "./skeleton";

// Murderous space cat
export class Cat extends NonPlayer {
    // cat colour
    color: number = 0;
    // initial cat rampage (they are charging at the player)
    rampage: boolean = true;
    startFrame: number = Math.floor(Math.random() * 15);

    constructor(params: any) {
        super(params);
        this.color = params.color;
        this.colliderType = ColliderType.CatCo; // The type of collider that NPCs are.
        this.facing = Direction.Left;
        this.moving = true;
    }

    // Paint the NPC on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // The walking animation has 15 frames.
        let frameCount = 15;
        let frame = this.moving ? Math.floor((state.currentFrame + this.startFrame) % (2 * frameCount) / 2) : 0;
        let shift = this.computeShift(state);
        let newPos = this.pos.plus(shift.x, shift.y);
        let flip = (this.facing === Direction.Left);

        // Determine where, on the canvas, the cat should be painted.
        let dest = flip
            ? new Coord((newPos.x * -1) - 25, newPos.y - 30)
            : new Coord(newPos.x - 14, newPos.y - 30);
        dest = dest.toIntegers();
        canvas.save();
        canvas.scale(flip ? -1 : 1, 1);
        
        // Paint gardener sprite for current frame.
        canvas.drawImage(
            state.catImage,                    // Walking base source image
            frame * 40, this.color * 40,             // Top-left corner of frame in source
            40, 40,                            // Size of frame in source
            dest.x, dest.y,                    // Position of sprite on canvas
            40, 40);                           // Sprite size on canvas
    
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
        var delta = [0,0]
        switch (this.facing) {
            case Direction.Down:
            delta = [0, CAT_V_PIXEL_SPEED];
            break;
            case Direction.Up:
            delta = [0, -CAT_V_PIXEL_SPEED];
            break;
            case Direction.Left:
            delta = [-CAT_H_PIXEL_SPEED, 0];
            break;
            case Direction.Right:
            delta = [0, 0];
                break;
        }
        // Add deltas to NPC position and keep it within the background rectangle.
        let newPos = new Coord(
            (this.pos.x + delta[0] + BACKGROUND_WIDTH) % BACKGROUND_WIDTH,
            (this.pos.y + delta[1] + BACKGROUND_HEIGHT) % BACKGROUND_HEIGHT);
        // Return a clone of this NPC, but with a the new position.
        this.pos = newPos;
        return this;
    }

}

export function updateCatState(state: IGlobalState): IGlobalState {
    let cats : Cat[] = [];
    let npcs : NonPlayer[] = [];
    let gardener : Gardener = state.gardener;
    for(let i = 0; i < state.cats.length; i++){
        let cat = state.cats[i];
        /*
        //check if cat has touched an npc
        
        //check if cat has touched the player
        */
        if(rectanglesOverlap(cat.deathRect(), gardener.collisionRect())){
            gardener.death = {time: state.currentFrame, cause: CausaMortis.Laceration};
        }
        cats = [...cats, state.cats[i].move()]
    }
    state.npcs.forEach(npc => {
        for(let i = 0; i < state.cats.length; i++){   
            let cat = state.cats[i];
            if(rectanglesOverlap(cat.deathRect(), npc.collisionRect())){
                npc.death = {time: state.currentFrame, cause: CausaMortis.Laceration};
                break;
            }
        }
        npcs = [...npcs, npc];
    });
    return {...state, cats: cats, npcs: npcs, gardener: gardener};
}