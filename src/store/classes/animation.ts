import { Portal } from "../../entities/portal";
import { ShieldButton } from "../../entities/shieldbutton";
import { INTER_SLAT_DELAY } from "../../entities/shielddoor";
import { CausaMortis } from "../../entities/skeleton";
import { BlackHole, GameScreen, NUM_ASTEROIDS } from "../../scene";
import { Planet, PlanetType } from "../../scene/planet";
import { Coord, SHAKER_NO_SHAKE, computeCurrentFrame, randomInt } from "../../utils";
import { CANVAS_WIDTH, DRIFTER_COUNT, FPS } from "../../utils/constants";
import { IGlobalState } from "./globalstate";
import { feedDialog } from "../../scene/dialog";

// An enum for event types.

export enum AnimEventType {
    IMPACT,                     // Supernova impact event.
    GAMEOVER_REPLAY_FRAME,      // End the game.
    ALARM,                      // Trigger one of the blast shield button alarms.
    DIALOG,                     // Triggers dialog.
    OPEN_CAT_PORTAL,            // Open the cat portal for 30 cats. 
    CAT_INVASION,               // Initiate a cat invation.
    EARLY_OPEN_SHIELD,          // Open one of the blast shield doors early.
    SHAKE,                      // Alter the setting for the screen shake.
    BLACK_HOLE_APPEARS,         // Bring black hole into view.
    BLACK_HOLE_PULSE,           // Alter the pulse settings for the black hole.
    SCORCHING_STAR_SLINGSHOT,   // Introduce a "star" type drifting planet that we will slingshot around.
    DRIFT_PLANET,               // Schedule a specific planet to drift by at a specific time.
    MIND_FLAYER_PLANET,         // We orbit and slingshot around the mind-warping Cthulhu evil planet.
    ASTEROIDS_BEGIN,            // Begin flying through an asteroid swarm / field.
    ASTEROIDS_END,              // No more new asteroids - i.e. we start coming out of the swarm / field.
    OUTRO_TRIGGER,              // Transition from GameScreen.PLAY to GameScreen.OUTRO. Player has completed the game.
}

// Interface for one-off event animations.
export class AnimEvent {
    event: AnimEventType;
    // The start time of the animation as frame number
    startTime: number;
    // Total number of frames in the animation
    finished: boolean;
    // Arbitrary payload with extra info / parameters for the event.
    payload: any;

    constructor(event: AnimEventType, startTime: number, payload: any = null) {
        this.event = event;
        this.startTime = startTime;
        this.finished = false;
        this.payload = payload;
    }
}

export const SUPERNOVA_DELAY = FPS*300;

