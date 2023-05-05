import { IGlobalState } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { Coord } from "../utils";

enum ShieldDoorState {OPENING, CLOSING, OPEN, CLOSED}

export class ShieldDoor implements Paintable {
    // Unused coords
    pos: Coord;
    // There are 3 shield doors
    sheildDoorStates: ShieldDoorState[];
    
    constructor() {
        this.pos = new Coord(0,0);
        this.sheildDoorStates = [ShieldDoorState.CLOSED, ShieldDoorState.CLOSED, ShieldDoorState.CLOSED];
    }

    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        //paint doors
    }

    allDoorsClosed(): boolean {
        return this.sheildDoorStates.every((state) => state == ShieldDoorState.CLOSED);
    }
}