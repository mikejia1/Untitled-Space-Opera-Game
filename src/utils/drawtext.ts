import { MONOGRAM_H, MONOGRAM_W, monogramBitmap } from "../store/data/monogram-bitmap";
import { CANVAS_WIDTH } from "./constants";
import { Coord } from "./coord";

export function drawText(canvas : CanvasRenderingContext2D, pos : Coord, text : string, color = "rgba(0,0,0,1)") : void {
    //draw background rect 12px tall, 5px wide per character with 1px spacing to the left. 
    pos = pos.toIntegers();
    //draw text
    for(let i = 0; i < text.length; i++){
        drawLetter(canvas, pos.plus(6*i, 0), text.charAt(i), color);
    }
}


export function drawCenteredText(canvas : CanvasRenderingContext2D, posY : number, text : string, color = "rgba(0,0,0,1)") : void {
    //draw background rect 12px tall, 5px wide per character with 1px spacing to the left. 
    let pos = new Coord((CANVAS_WIDTH - text.length * 6)/2, posY);
    //draw text
    for(let i = 0; i < text.length; i++){
        drawLetter(canvas, pos.plus(6*i, 0), text.charAt(i), color);
    }
}

function drawLetter(canvas : CanvasRenderingContext2D, pos : Coord, char : string, color: string) : void {
    let bitmap : number[] | undefined = monogramBitmap.get(char);
    if (!bitmap) {
        return;
    }
    canvas.fillStyle = color;
    for(let row = 0; row < bitmap.length; row++){
        let base2 = bitmap[row].toString(2);
        let padding = MONOGRAM_W - base2.length;
        for(let col = 0; col < MONOGRAM_W; col++){
            if(col >= padding && base2[col - padding] == "1"){
                canvas.fillRect( pos.x + (MONOGRAM_W - col), pos.y + row, 1, 1 );
            }
        }
    }
}