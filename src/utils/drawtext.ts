import { MONOGRAM_H, MONOGRAM_W, monogramBitmap } from "../store/data/monogram-bitmap";
import { Coord } from "./coord";

export function drawTextDialog(canvas : CanvasRenderingContext2D, pos : Coord, text : string) : void {
    //draw background rect 12px tall, 5px wide per character with 1px spacing to the left. 
    canvas.fillStyle = "rgba(255,255,255,1)";
    canvas.fillRect(pos.x, pos.y, MONOGRAM_W*text.length + 1, MONOGRAM_H);
    pos = pos.toIntegers();
    //draw text
    for(let i = 0; i < text.length; i++){
        drawLetter(canvas, pos.plus(6*i, 0), text.charAt(i));
    }
}

function drawLetter(canvas : CanvasRenderingContext2D, pos : Coord, char : string) : void {
    let bitmap : number[] | undefined = monogramBitmap.get(char);
    if (!bitmap) {
        return;
    }
    canvas.fillStyle = "rgba(0,0,0,1)";
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