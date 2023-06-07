import { FPS } from "../../utils/constants";
import { Coord, SHAKER_INTENSE, SHAKER_MEDIUM, SHAKER_MILD, SHAKER_NO_SHAKE, SHAKER_SUBTLE, computeCurrentFrame } from "../../utils";
import { AnimEvent, AnimEventType } from "./animation";
import { Planet, PlanetType } from "../../scene/planet";
import { IGlobalState } from "./globalstate";
import { PULSE_INTENSE, PULSE_MEDIUM, PULSE_MILD, PULSE_STOP, PULSE_SUBTLE } from "../../scene";
import { gridOfCats } from "../../entities/cat";
import { blackHoleDialog, catInvasionDialog, scorchingStarDialog, tutorialDialog } from "../../scene/npcscript";

const WELCOME_DIALOG =            FPS *   0;    // 00:00
const CAT_INVASION_1 =            FPS *  45;    // 00:45
// Scorching star takes 770 frames
const SCORCHING_STAR_1 =          FPS *  80;    // 01:20
// Mindflayer takes 1290 frames
const MIND_FLAYER =               FPS * 120;    // 02:00
const CAT_INVASION_2 =            FPS * 185;    // 03:05
const SCORCHING_STAR_2 =          FPS * 230;    // 03:50
const BLACKHOLE_SUPERNOVA =       FPS * 264;    // 04:24
const CAT_INVASION_3 =            FPS * 315;    // 05:15
const SUCCESS_OUTRO =             FPS * 360;    // 06:00

export function getEvents(startTime: number): AnimEvent[] {
    return [
        //...createDriftingPlanetEvents(state, startTime),
        ...createWelcomeDialogEvents(WELCOME_DIALOG, startTime),
        ...creatCatInvasionLevel1(CAT_INVASION_1, startTime),
        ...createScorchingStarEvent(SCORCHING_STAR_1, startTime),
        ...createMindFlayerEvent(MIND_FLAYER, startTime),
        ...creatCatInvasionLevel2(CAT_INVASION_2, startTime),
        ...createScorchingStarEvent(SCORCHING_STAR_2, startTime),
        ...createSupernovaEvents(BLACKHOLE_SUPERNOVA, startTime),
        ...creatCatInvasionLevel3(CAT_INVASION_3, startTime),
        ...creatSuccessOutro(SUCCESS_OUTRO, startTime),
    ];
}

// Generate a new event schedule that lets the player resume from their last checkpoint.
export function newEventsFromCheckpointOnward(oldGameStartTime: number, gameResumeTime: number, gardenerDeathTime: number): AnimEvent[] {
  // Regenerate the original schedule of events.
  let oldSchedule: AnimEvent[] = getEvents(oldGameStartTime);

  // Determine the checkpoint time, based on when the player died.
  let checkpoint: number = findCheckpoint(oldGameStartTime, gardenerDeathTime);

  // Keep only events that fall on or after the checkpoint.
  let filtered: AnimEvent[] = checkpointFilter(checkpoint, oldSchedule);

  // Shift all event times so they begin five seconds after the game resumes.
  let newSchedule: AnimEvent[] = shiftEvents(gameResumeTime, filtered);

  return newSchedule;
}

// Given a resume-game time and a list of AnimEvents, return all the events,
// time-shifted so that the earliest one is at game-resume time + 5 seconds.
export function shiftEvents(gameResumeTime: number, events: AnimEvent[]): AnimEvent[] {
  let minTime: number = Number.MAX_VALUE;
  for (let i = 0; i < events.length; i++) {
    minTime = Math.min(minTime, events[i].startTime);
  }
  let shift = gameResumeTime - minTime + (5 * FPS);
  let newEvents: AnimEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    newEvents = [...newEvents, events[i].changeTime(events[i].startTime + shift)];
  }
  return newEvents;
}

// Given state and a newly-generated event schedule, return only the events on or after the gardener death checkpoint.
export function checkpointFilter(checkpoint: number, events: AnimEvent[]): AnimEvent[] {
  let filtered: AnimEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    let e = events[i];
    if (e.startTime < checkpoint) continue;
    filtered = [...filtered, e];
  }
  return filtered;
}

