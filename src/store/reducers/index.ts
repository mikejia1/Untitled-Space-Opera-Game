// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { Direction, computeCurrentFrame, rectanglesOverlap, randomInt, ALL_DIRECTIONS, Coord, CANVAS_WIDTH, SHAKER_SUBTLE, SHAKER_NO_SHAKE, SHAKER_MILD, SHAKER_MEDIUM, SHAKER_INTENSE, directionOfFirstRelativeToSecond, directionName, AIRLOCK_PIXEL_SPEED } from "../../utils";
import { AnimEvent, AnimEventType, Collider, ColliderExceptions, ColliderType, IGlobalState, initialGameState } from "../classes";
import { Airlock, AirlockState, Gardener, MentalState, NonPlayer, Plant, ShieldButton } from '../../entities';
import {
  DOWN,
  INCREMENT_SCORE,
  LEFT,
  TICK,
  RESET,
  RESET_SCORE,
  RIGHT,
  TOGGLE_EQUIP,
  UP,
  USE_ITEM,
  STOP_WATERING,
  TOGGLE_FREEZE,
  STOP_RIGHT,
  STOP_LEFT,
  STOP_UP,
  STOP_DOWN,
  TOGGLE_DEBUG_CONTROL_COLLISION_RECTS,
  TOGGLE_DEBUG_CONTROL_POSITION_RECTS,
  TOGGLE_DEBUG_CONTROL_WATERING_RECTS,
  TOGGLE_DEBUG_CONTROL_FACING_RECTS,
  TOGGLE_DEBUG_CONTROL_EQUIP_RECTS,
  TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS,
  TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS,
  TOGGLE_GAME_AUDIO,
} from "../actions";
import { INTER_SLAT_DELAY } from "../../entities/shielddoor";
import { Cat } from "../../entities/cat";
import { BlackHole, PULSE_SUBTLE, PULSE_MILD, PULSE_MEDIUM, PULSE_INTENSE } from "../../scene";
// All actions/index.ts setters are handled here
const gameReducer = (state = initialGameState(), action: any) => {
  switch (action.type) {
    case RIGHT:                                   return newKeyDown(state, Direction.Right);
    case LEFT:                                    return newKeyDown(state, Direction.Left);
    case UP:                                      return newKeyDown(state, Direction.Up);
    case DOWN:                                    return newKeyDown(state, Direction.Down);
    case STOP_RIGHT:                              return newKeyUp(state, Direction.Right);
    case STOP_LEFT:                               return newKeyUp(state, Direction.Left);
    case STOP_UP:                                 return newKeyUp(state, Direction.Up);
    case STOP_DOWN:                               return newKeyUp(state, Direction.Down);
    case TOGGLE_EQUIP:                            return toggleEquip(state);
    case USE_ITEM:                                return utiliseItem(state);
    case STOP_WATERING:                           return ceaseWatering(state);
    case TOGGLE_FREEZE:                           return toggleDrawStateFreeze(state);
    case RESET:                                   return initialGameState();
    case RESET_SCORE:                             return { ...state, score: 0 };
    case INCREMENT_SCORE:                         return { ...state, score: state.score + 1 };
    case TOGGLE_GAME_AUDIO:                       return toggleGameAudio(state);
    case TICK:                                    return updateFrame(state);
    case TOGGLE_DEBUG_CONTROL_COLLISION_RECTS:    return toggleDebugControlCollisionRects(state);
    case TOGGLE_DEBUG_CONTROL_POSITION_RECTS:     return toggleDebugControlPositionRects(state);
    case TOGGLE_DEBUG_CONTROL_WATERING_RECTS:     return toggleDebugControlWateringRects(state);
    case TOGGLE_DEBUG_CONTROL_FACING_RECTS:       return toggleDebugControlFacingRects(state);
    case TOGGLE_DEBUG_CONTROL_EQUIP_RECTS:        return toggleDebugControlEquipRects(state);
    case TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS:  return toggleDebugControlInteractionRects(state);
    case TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS: return toggleDebugControlDisableCollisions(state);
    default:                                      return state;
  }
};

