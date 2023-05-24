import { NonPlayer } from "../entities";
import { IGlobalState, Paintable } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/positions";
import { Coord, computeBackgroundShift, shiftForTile } from "../utils";
import { drawText } from "../utils/drawtext";
import { Tile } from "./tile";

export class Dialog implements Paintable {
    avatar: Coord;
    pos: Coord;
    text: string;
    startFrame: number;
    npcId: number;

    constructor(text: string, startFrame: number, npcId: number) {
        this.pos = new Coord(52, 184);
        this.avatar = new Coord(60, 207);
        this.text = text;
        this.startFrame = startFrame;
        this.npcId = npcId;
    }

    paint(canvas: CanvasRenderingContext2D, state: IGlobalState) : void {
        console.log("npc id!!" + this.npcId);
        let npc : NonPlayer = state.npcs[this.npcId];
        let base: Coord = this.pos;
        canvas.drawImage(
            state.dialogImage,             
            this.pos.x, this.pos.y);
        let lines : string[] = this.text.split('\n');
        npc.paintAtPos(canvas, state, this.avatar);
        for (let i = 0; i < lines.length; i++) {
            drawText(canvas, base.plus(26, 3 + (i * 12)), lines[i]);
        }
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

    draw(ctx: CanvasRenderingContext2D): void {
    }
}
