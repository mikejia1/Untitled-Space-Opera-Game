import { gridOfCats } from "../../entities/cat";
import { Portal } from "../../entities/portal";
import { ShieldButton } from "../../entities/shieldbutton";
import { INTER_SLAT_DELAY } from "../../entities/shielddoor";
import { CausaMortis } from "../../entities/skeleton";
import { BlackHole, PULSE_INTENSE, PULSE_MEDIUM, PULSE_MILD, PULSE_SUBTLE } from "../../scene";
import { Coord, SHAKER_INTENSE, SHAKER_MEDIUM, SHAKER_MILD, SHAKER_NO_SHAKE, SHAKER_SUBTLE, computeCurrentFrame, randomInt } from "../../utils";
import { CANVAS_WIDTH, FPS } from "../../utils/constants";
import { IGlobalState } from "./globalstate";

// An enum for event types.
export enum AnimEventType {
    IMPACT,                 // Supernova impact event.
    GAMEOVER_REPLAY_FRAME,  // End the game.
    ALARM_1,                // Trigger leftmost shield button alarm.
    ALARM_2,                // Trigger middle shield button alarm.
    ALARM_3,                // Trigger rightmost shield button alarm.
    OPEN_CAT_PORTAL,      // Open the cat portal for 30 cats. 
    CAT_INVASION_1,         // 2 cat invasion.
    CAT_INVASION_2,         // 5 cat invasion.
    CAT_INVASION_3,         // 30 cat invasion.
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
    SLINGSHOT_ALLOWED,      // Allow planetary slingshot events to initiate.
    SLINGSHOT_FORBIDDEN,    // Prevent planetary slingshot events from initiating.
    PLANET_SPAWN_ALLOWED,   // Allow new drifting planets to be spawned.
    PLANET_SPAWN_FORBIDDEN, // Prevent new drifting planets from being spawned.
}

// Interface for one-off event animations.
export class AnimEvent {
    event: AnimEventType;
    //The start time of the animation as frame number
    startTime: number;
    //Total number of frames in the animation
    finished: boolean;

    constructor(event: AnimEventType, startTime: number) {
        this.event = event;
        this.startTime = startTime;
        this.finished = false;
    }
}

export const SUPERNOVA_DELAY = FPS*300;

