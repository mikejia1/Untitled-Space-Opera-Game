import { NonPlayer } from "../entities";
import { Coin } from "../entities/coin";
import { Paintable, IGlobalState } from "../store/classes";
import { Coord, computeCurrentFrame } from "../utils";
import { drawText } from "../utils/drawtext";

export const FLASH_SPEED = 16;

export class StatusBar implements Paintable {
    coin: Coin;
    pos: Coord;
    totalCoins: number;
    flashPosX: number;
    // Coins that have yet to be added to the total.
    newCoins: number;
    // Coins that have yet to be subtracted from the total.
    lostCoins: number;

    constructor() {
        this.pos = new Coord(0, 0);
        this.coin = new Coin (new Coord(20, 8) , computeCurrentFrame());
        this.totalCoins = 0;
        this.flashPosX = 0;
        this.newCoins = 0;
        this.lostCoins = 0;
    }

    getMeterColor(state: IGlobalState) : string {

        let oxygen = Math.min(state.oxygen.level, 100);
        let r = 0;
        let g = 168;
        let b = 243;
        if(oxygen < 50 && oxygen >= 25){
            // 5 iterations to yellow: rgba(255,255,0,1)
            let step = 50 - oxygen;
            r = Math.min(255, r + 52*step);
            g = Math.min(255, g + 18*step);
            b = Math.max(0, b - 50*step);
        }
        if(oxygen < 25){
            // 10 iterations to red: rgba(255,0,0,1)
            r = 255;
            g = 255;
            b = 0;
            let step = 25 - oxygen;
            g = Math.max(0, g - 26*step);
        }
        return `rgba(${r},${g},${b},1)`;
    }

    paint(canvas: CanvasRenderingContext2D, state: IGlobalState) : void {
        let meterStart = 19;
        let meterEnd = 292;
        
        // Paint oxymeter black background
        canvas.save();
        canvas.beginPath();
        canvas.fillStyle = `rgba(0,0,0,1)`;
        canvas.rect(0,0, meterEnd, 20);
        canvas.fill();
        canvas.restore();

        // Paint oxymeter reading.
        let oxygen = Math.min(state.oxygen.level, 100);
        let oxyReading: number = Math.floor((meterEnd - meterStart) * oxygen / 100);
        canvas.save();
        canvas.beginPath();
        canvas.fillStyle = this.getMeterColor(state);
        canvas.rect(meterStart, 0, oxyReading, 20);
        canvas.fill();
        canvas.restore();
        
        // Paint reflection highlight. 
        canvas.save();
        canvas.beginPath();
        canvas.fillStyle = `rgba(255,255,255,1)`;
        canvas.rect(meterStart + 1,  8, meterEnd - meterStart - 2, 1);
        canvas.fill();

        canvas.restore();

        // Paint flash every 3 seconds
        if(this.flashPosX > 0){
            canvas.drawImage(state.uiImages.oxymeterFlash, this.flashPosX, 0);
        }

        // Darken oxymeter bar
        canvas.save();
        canvas.beginPath();
        canvas.fillStyle = `rgba(0,0,0,0.5)`;
        canvas.rect(meterStart + oxyReading + 1, 0, meterEnd - oxyReading - meterStart -1, 20);
        canvas.fill();
        canvas.restore();

        // Paint status bar
        canvas.drawImage(state.uiImages.oxymeter, 0, 0);

        // Paint coin sprite
        this.coin.paintAtPos(canvas, state, new Coord(3, 24));

        // Paint coin count
        drawText(canvas, new Coord(18, 15), this.totalCoins.toString());
    }
    
    updateStatusBarState(state : IGlobalState) : IGlobalState {
        this.flashPosX += FLASH_SPEED;
        if (this.flashPosX > 270) {
            this.flashPosX = - FLASH_SPEED * 24 * 4;
        }
        let waiting = (this.newCoins > 0) || (this.lostCoins > 0);
        if (state.currentFrame % 2 == 0 && waiting) {
            if (this.newCoins > 0) {
                this.totalCoins++;
                this.newCoins--;
            } else {
                this.totalCoins--;
                this.lostCoins--;
            }
        }
        return {...state, statusBar: this };
    }
}