// Stop the gardener if the keyup direction matches the current gardener direction.
function newKeyUp(state: IGlobalState, direction: Direction): IGlobalState {
  var keysPressed = state.keysPressed;
  const index = keysPressed.indexOf(direction);
  if (index > -1) { // only splice array when item is found
    keysPressed.splice(index, 1); // 2nd parameter means remove one item only
  }
  // Only stop gardener if no keys are pressed.
  if (keysPressed.length === 0) {
    return { ...state, keysPressed: keysPressed, gardener: state.gardener.stop()}
  }
  // Update facing direction of gardener if new key is to the left or right.
  if (keysPressed[0] === Direction.Left || keysPressed[0] === Direction.Right) {
    return { ...state, keysPressed: keysPressed, gardener: state.gardener.changeFacingDirection(keysPressed[0])}
  }
  return {...state, keysPressed: keysPressed};
}

// Only move the gardener if the keypress changes the gardener direction.
function newKeyDown(state: IGlobalState, direction: Direction): IGlobalState {
  // This is a spurious keypress. Ignore it.
  if (ignoreKeyPress(direction, state.keysPressed)) {
    return state;
  }
  // Add the new keypress to the keysPressed array. New keypress must be first.
  const keys = [direction, ...state.keysPressed];
  // If keypress is to the left or right, update the gardener's facing direction.
  let gardener = state.gardener;
  if (direction === Direction.Left || direction === Direction.Right) {
    gardener = gardener.changeFacingDirection(direction);
  }
  gardener.moving = true;
  return {...state, keysPressed: keys, gardener: gardener};
}

function ignoreKeyPress(newDirection: Direction, keysPressed: Direction[]): boolean {
  // If key is the same as the current direction, ignore it.
  if (keysPressed[0] === newDirection) return true;
  return false;
}

// Move the gardener according to keys pressed.
// This will be aborted if the would-be new position overlaps with a plant.
function moveGardenerOnFrame(state: IGlobalState, allColliders: Map<number, Collider>): IGlobalState {
  // Would-be new post-move gardener.
  const newGar = state.gardener.move(state.keysPressed);

  // Get all colliders currently in collision with the gardener.
  let colliders: Collider[] = detectCollisions(state, allColliders, newGar);

  // Filter those colliders down to just those that are NPCs, keyed by collider ID.
  let bumpedNPCs: Set<number> = getBumpedNPCs(colliders);

  // Get a new list of NPCs where the bumped ones have begun avoiding the gardener.
  let newNPCs: NonPlayer[] = [];
  for (let i = 0; i < state.npcs.length; i++) {
    let npc = state.npcs[i];
    if (bumpedNPCs.has(npc.colliderId)) newNPCs = [...newNPCs, npc.startAvoidingGardener()];
    else newNPCs = [...newNPCs, npc]; 
  }

  // If new gardener is in collision with anything, we abort the move.
  if (colliders.length > 0) {
    console.log("Bump!");
    if (!state.muted) playBumpSound();
    return {
      ...state,
      currentFrame: computeCurrentFrame(),
      npcs: newNPCs,
    }
  }
  // All clear. Commit the move to the global state.
  return {
    ...state,
    gardener: newGar,
    // Watering can moves with gardener if the item is equipped.
    wateringCan: state.wateringCan.isEquipped ? state.wateringCan.moveWithGardener(newGar) : state.wateringCan,
    currentFrame: computeCurrentFrame(),
  }
}

// From a list of Colliders, get the collider IDs of those that are NPCs, as a set.
function getBumpedNPCs(colliders: Collider[]): Set<number> {
  let npcs = new Set<number>();
  colliders.forEach(c => { if (c.colliderType === ColliderType.NPCCo) npcs.add(c.colliderId); });
  return npcs;
}

// Play the sound corresponding to the gardener bumping into a collider.
function playBumpSound(): void {
  try {
    let boing = new Audio(require('../sounds/boing.mp3'));
    let playPromise = boing.play();
    // In browsers that don’t yet support this functionality, playPromise won’t be defined.
    if (playPromise !== undefined) {
      playPromise.then(function() {}).catch(function(error) {
        console.log("Bump sound failure: ", error);
      });
    }
  } catch (error) {
    console.log("Audio error: ", error);
  }
}

