import { NonPlayer } from "../entities";
import { IGlobalState, Paintable } from "../store/classes";
import { Coord } from "../utils";
import { drawText } from "../utils/drawtext";

export class Dialog implements Paintable {
    avatar: Coord;
    pos: Coord;
    lines: string[];
    totalChars: number;
    startFrame: number;
    skipAnimation: boolean;
    npcId: number;

    constructor(text: string, startFrame: number, npcId: number) {
        this.pos = new Coord(52, 314);
        this.avatar = new Coord(60, 337);
        this.lines = text.split('\n');
        this.totalChars = 0;
        this.lines.forEach((line) => this.totalChars += line.length);
        this.startFrame = startFrame;
        this.skipAnimation = false;
        this.npcId = npcId;
    }

    paint(canvas: CanvasRenderingContext2D, state: IGlobalState) : void {
        if (state.currentFrame < this.startFrame || state.gameover) return;
        let npc : NonPlayer = state.npcs[this.npcId];
        let base: Coord = this.pos;
        canvas.drawImage(
            state.uiImages.dialogBox,             
            this.pos.x, this.pos.y);
        npc.paintAtPos(canvas, state, this.avatar);
        if (this.skipAnimation){
            this.lines.forEach((line, index) => drawText(canvas, base.plus(26, 3 + index * 12), line));
        }
        else {
            let remainingChars = state.currentFrame - this.startFrame;
            let newLines : string[] = [];
            for(let i = 0; i < this.lines.length; i++){
                if(remainingChars < this.lines[i].length){
                    newLines = [...newLines, this.lines[i].substring(0, remainingChars)];
                    break;
                }
                remainingChars -= this.lines[i].length;
                newLines = [...newLines, this.lines[i]];
            }
            newLines.forEach((line, index) => drawText(canvas, base.plus(26, 3 + index * 12), line));
        }
    }
}

export function updateDialogState(state : IGlobalState) : IGlobalState {
    if (state.dialogs.length == 0) return state;
    let dialogs : Dialog[] = state.dialogs;
    dialogs[0].skipAnimation = state.currentFrame - dialogs[0].startFrame > dialogs[0].totalChars || dialogs[0].skipAnimation;
    return { ...state, dialogs: dialogs, lastDialogInteraction: state.currentFrame};
}

export function isDialogCurrentlyDisplayed(state : IGlobalState) : boolean {
    if (state.gameover) return false;
    return state.dialogs.length > 0 && state.dialogs[0].startFrame <= state.currentFrame;
}