import { NonPlayer } from "../entities";
import { IGlobalState, Paintable } from "../store/classes";
import { Coord } from "../utils";
import { drawText } from "../utils/drawtext";

export class Dialog implements Paintable {
    avatar: Coord;
    pos: Coord;
    text: string;
    lines: string[];
    totalChars: number;
    startFrame: number;
    skipAnimation: boolean;
    npcId: number;

    constructor(text: string, startFrame: number, npcId: number) {
        this.pos = new Coord(52, 314);
        this.avatar = new Coord(60, 337);
        this.text = text;
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
        let newLines : string[] = [];
        if (!this.skipAnimation){
            let remainingChars = state.currentFrame - this.startFrame;
            for(let i = 0; i < this.lines.length; i++){
                if(remainingChars < this.lines[i].length){
                    newLines = [...newLines, this.lines[i].substring(0, remainingChars)];
                    break;
                }
                remainingChars -= this.lines[i].length;
                newLines = [...newLines, this.lines[i]];
            }
        }
        else {
            newLines = this.lines;
        }
        if(this.lines.length == 1) drawText(canvas, base.plus(26, 9), newLines[0]);
        else newLines.forEach((line, index) => drawText(canvas, base.plus(26, 3 + index * 12), line));
    }
}

// Generate a list of numbers that are random and unique between 1 and length
function generateRandomIndices(length : number) : number[] {
    let used = new Set<number>();
    let indices : number[] = [];
    while(indices.length < length - 1){
        let i = Math.floor(Math.random() * length);
        if(used.has(i)) continue;
        indices = [...indices, i];
        used.add(i); 
    }
    return indices;
}

// feed a random line from list to use as dialog. Returns new list of dialog.
export function feedDialog(state: IGlobalState, lines: string[], npcId: number) : Dialog [] {
    let dialogList : Dialog[] = state.dialogs;
    let randomIndices : number[] = generateRandomIndices(lines.length);
    for(let i = 0; i < lines.length; i++){
        if(state.usedDialogs.has(lines[randomIndices[i]])) continue;
        return [...state.dialogs, new Dialog(lines[randomIndices[i]], state.currentFrame, npcId)];
    }
    return state.dialogs;
}

export function updateDialogState(state : IGlobalState) : IGlobalState {
    if (state.dialogs.length == 0) return state;
    let dialogs : Dialog[] = state.dialogs;
    dialogs[0].skipAnimation = state.currentFrame - dialogs[0].startFrame > dialogs[0].totalChars || dialogs[0].skipAnimation;
    let usedDialogs = state.usedDialogs;
    if(isDialogCurrentlyDisplayed(state)){ 
        usedDialogs.add(dialogs[0].text);
    }
    return { ...state, dialogs: dialogs, usedDialogs: usedDialogs, lastDialogInteraction: state.currentFrame};
}

export function isDialogCurrentlyDisplayed(state : IGlobalState) : boolean {
    if (state.gameover) return false;
    return state.dialogs.length > 0 && state.dialogs[0].startFrame <= state.currentFrame;
}