export function updateAnimEventState(state: IGlobalState) : IGlobalState {
  let newGameScreen = state.gameScreen;
  let newOutroShipShiftStart = state.outroShipShiftStart;
  let newPlants = state.plants;
  let newShield = state.shieldDoors;
  let newShaker = state.screenShaker;
  let newLastNPCDeath = state.lastNPCDeath;
  let newSlingshotAllowed = state.slingshotAllowed;
  let newPlanetSpawnAllowed = state.planetSpawnAllowed;
  let newDrifters = state.drifters;
  let newAsteroids = state.asteroids;
  let newAsteroidsStillGoing = state.asteroidsStillGoing;
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
  let randomCabinFeverAllowed = state.randomCabinFeverAllowed;
  let dialogs = state.dialogs;

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
    if (event.event === AnimEventType.IMPACT){
      // If IMPACT occurs without all shield doors being closed, trigger GAMEOVER event.
      if (!state.shieldDoors.allDoorsClosed()) {
        gardener.dieOf(CausaMortis.Incineration, state.currentFrame);
        npcs.forEach(npc => npc.dieOf(CausaMortis.Incineration, state.currentFrame));
        newLastNPCDeath = state.currentFrame + 24;
        for (let i = 0; i < newPlants.length; i++){
          newPlants[i].health = 0;
        }
        triggeredEvents = [
          ...triggeredEvents,
          new AnimEvent(AnimEventType.SHAKE, state.currentFrame, SHAKER_NO_SHAKE),
        ];
      } else {
        // Otherwise, go ahead and tell all three shield doors to open early - the danger has passed.
        triggeredEvents = [
          ...triggeredEvents,
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD, event.startTime + 30,                              0),
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD, event.startTime + 30 + (INTER_SLAT_DELAY * 4),     1),
          new AnimEvent(AnimEventType.EARLY_OPEN_SHIELD, event.startTime + 30 + (INTER_SLAT_DELAY * 8),     2),
        ];
      }
    }
    if (event.event === AnimEventType.DIALOG) {
      // payload is a list of potential npc strings.
      dialogs = feedDialog(state, event.payload, state.npcs[0].id);
    }
    if (event.event === AnimEventType.MIND_FLAYER_PLANET) {
      newDrifters = slingshotMindFlayerPlanet(state, newDrifters);
      event.finished = true;
      randomCabinFeverAllowed = true;
    }
    if (event.event === AnimEventType.OPEN_CAT_PORTAL) {
      portal = new Portal(state.currentFrame, 140);
      event.finished = true;
    }
    if (event.event === AnimEventType.CAT_INVASION) {
        if (event.payload != null) {
            cats = event.payload;
            for (let i = 0; i < cats.length; i++) {
                cats[i].colliderId = colliderId;
                colliderId += 1;
            }
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.ALARM) {
        if (event.payload !== null) {
            newShieldButtons[event.payload] = newShieldButtons[event.payload].startAlarm(state);
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.EARLY_OPEN_SHIELD) {
        if (event.payload !== null) {
            newShield = newShield.openDoorEarly(event.payload);
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.SHAKE) {
        if (event.payload !== null) {
            newShaker = event.payload;
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.BLACK_HOLE_APPEARS) {
      console.log("Handling BLACK_HOLE_APPEARS event");
      let offCentre = randomInt(-75, 75);
      newBlackHole = new BlackHole(
        new Coord(((CANVAS_WIDTH - 512) / 2) + offCentre, -345),  // Position of black hole.
        computeCurrentFrame(),                                    // Time at which it first appears.
        0,                                                        // Starting pulse magnitude.
        0);                                                       // Target pulse magnitude.
      event.finished = true;
    }
    if (event.event === AnimEventType.BLACK_HOLE_PULSE) {
        if ((newBlackHole !== null) && (event.payload !== null)) {
            newBlackHole = newBlackHole.setTargetPulseMagnitude(event.payload);
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.SCORCHING_STAR_SLINGSHOT) {
        let ss = state.planets.get(PlanetType.STAR)?.instance(true, 3.5, 10, Math.PI/2, Math.random() < 0.5);
        if (ss !== undefined) {
            newDrifters = insertDrifter(state, newDrifters, ss);
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.DRIFT_PLANET) {
        if (event.payload !== null) {
            newDrifters = insertDrifter(state, newDrifters, event.payload);
        }
        event.finished = true;
    }
    if (event.event === AnimEventType.ASTEROIDS_BEGIN) {
        newAsteroidsStillGoing = true;
        for (let i = 0; i < NUM_ASTEROIDS; i++) {
            newAsteroids[i] = newAsteroids[i].resetRandom(state);
            newAsteroids[i].visible = true;
        }
        console.log("ASTEROIDS START");
        event.finished = true;
    }
    if (event.event === AnimEventType.ASTEROIDS_END) {
        newAsteroidsStillGoing = false;
        console.log("ASTEROIDS END");
        event.finished = true;
    }
    if (event.event === AnimEventType.OUTRO_TRIGGER) {
        console.log("The ship and crew have made it to their new home.");
        newGameScreen = GameScreen.OUTRO;               // Switch to GameScreen.OUTRO.
        newOutroShipShiftStart = state.currentFrame;    // Begin shifting the ship down and entering orbit of big Earth (II).
        event.finished = true;
    }
    // This event should only ever triggered via the Gardener update method.
    if (event.event === AnimEventType.GAMEOVER_REPLAY_FRAME){
        console.log("GAME OVER");
        gameover = true;
        gameoverFrame = state.currentFrame;
        // Clear remaining events.
        newPendingEvents = [];
        triggeredEvents = [];
    }
  }
  return {
    ...state,
    gameScreen: newGameScreen,
    outroShipShiftStart: newOutroShipShiftStart,
    gardener : gardener,
    npcs: npcs,
    cats: cats,
    portal: portal,
    nextColliderId: colliderId,
    plants: newPlants,
    drifters: newDrifters,
    dialogs: dialogs,
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
    randomCabinFeverAllowed: randomCabinFeverAllowed,
    asteroids: newAsteroids,
    asteroidsStillGoing: newAsteroidsStillGoing,
  };
}

// Find an unused slot in the drifters array and insert a given drifter.
function insertDrifter(state: IGlobalState, drifters: (Planet | null)[], drifter: Planet): (Planet | null)[] {
    for (let i = 0; i < DRIFTER_COUNT; i++) {
        if (drifters[i] !== null) continue;
        drifter.start(state);
        drifters[i] = drifter;
        break;
    }
    return drifters;
}

// Find an unused slot in the drifters array and insert a scorched start for slingshotting.
function slingshotMindFlayerPlanet(state: IGlobalState, drifters: (Planet | null)[]): (Planet | null)[] {
  for (let i = 0; i < DRIFTER_COUNT; i++) {
      if (drifters[i] !== null) continue;
      let mf = state.planets.get(PlanetType.ISLAND)?.instance(true, 3, 30, Math.PI/2, Math.random() < 0.5);
      if (mf !== undefined) {
        mf.start(state);
        drifters[i] = mf;
        console.log("Created mindflayer planet");
        break;
      }
  }
  return drifters;
}


export const GAMEOVER_RESTART_TIME = 5*FPS;