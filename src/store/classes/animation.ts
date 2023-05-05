import { FPS } from "../../utils/constants";

// An enum for event types.
export enum Event {
    IMPACT,
}

// Interface for one-off event animations.
export class AnimEvent {
    event: Event;
    //The start time of the animation as frame number
    startTime: number;
    //Total number of frames in the animation
    finished: boolean;

    constructor(event: Event, startTime: number) {
        this.event = event;
        this.startTime = startTime;
        this.finished = false;
    }
}

export const SUPERNOVA_DELAY = FPS*5;