// Given a game start time and a time of death, find the time of the first AnimEvent
// of the "big" event (like a cat invasion) that most recently started when time of death was reached.
function findCheckpoint(gameStartTime: number, deathTime: number): number {
  let elapsed = deathTime - gameStartTime;
  if (elapsed < SCORCHING_STAR_1)                 return gameStartTime + CAT_INVASION_1;
  if (elapsed < MIND_FLAYER)                      return gameStartTime + SCORCHING_STAR_1;
  if (elapsed < CAT_INVASION_2)                   return gameStartTime + MIND_FLAYER;
  if (elapsed < SCORCHING_STAR_2)                 return gameStartTime + CAT_INVASION_2;
  if (elapsed < BLACKHOLE_SUPERNOVA)              return gameStartTime + SCORCHING_STAR_2;
  if (elapsed < CAT_INVASION_3)                   return gameStartTime + BLACKHOLE_SUPERNOVA;
  return gameStartTime + CAT_INVASION_3;
}
  
function createWelcomeDialogEvents(delay : number, startTime: number): AnimEvent[] {
  let time = startTime/*computeCurrentFrame()*/ + delay;
  return [
    new AnimEvent(AnimEventType.DIALOG, time, [tutorialDialog[0]]),
    new AnimEvent(AnimEventType.DIALOG, time, [tutorialDialog[1]]),
    new AnimEvent(AnimEventType.DIALOG, time, [tutorialDialog[2]]),
  ];
}