// TODO: See if we can animate from within a saga instead of the way we're doing it now.
function updateFrame(state: IGlobalState): IGlobalState {

  let f = computeCurrentFrame();
  if (f === state.currentFrame) {
    return state;
  }

  if (state.gameover) {
    console.log("GAME OVER");
    return {
      ...state,
      currentFrame: f,
    }
  }

  // Get all the colliders as they exist now.
  let allColliders = allCollidersFromState(state);

  // Allow gardener to move.
  let gardenerMoving = state.gardener.moving;
  if (gardenerMoving) {
    state = moveGardenerOnFrame(state, allColliders);
    allColliders.set(state.gardener.colliderId, state.gardener);
  }

  // Allow gardener to (keep) watering.
  if (state.gardener.watering) state = utiliseItem(state);

  // Allow NPCs to move.
  let newNPCs: NonPlayer[] = [];
  state.npcs.forEach(npc => {
    // Get a new version of the npc - one that has taken its next step.
    let newNPC = moveNPC(state, npc);

    // Allow the NPC to consider adopting a new movement (forced = false).
    newNPC = considerNewNPCMovement(state, newNPC, false);

    // If this new NPC is in collision with anything, revert back to original npc
    // and force it to choose a new movement.
    if (collisionDetected(state, allColliders, newNPC)) {
      newNPC = considerNewNPCMovement(state, npc, true);
    }

    // Update the NPC array. Update the colliders so that subsequent NPCs will
    // check collisions against up-to-date locations of their peers.
    newNPCs = [...newNPCs, newNPC];
    allColliders.set(newNPC.colliderId, newNPC);
  });

  let cats : Cat[] = [];
  for(let i = 0; i < state.cats.length; i++){
    cats = [...cats, state.cats[i].move()]
  }
  state = {...state, cats: cats};

  if(state.airlock.state === AirlockState.OPEN){
    let s = updateOpenAirlockMovements(state);
    cats = s.cats;
    newNPCs = s.npcs;
    state.gardener = s.gardener;
  }

  let newPlants = dehydratePlants(state.plants, state);
  newPlants = growPlants(newPlants, state);

  let newShield = state.shieldDoors.updateStates();
  let newAirlock = state.airlock.updateState(state);
  let newShaker = state.screenShaker;
  let newBlackHole: BlackHole | null = state.blackHole;
  if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();

  let activeEvents: AnimEvent[] = [...state.activeEvents.filter(animEvent => !animEvent.finished), ...state.pendingEvents.filter(animEvent => animEvent.startTime <= state.currentFrame)];
  let pendingEvents: AnimEvent[] = state.pendingEvents.filter(animEvent => animEvent.startTime > state.currentFrame);
  let triggeredEvents: AnimEvent[] = [];
  let gameover: boolean = false;
  let newShieldButtons: ShieldButton[] = state.shieldButtons;
  // Process active events
  for (let i = 0; i < state.activeEvents.length; i++){
    const event = state.activeEvents[i];
    if (event.processed) continue;
    if (event.event == AnimEventType.IMPACT){
      // If IMPACT occurs without all shield doors being closed, trigger GAMEOVER event.
      if (!state.shieldDoors.allDoorsClosed()){
        triggeredEvents = [...triggeredEvents, new AnimEvent(AnimEventType.GAMEOVER, event.startTime + 24)];
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
    if(event.event == AnimEventType.ALARM_1){
      newShieldButtons[0] = newShieldButtons[0].startAlarm(state);
      event.processed = true;
      event.finished = true;
    }
    if(event.event == AnimEventType.ALARM_2){
      newShieldButtons[1] = newShieldButtons[1].startAlarm(state);
      event.processed = true;
      event.finished = true;
    }
    if(event.event == AnimEventType.ALARM_3){
      newShieldButtons[2] = newShieldButtons[2].startAlarm(state);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_1) {
      newShield = newShield.openDoorEarly(0);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_2) {
      newShield = newShield.openDoorEarly(1);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.EARLY_OPEN_SHIELD_3) {
      newShield = newShield.openDoorEarly(2);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_STOP) {
      newShaker = SHAKER_NO_SHAKE; // new Shaker(0, 0);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_1) {
      newShaker = SHAKER_SUBTLE; // new Shaker(0.005, 0.008);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_2) {
      newShaker = SHAKER_MILD; // new Shaker(0.05, 0.04);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_3) {
      newShaker = SHAKER_MEDIUM; // new Shaker(0.5, 0.2);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.SHAKE_LEVEL_4) {
      newShaker = SHAKER_INTENSE; // new Shaker(5, 1);
      event.processed = true;
      event.finished = true;
    }
    if (event.event == AnimEventType.BLACK_HOLE_APPEARS) {
      console.log("Handling BLACK_HOLE_APPEARS event");
      let offCentre = randomInt(-75, 75);
      newBlackHole = new BlackHole(
        new Coord(((CANVAS_WIDTH - 512) / 2) + offCentre, -345),  // Position of black hole.
        computeCurrentFrame(),                      // Time at which it first appears.
        0,                                          // Starting pulse magnitude.
        0);                                         // Target pulse magnitude.
      event.processed = true;
      event.finished = true;
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_1) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_SUBTLE);
        event.processed = true;
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_2) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_MILD);
        event.processed = true;
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_3) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_MEDIUM);
        event.processed = true;
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_LEVEL_4) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(PULSE_INTENSE);
        event.processed = true;
        event.finished = true;
      }
    }
    if (event.event === AnimEventType.BH_PULSE_STOP) {
      if (newBlackHole !== null) {
        newBlackHole = newBlackHole.setTargetPulseMagnitude(0);
        event.processed = true;
        event.finished = true;
      }
    }
    if(event.event == AnimEventType.GAMEOVER){
        console.log("GAME OVER");
        //Kill all plants
        for(let i = 0; i < newPlants.length; i++){
          newPlants[i].health = 0;
        }
        gameover = true;
    }
    event.processed = true;
  }

  // Once the black hole has been around long enough to have passed by, clear it back to null.
  if ((newBlackHole !== null) && ((f - newBlackHole.startFrame) > 1000)) newBlackHole = null;

  // Maybe it's time for another planet to drift by.
  let newPlanet1 = state.planet1;
  let newPlanet2 = state.planet2;
  let newPlanet3 = state.planet3;
  let chance1 = (randomInt(0,9999) < 100);
  let chance2 = (randomInt(0,9999) < 100);
  let chance3 = (randomInt(0,9999) < 100);
  // If black hole is too far down, don't spawn a new planet at the moment.
  let blackHoleFarAlready = (state.blackHole !== null) && (state.blackHole.driftDistance() > 400);
  if (!blackHoleFarAlready) {
    if ((newPlanet1 === null) && chance1) {
      let choice = randomInt(0, state.planets.length-1);
      console.log("Welcome planet 1, type " + choice);
      newPlanet1 = state.planets[choice].randomizedClone();
    }
    if ((newPlanet2 === null) && chance2 && (newPlanet1 !== null) && ((f - newPlanet1.startFrame) > 150)) {
      let choice = randomInt(0, state.planets.length-1);
      console.log("Welcome planet 2, type " + choice);
      newPlanet2 = state.planets[choice].randomizedClone();
    }
    if ((newPlanet3 === null) && chance3 && (newPlanet2 !== null) && ((f - newPlanet2.startFrame) > 150)) {
      let choice = randomInt(0, state.planets.length-1);
      console.log("Welcome planet 3, type " + choice);
      newPlanet3 = state.planets[choice].randomizedClone();
    }
  }

  // Remove planets that have drifted out of view.
  if ((newPlanet1 !== null) && newPlanet1.isFinished()) {
    newPlanet1 = null;
    console.log("Goodbye planet 1!");
  }
  if ((newPlanet2 !== null) && newPlanet2.isFinished()) {
    newPlanet2 = null;
    console.log("Goodbye planet 2!");
  }
  if ((newPlanet3 !== null) && newPlanet3.isFinished()) {
    newPlanet3 = null;
    console.log("Goodbye planet 3!");
  }

  return  {
    ...state,
    currentFrame: f,
    npcs: newNPCs,
    cats: cats,
    plants: newPlants,
    activeEvents: activeEvents,
    pendingEvents: [...pendingEvents, ...triggeredEvents], 
    gameover: gameover,
    gameOverFrame: gameover ? f : state.gameOverFrame,
    shieldButtons: newShieldButtons,
    shieldDoors: newShield,
    airlock: newAirlock,
    screenShaker: newShaker,
    blackHole: newBlackHole,
    planet1: newPlanet1,
    planet2: newPlanet2,
    planet3: newPlanet3,
  };
}

