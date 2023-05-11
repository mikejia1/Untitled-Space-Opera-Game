import { ColliderType, IGlobalState } from "../store/classes";
import { Direction, Coord, outlineRect, shiftRect, Colour, positionRect, NPC_V_PIXEL_SPEED, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, CAT_H_PIXEL_SPEED, CAT_V_PIXEL_SPEED, NPC_H_PIXEL_SPEED } from "../utils";
import { NonPlayer } from "./nonplayer";

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