// Schedule *all* the planets that will drift by.
function createDriftingPlanetEvents(state: IGlobalState, startTime: number): AnimEvent[] {
  let t = startTime;//computeCurrentFrame();
    let dp = AnimEventType.DRIFT_PLANET;
    let tmpls: Map<PlanetType, Planet> = state.planets;
    // Planet spin speeds.
    const FAST  = 10;
    const MID   = 20;
    const SLOW  = 30;
    // Whether or not a planet slingshots.
    const SLING   = true;
    const NOSLING = false;
    // Planet sizes.
    const BIG     = 3.5;
    const MEDIUM  = 2.5;
    const SMALL   = 1.5;
    // Planet angles.
    const TWELVE  = Math.PI * ( 6 / 12);
    const ONE     = Math.PI * ( 4 / 12);
    const TWO     = Math.PI * ( 2 / 12);
    const THREE   = Math.PI * ( 0 / 12);
    const FOUR    = Math.PI * (22 / 12);
    const FIVE    = Math.PI * (20 / 12);
    const SIX     = Math.PI * (18 / 12);
    const SEVEN   = Math.PI * (16 / 12);
    const EIGHT   = Math.PI * (14 / 12);
    const NINE    = Math.PI * (12 / 12);
    const TEN     = Math.PI * (10 / 12);
    const ELEVEN  = Math.PI * ( 8 / 12);
    // Whether or not the planet sprites are horizontally flipped.
    const FLIP = true;
    const NOFLIP = false;
    return [
      new AnimEvent(dp, t + (FPS *   0), tmpls.get(PlanetType.CRATER )?.instance(NOSLING,  BIG,    MID,  TWO,    NOFLIP  )),
      new AnimEvent(dp, t + (FPS *  10), tmpls.get(PlanetType.DRY    )?.instance(SLING,    MEDIUM, SLOW, ELEVEN, FLIP    )),

      // Avoid planet drift overlap with the DRY planet slingshot, above.

      new AnimEvent(dp, t + (FPS *  50), tmpls.get(PlanetType.RING   )?.instance(NOSLING,  SMALL,  SLOW, EIGHT,  FLIP    )),
      new AnimEvent(dp, t + (FPS *  60), tmpls.get(PlanetType.STAR   )?.instance(NOSLING,  BIG,    FAST, ONE,    NOFLIP  )),
      new AnimEvent(dp, t + (FPS *  70), tmpls.get(PlanetType.CRATER )?.instance(NOSLING,  MEDIUM, MID,  THREE,  FLIP    )),
      new AnimEvent(dp, t + (FPS *  80), tmpls.get(PlanetType.RING   )?.instance(NOSLING,  MEDIUM, SLOW, ELEVEN, FLIP    )),
      new AnimEvent(dp, t + (FPS *  90), tmpls.get(PlanetType.LAVA   )?.instance(NOSLING,  SMALL,  FAST, FOUR,   NOFLIP  )),

      // Cat invation 1 at 100 seconds.

      new AnimEvent(dp, t + (FPS * 130), tmpls.get(PlanetType.ICE    )?.instance(NOSLING,  MEDIUM, MID,  TEN,    NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 140), tmpls.get(PlanetType.DRY    )?.instance(NOSLING,  SMALL,  SLOW, NINE,   FLIP    )),
      new AnimEvent(dp, t + (FPS * 150), tmpls.get(PlanetType.WET    )?.instance(NOSLING,  BIG,    FAST, TWELVE, NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 160), tmpls.get(PlanetType.ICE    )?.instance(NOSLING,  SMALL,  FAST, FOUR,   NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 170), tmpls.get(PlanetType.WET    )?.instance(NOSLING,  BIG,    MID,  SEVEN,  FLIP    )),
      new AnimEvent(dp, t + (FPS * 180), tmpls.get(PlanetType.LAVA   )?.instance(NOSLING,  MEDIUM, MID,  TEN,    NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 190), tmpls.get(PlanetType.STAR   )?.instance(NOSLING,  BIG,    MID,  SIX,    FLIP    )),

      // Scorching star 1 at 200 seconds.

      new AnimEvent(dp, t + (FPS * 240), tmpls.get(PlanetType.ICE    )?.instance(NOSLING,  BIG,    SLOW,   ELEVEN, NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 250), tmpls.get(PlanetType.LAVA   )?.instance(SLING,    BIG,    FAST,   FOUR,   FLIP    )),
      new AnimEvent(dp, t + (FPS * 260), tmpls.get(PlanetType.RING   )?.instance(NOSLING,  BIG,    SLOW,   NINE,   NOFLIP  )),
      new AnimEvent(dp, t + (FPS * 270), tmpls.get(PlanetType.STAR   )?.instance(NOSLING,  BIG,    FAST,   ONE,    FLIP    )),
      new AnimEvent(dp, t + (FPS * 280), tmpls.get(PlanetType.CRATER )?.instance(NOSLING,  MEDIUM, MEDIUM, FIVE,   NOFLIP  )),

      // Mind flayer at 300 seconds.

      // Cat invation 2 at 400 seconds.

      // Scorching star 2 at 500 seconds.

      // Black hole supernova at 600 seconds.

      // Cat invation 3 at 700 seconds.

    ];
  }

  // Technically, we don't need a special event type for this, but it's in line with having types for all the major events.
  // i.e. this is equivalent to a DRIFT_PLANET event with the right payload.
  function createScorchingStarEvent(delay: number, startTime: number): AnimEvent[] {
    return [
        new AnimEvent(AnimEventType.SCORCHING_STAR_SLINGSHOT, startTime/*computeCurrentFrame()*/ + delay),
        new AnimEvent(AnimEventType.DIALOG, startTime/*computeCurrentFrame()*/ + delay + 500, scorchingStarDialog)
    ];
  }

  function createMindFlayerEvent(delay: number, startTime: number): AnimEvent[] {
    let f = startTime;//computeCurrentFrame();
    let time = f + delay;
    let mindFlayer: AnimEvent = new AnimEvent(AnimEventType.MIND_FLAYER_PLANET, time);
    return [mindFlayer, ];
  }

  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel1(delay: number, startTime: number): AnimEvent[] {
    let f = startTime;//computeCurrentFrame();
    let time = f + delay;
    let asteroidsStart: AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_BEGIN,  time + (0 * FPS));
    let dialog:         AnimEvent = new AnimEvent(AnimEventType.DIALOG,           time + (0 * FPS),         catInvasionDialog);
    let shake1:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (2 * FPS),         SHAKER_SUBTLE);
    let shake2:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (2.5 * FPS),       SHAKER_MILD);
    let shake3:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (4.5 * FPS),       SHAKER_SUBTLE);
    let shakeStop:      AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (5 * FPS),         SHAKER_NO_SHAKE);
    let enterPortal:    AnimEvent = new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time + (5 * FPS));
    let enterCats:      AnimEvent = new AnimEvent(AnimEventType.CAT_INVASION,     time + (6.2 * FPS),       gridOfCats(new Coord(380, 245), 20, 2, 1));
    let asteroidsEnd:   AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_END,    time + (8 * FPS));
    return [asteroidsStart, dialog, shake1, shake2, shake3, shakeStop, enterPortal, enterCats, asteroidsEnd ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel2(delay: number, startTime: number): AnimEvent[] {
    let f = startTime;//computeCurrentFrame();
    let time = f + delay;
    let asteroidsStart: AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_BEGIN,  time + (0 * FPS));
    let dialog:         AnimEvent = new AnimEvent(AnimEventType.DIALOG,           time + (0 * FPS),         catInvasionDialog);
    let shake1:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (1 * FPS),         SHAKER_SUBTLE);
    let shake2:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (2 * FPS),         SHAKER_MILD);
    let shake3:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (4.5 * FPS),       SHAKER_SUBTLE);
    let shakeStop:      AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (5 * FPS),         SHAKER_NO_SHAKE);
    let enterPortal:    AnimEvent = new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time + (5 * FPS));
    let enterCats:      AnimEvent = new AnimEvent(AnimEventType.CAT_INVASION,     time + (6.2 * FPS),       gridOfCats(new Coord(380, 245), 20, 3, 2));
    let asteroidsEnd:   AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_END,    time + (8 * FPS));
    return [asteroidsStart, dialog, shake1, shake2, shake3, shakeStop, enterPortal, enterCats, asteroidsEnd ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel3(delay: number, startTime: number): AnimEvent[] {
    let f = startTime;//computeCurrentFrame();
    let time = f + delay;
    let asteroidsStart: AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_BEGIN,  time + (0 * FPS));
    let dialog:         AnimEvent = new AnimEvent(AnimEventType.DIALOG,           time + (0 * FPS),         catInvasionDialog);
    let shake1:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (0 * FPS),         SHAKER_SUBTLE);
    let shake2:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (1 * FPS),         SHAKER_MILD);
    let shake3:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (2 * FPS),         SHAKER_MEDIUM);
    let enterPortal:    AnimEvent = new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time + (5 * FPS));
    let shake4:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (5 * FPS) + 1,     SHAKER_MILD);
    let enterCats:      AnimEvent = new AnimEvent(AnimEventType.CAT_INVASION,     time + (6.2 * FPS),       gridOfCats(new Coord(380, 245), 20, 10, 3));
    let shake5:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (5 * FPS) + 1.5,   SHAKER_MILD);
    let shakeStop:      AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time + (5 * FPS) + 2,     SHAKER_NO_SHAKE);
    let asteroidsEnd:   AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_END,    time + (8 * FPS));
    return [asteroidsStart, dialog, shake1, shake2, shake3, enterPortal, shake4, enterCats, shake5, shakeStop, asteroidsEnd ];
  }

  // Set up the event that ends GameScreen.PLAY and transitions to GameScreen.OUTRO.
  function creatSuccessOutro(delay: number, startTime: number): AnimEvent[] {
    let f = startTime;//computeCurrentFrame();
    let time = f + delay;
    let outroTrigger: AnimEvent = new AnimEvent(AnimEventType.OUTRO_TRIGGER, time);
    return [outroTrigger];
  }
  
  // Setup the timed schedule of all events associated with a dangerous supernova encounter.
  function createSupernovaEvents(delay: number, startTime: number): AnimEvent[] {
      let f = startTime;//computeCurrentFrame();
      let enterBH:    AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_APPEARS,   f + delay + (0 * FPS));
      let pulse1:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (0 * FPS),     PULSE_SUBTLE);
      let alarm1:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay + (1 * FPS),     0);
      let alarm2:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay + (1 * FPS),     1);
      let alarm3:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay + (1 * FPS),     2);
      let dialog1:    AnimEvent = new AnimEvent(AnimEventType.DIALOG,               f + delay + (2 * FPS),     blackHoleDialog);
      let shake1:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (1 * FPS),     SHAKER_SUBTLE);
      let pulse2:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (4 * FPS),     PULSE_MILD);
      let shake2:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (5 * FPS),     SHAKER_MILD);
      let dialog2:    AnimEvent = new AnimEvent(AnimEventType.DIALOG,               f + delay + (7 * FPS),     blackHoleDialog);
      let pulse3:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (8 * FPS),     PULSE_MEDIUM);
      let shake3:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (9 * FPS),     SHAKER_MEDIUM);
      let shake4:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (13 * FPS),    SHAKER_INTENSE);
      let pulse5:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (15.8 * FPS),  PULSE_MEDIUM);
      let pulse4:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (14.85 * FPS), PULSE_INTENSE);
      let supernova:  AnimEvent = new AnimEvent(AnimEventType.IMPACT,               f + delay + (16 * FPS));
      let shake5:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (16 * FPS),    SHAKER_MEDIUM);
      let shake6:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (17 * FPS),    SHAKER_MILD);
      let pulse6:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (18 * FPS),    PULSE_MILD);
      let shake7:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (18 * FPS),    SHAKER_SUBTLE);
      let pulse7:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (19 * FPS),    PULSE_SUBTLE);
      let shakeStop:  AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (19 * FPS),    SHAKER_NO_SHAKE);
      let pulseStop:  AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (20 * FPS),    PULSE_STOP);
  
      return [
        enterBH,                                                            // Black hole instantiation.
        alarm1, alarm2, alarm3,                                             // Shield button alarms going off.
        dialog1, dialog2,                                                   // Dialogs.
        supernova,                                                          // The lethal moment.
        shake1, shake2, shake3, shake4, shake5, shake6, shake7, shakeStop,  // Shaking intensity changes.
        pulse1, pulse2, pulse3, pulse4, pulse5, pulse6, pulse7, pulseStop,  // Black hole pulsing intensity changes.
      ];
  }
  