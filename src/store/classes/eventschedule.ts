import { FPS, computeCurrentFrame } from "../../utils";
import { AnimEvent, AnimEventType } from "./animation";

const CAT_INVASION_1 = FPS*100;
const SCORCHING_STAR_1 = FPS*200;
const MIND_FLAYER = FPS*300;
const CAT_INVASION_2 = FPS*400;
const SCORCHING_STAR_2 = FPS*500;
const BLACKHOLE_SUPERNOVA = FPS*600;
const CAT_INVASION_3 = FPS*700;

export function getEvents(): AnimEvent[] {
    return [
        ...creatCatInvasionLevel1(CAT_INVASION_1), 
        ...createScorchingStarEvent(SCORCHING_STAR_1),
        ...createMindFlayerEvent(MIND_FLAYER),
        ...creatCatInvasionLevel2(CAT_INVASION_2), 
        ...createScorchingStarEvent(SCORCHING_STAR_2),
        ...createSupernovaEvents(BLACKHOLE_SUPERNOVA),
        ...creatCatInvasionLevel3(CAT_INVASION_3), 
    ];
  }
  
  function createScorchingStarEvent(delay: number): AnimEvent[] {
    //Dialog: "Someone close the blinds!"
    //Dialog: "Too bright! Get the shutters!"
    //Dialog: "Those plants don't look so good..."
    //Dialog: "I'm going blind!"
    return [];
  }

  function createMindFlayerEvent(delay: number): AnimEvent[] {
    //Dialog: "I'm feeling a little... off."
    //Dialog: "I can't take much more of this!"
    //Dialog: "There are ants in my brain!"
    //Dialog: "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"
    return [];
  }

  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel1(delay: number): AnimEvent[] {
    //Dialog: "Cat's aren't allowed in the lab!"
    //Dialog: "Don't pet the kitty!"
    //Dialog: "The only good cat is a wet cat."
    let f = computeCurrentFrame();
    let time = f + delay;
    let shake1:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time - (3 * FPS));
    let shake2:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_2,    time - (2.5 * FPS));
    let shake3:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time - (0.5 * FPS));
    let shakeStop:  AnimEvent =   new AnimEvent(AnimEventType.SHAKE_STOP,       time);
    let enterPortal: AnimEvent =  new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let enterCats: AnimEvent =    new AnimEvent(AnimEventType.CAT_INVASION_1,   time + (1.2 * FPS));
    return [shake1, shake2, shake3, shakeStop, enterPortal, enterCats ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel2(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let shake1:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time - (4 * FPS));
    let shake2:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_2,    time - (3 * FPS));
    let shake3:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time - (0.5 * FPS));
    let shakeStop:  AnimEvent =   new AnimEvent(AnimEventType.SHAKE_STOP,       time);
    let enterPortal: AnimEvent =  new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let enterCats: AnimEvent =    new AnimEvent(AnimEventType.CAT_INVASION_2,   time + (1.2 * FPS));
    return [shake1, shake2, shake3, shakeStop, enterPortal, enterCats ];
  }
  
  // Set up the timed schedule for cat invasion event. 
  function creatCatInvasionLevel3(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let time = f + delay;
    let shake1:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time - (5 * FPS));
    let shake2:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_2,    time - (4 * FPS));
    let shake3:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_3,    time - (3 * FPS));
    let enterPortal: AnimEvent =  new AnimEvent(AnimEventType.OPEN_CAT_PORTAL,  time);
    let shake4:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_2,    time + 1);
    let enterCats: AnimEvent =    new AnimEvent(AnimEventType.CAT_INVASION_3,   time + (1.2 * FPS));
    let shake5:     AnimEvent =   new AnimEvent(AnimEventType.SHAKE_LEVEL_1,    time + 1.5);
    let shakeStop:  AnimEvent =   new AnimEvent(AnimEventType.SHAKE_STOP,       time + 2);
    return [shake1, shake2, shake3, enterPortal, shake4, enterCats, shake5, shakeStop ];
  }
  
  // Setup the timed schedule of all events associated with a dangerous supernova encounter.
  function createSupernovaEvents(delay: number): AnimEvent[] {
      let f = computeCurrentFrame();
      let noSling:    AnimEvent = new AnimEvent(AnimEventType.SLINGSHOT_FORBIDDEN,  f + delay - (24 * FPS));  // Slingshotting not allowed ahead of black hole.
      let enterBH:    AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_APPEARS,   f + delay - (16 * FPS));
      let pulse1:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_1,     f + delay - (16 * FPS));
      let alarm1:     AnimEvent = new AnimEvent(AnimEventType.ALARM_1,              f + delay - (15 * FPS));
      let alarm2:     AnimEvent = new AnimEvent(AnimEventType.ALARM_2,              f + delay - (15 * FPS));
      let alarm3:     AnimEvent = new AnimEvent(AnimEventType.ALARM_3,              f + delay - (15 * FPS));
      let shake1:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay - (15 * FPS));
      let pulse2:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_2,     f + delay - (12 * FPS));
      let shake2:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay - (11 * FPS));
      let pulse3:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_3,     f + delay - (8 * FPS));
      let shake3:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay - (7 * FPS));
      let shake4:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_4,        f + delay - (3 * FPS));
      let pulse5:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_3,     f + delay - (0.2 * FPS));
      let pulse4:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_4,     f + delay - (1.15 * FPS));
      let supernova:  AnimEvent = new AnimEvent(AnimEventType.IMPACT,               f + delay);
      let shake5:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay);
      let shake6:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay + (1 * FPS));
      let pulse6:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_2,     f + delay + (2 * FPS));
      let shake7:     AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay + (2 * FPS));
      let pulse7:     AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_1,     f + delay + (3 * FPS));
      let shakeStop:  AnimEvent = new AnimEvent(AnimEventType.SHAKE_STOP,           f + delay + (3 * FPS));
      let pulseStop:  AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_STOP,        f + delay + (4 * FPS));
      let yesSling:   AnimEvent = new AnimEvent(AnimEventType.SLINGSHOT_ALLOWED,    f + delay + (4 * FPS));   // Slingshotting allowed after black hole is done.
  
      return [
        enterBH,                                                            // Black hole instantiation.
        alarm1, alarm2, alarm3,                                             // Shield button alarms going off.
        supernova,                                                          // The lethal moment.
        shake1, shake2, shake3, shake4, shake5, shake6, shake7, shakeStop,  // Shaking intensity changes.
        pulse1, pulse2, pulse3, pulse4, pulse5, pulse6, pulse7, pulseStop,  // Black hole pulsing intensity changes.
        noSling, yesSling,                                                  // Preventing overlap with planet slingshotting.
      ];
  }
  