function updateOpenAirlockMovements(state: IGlobalState): IGlobalState {
  // Get all the colliders as they exist now.
  let allColliders = allCollidersFromState(state);
  let cats: Cat[] = [];
  for(let i = 0; i < state.cats.length; i++){
    let cat = state.cats[i];
    let move : Coord = state.airlock.getMovementDelta(cat.pos);
    let oldPos : Coord = cat.pos;
    cat.pos = oldPos.plus(move.x, move.y);
    // If there is a collision, negate it.
    if (collisionDetected(state, allColliders, cat)) {
      cat.pos = oldPos;
    }
    if (!rectanglesOverlap(state.airlock.deathRect(), cat.collisionRect())){
      cats = [...cats, cat]
    }
  }
  let npcs: NonPlayer[] = [];
  for(let i = 0; i < state.npcs.length; i++){
    let npc = state.npcs[i];
    let move : Coord = state.airlock.getMovementDelta(npc.pos);
    let oldPos : Coord = npc.pos;
    npc.pos = oldPos.plus(move.x, move.y);
    // If there is a collision, negate it.
    if (collisionDetected(state, allColliders, npc)) {
      npc.pos = oldPos;
    }
    if (!rectanglesOverlap(state.airlock.deathRect(), npc.collisionRect())){
      npcs = [...npcs, npc]
    }
  }
  return {...state, cats: cats, npcs: npcs};
}


