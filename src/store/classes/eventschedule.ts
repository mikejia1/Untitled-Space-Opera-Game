import { FPS } from "../../utils/constants";
import { Coord, SHAKER_INTENSE, SHAKER_MEDIUM, SHAKER_MILD, SHAKER_NO_SHAKE, SHAKER_SUBTLE, computeCurrentFrame } from "../../utils";
import { AnimEvent, AnimEventType } from "./animation";
import { Planet, PlanetType } from "../../scene/planet";
import { IGlobalState } from "./globalstate";
import { PULSE_INTENSE, PULSE_MEDIUM, PULSE_MILD, PULSE_STOP, PULSE_SUBTLE } from "../../scene";
import { gridOfCats } from "../../entities/cat";
import { blackHoleDialog, catInvasionDialog, scorchingStarDialog } from "../../scene/npcscript";

const CAT_INVASION_1 = FPS*100;
const SCORCHING_STAR_1 = FPS*200;
const MIND_FLAYER = FPS*300;
const CAT_INVASION_2 = FPS*400;
const SCORCHING_STAR_2 = FPS*500;
const BLACKHOLE_SUPERNOVA = FPS*600;
const CAT_INVASION_3 = FPS*700;

export function getEvents(state: IGlobalState): AnimEvent[] {
    return [
        ...createDriftingPlanetEvents(state),
        ...creatCatInvasionLevel1(CAT_INVASION_1), 
        ...createScorchingStarEvent(SCORCHING_STAR_1),
        ...createMindFlayerEvent(MIND_FLAYER),
        ...creatCatInvasionLevel2(CAT_INVASION_2), 
        ...createScorchingStarEvent(SCORCHING_STAR_2),
        ...createSupernovaEvents(BLACKHOLE_SUPERNOVA),
        ...creatCatInvasionLevel3(CAT_INVASION_3), 
    ];
  }
  
  // Schedule *all* the planets that will drift by.
  function createDriftingPlanetEvents(state: IGlobalState): AnimEvent[] {
    let t = computeCurrentFrame();
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
  function createScorchingStarEvent(delay: number): AnimEvent[] {
    return [
        new AnimEvent(AnimEventType.SCORCHING_STAR_SLINGSHOT, computeCurrentFrame() + delay),
        new AnimEvent(AnimEventType.DIALOG, computeCurrentFrame() + delay + 500, scorchingStarDialog)
    ];
  }

  function createMindFlayerEvent(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let mindFlayer: AnimEvent = new AnimEvent(AnimEventType.MIND_FLAYER_PLANET, time);
    return [mindFlayer, ];
  }

  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel1(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let asteroidsStart: AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_BEGIN,  time - (5 * FPS));
    let dialog:         AnimEvent = new AnimEvent(AnimEventType.DIALOG,           time - (5 * FPS),         catInvasionDialog);
    let shake1:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time - (3 * FPS),         SHAKER_SUBTLE);
    let shake2:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time - (2.5 * FPS),       SHAKER_MILD);
    let shake3:         AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time - (0.5 * FPS),       SHAKER_SUBTLE);
    let shakeStop:      AnimEvent = new AnimEvent(AnimEventType.SHAKE,            time,                     SHAKER_NO_SHAKE);
    let enterPortal:    AnimEvent = new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let enterCats:      AnimEvent = new AnimEvent(AnimEventType.CAT_INVASION,     time + (1.2 * FPS),       gridOfCats(new Coord(380, 245), 20, 2, 1));
    let asteroidsEnd:   AnimEvent = new AnimEvent(AnimEventType.ASTEROIDS_END,    time + (3 * FPS));
    return [asteroidsStart, dialog, shake1, shake2, shake3, shakeStop, enterPortal, enterCats, asteroidsEnd ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel2(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let dialog:     AnimEvent = new AnimEvent(AnimEventType.DIALOG,             time - (5 * FPS),         catInvasionDialog);
    let shake1:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (4 * FPS),           SHAKER_SUBTLE);
    let shake2:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (3 * FPS),           SHAKER_MILD);
    let shake3:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (0.5 * FPS),         SHAKER_SUBTLE);
    let shakeStop:   AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time,                       SHAKER_NO_SHAKE);
    let enterPortal: AnimEvent =  new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let enterCats:   AnimEvent =  new AnimEvent(AnimEventType.CAT_INVASION,     time + (1.2 * FPS),         gridOfCats(new Coord(380, 245), 20, 3, 2));
    return [dialog, shake1, shake2, shake3, shakeStop, enterPortal, enterCats ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel3(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let dialog:     AnimEvent = new AnimEvent(AnimEventType.DIALOG,             time - (5 * FPS),         catInvasionDialog);
    let shake1:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (5 * FPS),             SHAKER_SUBTLE);
    let shake2:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (4 * FPS),             SHAKER_MILD);
    let shake3:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time - (3 * FPS),             SHAKER_MEDIUM);
    let enterPortal: AnimEvent =  new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let shake4:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time + 1,                     SHAKER_MILD);
    let enterCats:   AnimEvent =  new AnimEvent(AnimEventType.CAT_INVASION,     time + (1.2 * FPS),           gridOfCats(new Coord(380, 245), 20, 10, 3));
    let shake5:      AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time + 1.5,                   SHAKER_MILD);
    let shakeStop:   AnimEvent =  new AnimEvent(AnimEventType.SHAKE,            time + 2,                     SHAKER_NO_SHAKE);
    return [dialog, shake1, shake2, shake3, enterPortal, shake4, enterCats, shake5, shakeStop ];
  }
  
  // Setup the timed schedule of all events associated with a dangerous supernova encounter.
  function createSupernovaEvents(delay: number): AnimEvent[] {
      let f = computeCurrentFrame();
      let enterBH:    AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_APPEARS,   f + delay - (16 * FPS));
      let pulse1:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay - (16 * FPS),     PULSE_SUBTLE);
      let alarm1:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay - (15 * FPS),     0);
      let alarm2:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay - (15 * FPS),     1);
      let alarm3:     AnimEvent = new AnimEvent(AnimEventType.ALARM,                f + delay - (15 * FPS),     2);
      let dialog1:    AnimEvent = new AnimEvent(AnimEventType.DIALOG,               f + delay - (14 * FPS),     blackHoleDialog);
      let shake1:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay - (15 * FPS),     SHAKER_SUBTLE);
      let pulse2:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay - (12 * FPS),     PULSE_MILD);
      let shake2:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay - (11 * FPS),     SHAKER_MILD);
      let dialog2:    AnimEvent = new AnimEvent(AnimEventType.DIALOG,               f + delay - (9 * FPS),      blackHoleDialog);
      let pulse3:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay - (8 * FPS),      PULSE_MEDIUM);
      let shake3:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay - (7 * FPS),      SHAKER_MEDIUM);
      let shake4:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay - (3 * FPS),      SHAKER_INTENSE);
      let pulse5:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay - (0.2 * FPS),    PULSE_MEDIUM);
      let pulse4:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay - (1.15 * FPS),   PULSE_INTENSE);
      let supernova:  AnimEvent = new AnimEvent(AnimEventType.IMPACT,               f + delay);
      let shake5:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay,                  SHAKER_MEDIUM);
      let shake6:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (1 * FPS),      SHAKER_MILD);
      let pulse6:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (2 * FPS),      PULSE_MILD);
      let shake7:     AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (2 * FPS),      SHAKER_SUBTLE);
      let pulse7:     AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (3 * FPS),      PULSE_SUBTLE);
      let shakeStop:  AnimEvent = new AnimEvent(AnimEventType.SHAKE,                f + delay + (3 * FPS),      SHAKER_NO_SHAKE);
      let pulseStop:  AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_PULSE,     f + delay + (4 * FPS),      PULSE_STOP);
  
      return [
        enterBH,                                                            // Black hole instantiation.
        alarm1, alarm2, alarm3,                                             // Shield button alarms going off.
        dialog1, dialog2,                                                   // Dialogs.
        supernova,                                                          // The lethal moment.
        shake1, shake2, shake3, shake4, shake5, shake6, shake7, shakeStop,  // Shaking intensity changes.
        pulse1, pulse2, pulse3, pulse4, pulse5, pulse6, pulse7, pulseStop,  // Black hole pulsing intensity changes.
      ];
  }
  