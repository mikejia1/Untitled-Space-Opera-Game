import { FPS } from "../../utils/constants";

// An enum for event types.
export enum AnimEventType {
    IMPACT,
    GAMEOVER,
    ALARM_1,
    ALARM_2,
    ALARM_3,
}

// Interface for one-off event animations.
export class AnimEvent {
    event: AnimEventType;
    //The start time of the animation as frame number
    startTime: number;
    //Total number of frames in the animation
    finished: boolean;
    //Whether the event has been processed by reducer (potentially triggering other events)
    processed: boolean;

    constructor(event: AnimEventType, startTime: number) {
        this.event = event;
        this.startTime = startTime;
        this.finished = false;
        this.processed = false;
    }
}

export const SUPERNOVA_DELAY = FPS*30;