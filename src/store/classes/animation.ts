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
    frameCount: number;

    constructor(event: Event, startTime: number, frameCount: number) {
        this.event = event;
        this.startTime = startTime;
        this.frameCount = frameCount;
    }
}

export const SUPERNOVA_DELAY = FPS*5;