function updateActiveEvents(state: IGlobalState): AnimEvent[] {
  return  [...state.activeEvents.filter(animEvent => !animEvent.finished), ...state.pendingEvents.filter(animEvent => animEvent.startTime <= state.currentFrame)];
}


// Toggle debug control showCollisionRects from False to True or vice versa.
function toggleDebugControlCollisionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showCollisionRects: !state.debugSettings.showCollisionRects,
    },
  };
}

// Toggle debug control showPositionRects from False to True or vice versa.
function toggleDebugControlPositionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showPositionRects: !state.debugSettings.showPositionRects,
    },
  };
}

// Toggle debug control showWateringRects from False to True or vice versa.
function toggleDebugControlWateringRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showWateringRects: !state.debugSettings.showWateringRects,
    },
  };
}

// Toggle debug control showFacingRects from False to True or vice versa.
function toggleDebugControlFacingRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showFacingRects: !state.debugSettings.showFacingRects,
    },
  };
}

// Toggle debug control showEquipRects from False to True or vice versa.
function toggleDebugControlEquipRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showEquipRects: !state.debugSettings.showEquipRects,
    },
  };
}

// Toggle debug control showInteractionRects from False to True or vice versa.
function toggleDebugControlInteractionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showInteractionRects: !state.debugSettings.showInteractionRects,
    },
  };
}

// Toggle debug control disableCollisions from False to True or vice versa.
function toggleDebugControlDisableCollisions(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      collisionsDisabled: !state.debugSettings.collisionsDisabled,
    },
  };
}

// Change state's "muted" property from false to true or vice versa.
function toggleGameAudio(state: IGlobalState): IGlobalState {
  return {
    ...state,
    muted: !state.muted,
  };
}

// Allow an NPC to randomly choose a new movement. If the NPC is not currently moving, wait for
// its stationaryCountdown to reach zero before adopting a new movement.
function considerNewNPCMovement(state: IGlobalState, npc: NonPlayer, forced: boolean): NonPlayer {
  // Whether or not the NPC will adopt a new movement.
  let change = false;

  // If NPC is currently stationery, adopt new movement when the countdown reaches zero,
  // otherwise adopt new movement with some small probability.
  if (!npc.moving) {
    if (npc.stationeryCountdown === 0) change = true;
  } else {
    switch (npc.mentalState) {
      // A normal NPC changes direction infrequently.
      case MentalState.Normal:
        // If an NPC is avoiding the gardener and finds itself facing the gardener, then
        // it's time to force a direction change.
        if (npc.gardenerAvoidanceCountdown > 0) {
          let badDir = directionOfFirstRelativeToSecond(state.gardener, npc);
          //console.log(directionName(badDir));
          if (badDir === npc.facing) change = true;
          else change = (Math.random() < 0.02);
        } else change = (Math.random() < 0.02);
        break;
      // A frazzled NPC changes direction frequently.
      case MentalState.Frazzled:
        change = (Math.random() < 0.6);
        break;
    }
  }
  change = change || forced;

  // If no new movement is being adopted, return NPC unchanged.
  if (!change) return npc;

  // New movement is to be adopted. Choose new direction *or* choose to remain stationery for a while.
  let choice: number;
  switch (npc.mentalState) {
    // A normal NPC stands still often.
    case MentalState.Normal:
      // If NPC is currently avoiding the gardener, movement choices are somewhat limited.
      if (npc.gardenerAvoidanceCountdown > 0) choice = gardenerAvoidingDirectionChoice(state, npc);
      else choice = randomInt(0, 4);
      break;
    // A frazzled NPC doesn't stand still very often.
    case MentalState.Frazzled:
      choice = randomInt(0, 4 + (3 * 5));
      if (choice > 4) choice = (choice - 5) % 3;
      break;
  }
  if (choice === 4) {
    let countdown: number;
    switch (npc.mentalState) {
      // A normal NPC will stand still for a little while.
      case MentalState.Normal:
        countdown = 30 + randomInt(0, 200);
        break;
      // A frazzled NPC will not stand still for long.
      case MentalState.Frazzled:
        countdown = 1 + randomInt(0, 4);
        break;
    }
    return new NonPlayer({
      clone: npc,
      moving: false,
      stationeryCountdown: countdown,
    });
  }
  return new NonPlayer({
    clone: npc,
    moving: true,
    facing: ALL_DIRECTIONS[choice],
  });
}

