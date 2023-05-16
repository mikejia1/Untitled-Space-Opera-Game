import { FPS } from "../../utils/constants";

// An enum for event types.
export enum AnimEventType {
    IMPACT,                 // Supernova impact event.
    GAMEOVER,               // End the game.
    ALARM_1,                // Trigger leftmost shield button alarm.
    ALARM_2,                // Trigger middle shield button alarm.
    ALARM_3,                // Trigger rightmost shield button alarm.
    EARLY_OPEN_SHIELD_1,    // Open leftmost shield early.
    EARLY_OPEN_SHIELD_2,    // Open middle shield early.
    EARLY_OPEN_SHIELD_3,    // Open rightmost shield early.
    SHAKE_STOP,             // Set screen shake back to zero/none.
    SHAKE_LEVEL_1,          // Set screen shake to level 1 (weakest).
    SHAKE_LEVEL_2,          // Set screen shake to level 2.
    SHAKE_LEVEL_3,          // Set screen shake to level 3.
    SHAKE_LEVEL_4,          // Set screen shake to level 4 (strongest).
    BLACK_HOLE_APPEARS,     // Bring black hole into view.
    BH_PULSE_STOP,          // Bring black hole pulse magnitude to zero.
    BH_PULSE_LEVEL_1,       // Bring black hole pulse magnitude to level 1 (weakest).
    BH_PULSE_LEVEL_2,       // Bring black hole pulse magnitude to level 2.
    BH_PULSE_LEVEL_3,       // Bring black hole pulse magnitude to level 3.
    BH_PULSE_LEVEL_4,       // Bring black hole pulse magnitude to level 4 (strongest).
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