export function updateAnimEventState(state: IGlobalState) : IGlobalState {
  let newPlants = state.plants;
  let newShield = state.shieldDoors;
  let newShaker = state.screenShaker;
  let newLastNPCDeath = state.lastNPCDeath;
  let newSlingshotAllowed = state.slingshotAllowed;
  let newPlanetSpawnAllowed = state.planetSpawnAllowed;
  let gardener = state.gardener;
  let npcs = state.npcs;
  let newBlackHole: BlackHole | null = state.blackHole;
  if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
  // Remove finished events.
  let newActiveEvents: AnimEvent[] = [...state.activeEvents.filter(animEvent => !animEvent.finished)];
  let newPendingEvents: AnimEvent[] = [];
  // Events triggered when processing active events.
  let triggeredEvents: AnimEvent[] = [];
  let gameover: boolean = state.gameover;
  let newShieldButtons: ShieldButton[] = state.shieldButtons;
  let gameoverFrame = state.gameoverFrame;
  let portal = state.portal;
  let cats = state.cats;
  let colliderId = state.nextColliderId;

  // Process active events
  for (let i = 0; i < state.pendingEvents.length; i++){
    const event = state.pendingEvents[i];
    // If start time has not arrived, return pending event to list. 
    if (event.startTime > state.currentFrame) {
        newPendingEvents = [...newPendingEvents, event];
        continue;
    }
    // Process event and add to active events. 
    newActiveEvents = [...newActiveEvents, event];
    if (event.event == AnimEventType.IMPACT){
      // If IMPACT occurs without all shield doors being closed, trigger GAMEOVER event.
      if (!state.shieldDoors.allDoorsClosed()) {
        gardener.dieOf(CausaMortis.Incineration, state.currentFrame + 24);
        npcs.forEach(npc => npc.dieOf(CausaMortis.Incineration, state.currentFrame + 24));
        newLastNPCDeath = state.currentFrame + 24;
        for (let i = 0; i < newPlants.length; i++){
          newPlants[i].health = 0;
        }
      } else {
        // Otherwise, go ahead and tell all three shield doors to open early - the danger has passed.
        triggeredEvents = [
          ...triggeredEvents,
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD_1, event.startTime + 30),
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD_2, event.startTime + 30 + (INTER_SLAT_DELAY * 4)),
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD_3, event.startTime + 30 + (INTER_SLAT_DELAY * 8)),
        ];
      }
    }
    if(event.event == AnimEventType.OPEN_CAT_PORTAL){
      portal = new Portal(state.currentFrame, 140);
      event.finished = true;
    }    
    if(event.event == AnimEventType.CAT_INVASION_1){
      cats = gridOfCats(colliderId, new Coord(380, 245), 20, 2, 1);
      colliderId += 2;
      event.finished = true;
    }
    if(event.event == AnimEventType.CAT_INVASION_2){
      cats = gridOfCats(colliderId, new Coord(380, 245), 20, 3, 2);
      colliderId += 6;
      event.finished = true;
    }
    if(event.event == AnimEventType.CAT_INVASION_3){
      cats = gridOfCats(colliderId, new Coord(380, 245), 20, 10, 3);
      colliderId += 30;
      event.finished = true;
    }
    if(event.event == AnimEventType.ALARM_1){
      newShieldButtons[0] = newShieldButtons[0].startAlarm(state);
      event.finished = true;
    }
    if(event.event == AnimEventType.ALARM_2){
      newShieldButtons[1] = newShieldButtons[1].startAlarm(state);
      event.finished = true;
    }
    if(event.event == AnimEventType.ALARM_3){
      newShieldButtons[2] = newShieldButtons[2].startAlarm(state);
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_1) {
      newShield = newShield.openDoorEarly(0);
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_2) {
      newShield = newShield.openDoorEarly(1);
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_3) {
      newShield = newShield.openDoorEarly(2);
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_STOP) {
      newShaker = SHAKER_NO_SHAKE; // new Shaker(0, 0);
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_1) {
      newShaker = SHAKER_SUBTLE; // new Shaker(0.005, 0.008);
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_2) {
      newShaker = SHAKER_MILD; // new Shaker(0.05, 0.04);
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_3) {
      newShaker = SHAKER_MEDIUM; // new Shaker(0.5, 0.2);
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_4) {
      newShaker = SHAKER_INTENSE; // new Shaker(5, 1);
      event.finished = true;
    }
    if (event.event == AnimEventType.BLACK_HOLE_APPEARS) {
      console.log("Handling BLACK_HOLE_APPEARS event");
      let offCentre = randomInt(-75, 75);
      newBlackHole = new BlackHole(
        new Coord(((CANVAS_WIDTH - 512) / 2) + offCentre, -345),  // Position of black hole.
        computeCurrentFrame(),                                    // Time at which it first appears.
        0,                                                        // Starting pulse magnitude.
        0);                                                       // Target pulse magnitude.
      event.finished = true;
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_1) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_SUBTLE);
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_2) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_MILD);
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_3) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_MEDIUM);
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_4) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_INTENSE);
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_STOP) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(0);
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.SLINGSHOT_ALLOWED) {
        newSlingshotAllowed = true;
        event.finished = true;
    }
    if (event.event === AnimEventType.SLINGSHOT_FORBIDDEN) {
        newSlingshotAllowed = false;
        event.finished = true;
    }
    if (event.event === AnimEventType.PLANET_SPAWN_ALLOWED) {
        newPlanetSpawnAllowed = true;
        event.finished = true;
    }
    if (event.event === AnimEventType.PLANET_SPAWN_FORBIDDEN) {
        newPlanetSpawnAllowed = false;
        event.finished = true;
    }
    // This event should only ever triggered via the Gardener update method.
    if (event.event == AnimEventType.GAMEOVER_REPLAY_FRAME){
        console.log("GAME OVER");
        gameover = true;
        gameoverFrame = state.currentFrame;
        // clear remaining events.
        newPendingEvents = [];
        triggeredEvents = [];
    }
  }
  return {
    ...state, 
    gardener : gardener,
    npcs: npcs,
    cats: cats,
    portal: portal,
    nextColliderId: colliderId,
    plants: newPlants, 
    shieldDoors: newShield, 
    screenShaker: newShaker, 
    blackHole: newBlackHole, 
    activeEvents: newActiveEvents, 
    pendingEvents: [...newPendingEvents, ...triggeredEvents], 
    gameover: gameover,
    gameoverFrame: gameoverFrame,
    shieldButtons: newShieldButtons,
    lastNPCDeath: newLastNPCDeath,
    slingshotAllowed: newSlingshotAllowed,
    planetSpawnAllowed: newPlanetSpawnAllowed,
  };
}

export const GAMEOVER_RESTART_TIME = 5*FPS;