// Choose a direction (an index into ALL_DIRECTIONS) that would move the NPC away from the gardener.
function gardenerAvoidingDirectionChoice(state: IGlobalState, npc: NonPlayer): number {
  // Compute the one forbidden direction.
  let badDir = directionOfFirstRelativeToSecond(state.gardener, npc);
  // Gather up all the indices that don't correspond to that direction.
  let indices: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (ALL_DIRECTIONS[i] !== badDir) {
      indices = [...indices, i];
    }
  }
  // Return one of those indices.
  let j = randomInt(0, 2);
  return indices[j];
}

// "Move" the NPC. In quotes because NPCs sometimes stand still and that's handled here too.
function moveNPC(state: IGlobalState, npc: NonPlayer): NonPlayer {
  if (!npc.moving) {
    return new NonPlayer({
      clone: npc,
      stationeryCountdown: Math.max(0, npc.stationeryCountdown - 1),
    });
  }
  return npc.move();
}

function dehydratePlants(plants: Plant[], state: IGlobalState): Plant[] {
  let newPlants: Plant[] = [];
  plants.forEach(plant => {
    newPlants = [...newPlants, plant.dehydratePlant(state)];
  });
  return newPlants;
}

function growPlants(plants: Plant[], state: IGlobalState): Plant[] {
  let newPlants: Plant[] = [];
  plants.forEach(plant => {
    newPlants = [...newPlants, plant.growPlant(state)];
  });
  return newPlants;
}

// Check whether the given collider overlaps (collides) with any other collider (excluding itself).
function collisionDetected(state: IGlobalState, colliders: Map<number, Collider>, collider: Collider): boolean {
  if (state.debugSettings.collisionsDisabled) return false;
  let cRect = collider.collisionRect();

  // Check all colliders and stop if and when any collision is found.
  let ids = Array.from(colliders.keys());
  for (let i = 0; i < ids.length; i++) {
    let colliderId = ids[i];
    // Don't check collisions with self.
    if (colliderId === collider.colliderId) continue;
    let co = colliders.get(colliderId);
    if (co === undefined) continue; // Will never happen.
    // Ignore collisions if there's an explicit exception for this pair of collider types.
    let exceptions = ColliderExceptions(collider);
    let expt = exceptions[co.colliderType.toString()];
    if (expt === true) continue;
    if (rectanglesOverlap(cRect, co.collisionRect())) return true;
  };

  // No collisions detected.
  return false;
}

// Check whether the given collider overlaps (collides) with any other colliders (excluding itself), but
// return all such colliders.
function detectCollisions(state: IGlobalState, colliders: Map<number, Collider>, collider: Collider): Collider[] {
  let allFound: Collider[] = [];
  if (state.debugSettings.collisionsDisabled) return allFound;
  let cRect = collider.collisionRect();

  // Check all colliders.
  let ids = Array.from(colliders.keys());
  for (let i = 0; i < ids.length; i++) {
    let colliderId = ids[i];
    // Don't check collisions with self.
    if (colliderId === collider.colliderId) continue;
    let co = colliders.get(colliderId);
    if (co === undefined) continue; // Will never happen.
    // Ignore collisions if there's an explicit exception for this pair of collider types.
    let exceptions = ColliderExceptions(collider);
    let expt = exceptions[co.colliderType.toString()];
    if (expt === true) continue;
    if (rectanglesOverlap(cRect, co.collisionRect())) allFound = [...allFound, co];
  }
  return allFound;
}

// Get all the colliders from a state.
function allCollidersFromState(state: IGlobalState): Map<number, Collider> {
  let map = new Map<number, Collider>();
  state.plants.forEach(plant => map.set(plant.colliderId, plant));
  state.invisibleColliders.forEach(ic => map.set(ic.colliderId, ic));
  state.npcs.forEach(npc => map.set(npc.colliderId, npc));
  map.set(state.gardener.colliderId, state.gardener);
  return map;
}

// Attempt to equip item or drop current item.
function toggleEquip(state: IGlobalState): IGlobalState {
  if (state.gardener.itemEquipped) {
    return {
      ...state,
      gardener: state.gardener.setItemEquipped(false),
      wateringCan: state.wateringCan.layOnTheGround(),
    }
  }
  if (!canEquip(state)) {
    return state;
  }
  return {
      ...state,
      gardener: state.gardener.setItemEquipped(true),
      wateringCan: state.wateringCan.moveWithGardener(state.gardener),
  }
}

// Check whether or not an item can be equipped right now.
function canEquip(state: IGlobalState): boolean {
  // Rectangle for the direction the gardener is facing.
  let faceRect = state.gardener.facingDetectionRect();
  let rect = state.wateringCan.equipRect();
  return rectanglesOverlap(faceRect, rect);
}

// Use currently equipped item, if equipped, other use item that is nearby (like a button).
// Note: Named "utilise" instead of "use" because "useItem" exists elsewhere.
function utiliseItem(state: IGlobalState): IGlobalState {
  if (!state.gardener.itemEquipped) {
    return utiliseNearbyItem(state);
  }
  var newPlants: Plant[] = [];
  let faceRect = state.gardener.facingDetectionRect();
  let alreadyAbsorbed = false;
  for (let i = 0; i < state.plants.length; i++) {
    let plant = state.plants[i];
    let plantRect = plant.wateringRect();
    if (!alreadyAbsorbed && rectanglesOverlap(faceRect, plantRect)) {
      newPlants = [...newPlants, plant.absorbWater()];
      alreadyAbsorbed = true;
    } else {
      newPlants = [...newPlants, plant];
    }
  }

  return {
    ...state,
    plants: newPlants,
    gardener: state.gardener.setWatering(true),
  };
}

function utiliseNearbyItem(state: IGlobalState): IGlobalState {
  // Check for nearby airlock buttons.
  if (rectanglesOverlap(state.gardener.interactionRect(), state.airlockButton.interactionRect())) {
    return activateAirlockButton(state);
  }
  // Check for nearby shield buttons.
  let sb = getNearbyShieldButton(state);
  if (sb === undefined) {
    console.log("Nothing to interact with");
    return state;
  }
  return activateShieldButton(sb, state);
}

function getNearbyShieldButton(state: IGlobalState): ShieldButton | undefined {
  for (let i = 0; i < state.shieldButtons.length; i++) {
    let sb = state.shieldButtons[i];
    if (rectanglesOverlap(state.gardener.interactionRect(), sb.interactionRect())) return sb;
  }
  return undefined;
}

function activateShieldButton(sb: ShieldButton, state: IGlobalState): IGlobalState {
  console.log("Activating shield button");
  let newButtons: ShieldButton[] = [];
  state.shieldButtons.forEach(b => {
    if (b.index === sb.index) newButtons = [...newButtons, b.activate(state)];
    else newButtons = [...newButtons, b];
  });
  let newShield = state.shieldDoors.triggerDoor(sb.index);
  return {
    ...state,
    shieldButtons: newButtons,
    shieldDoors: newShield,
  };
}

function activateAirlockButton(globalState: IGlobalState): IGlobalState {
  console.log("Activating airlock button");
  let airlock: Airlock = globalState.airlock.activate(globalState);
  let airlockButton: ShieldButton;
  if(airlock.state == AirlockState.OPENING){
    airlockButton = globalState.airlockButton.startAlarm(globalState);
  }
  else {
    airlockButton = globalState.airlockButton.activate(globalState);   
  }
  return {
    ...globalState,
    airlockButton: airlockButton,
    airlock: airlock,
  };
}

// Set the gardener's "watering" boolean to false.
function ceaseWatering(state: IGlobalState): IGlobalState {
  return {
    ...state,
    gardener: state.gardener.setWatering(false),
  };
}

function toggleDrawStateFreeze(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      freeze: !state.debugSettings.freeze,
    },
  }
}

export default gameReducer;
