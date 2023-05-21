// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { Direction, computeCurrentFrame, rectanglesOverlap, randomInt, ALL_DIRECTIONS, Coord, CANVAS_WIDTH, SHAKER_SUBTLE, SHAKER_NO_SHAKE, SHAKER_MILD, SHAKER_MEDIUM, SHAKER_INTENSE, directionOfFirstRelativeToSecond, directionName, AIRLOCK_PIXEL_SPEED } from "../../utils";
import { AnimEvent, AnimEventType, Collider, ColliderExceptions, ColliderType, IGlobalState, collisionDetected, initialGameState, updateAnimEventState } from "../classes";
import { Airlock, AirlockState, Gardener, MentalState, NonPlayer, Plant, ShieldButton, updateGardenerMoveState, updateNPCState } from '../../entities';
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

// TODO: See if we can animate from within a saga instead of the way we're doing it now.
function updateFrame(state: IGlobalState): IGlobalState {
  let f = computeCurrentFrame();
  if (f === state.currentFrame) {
    return state;
  }
  if (state.gameover) {
    return {
      ...state,
      currentFrame: f,
    }
  }

  // Get all the colliders as they exist now.
  state = {...state, colliderMap: allCollidersFromState(state)};
  let allColliders = state.colliderMap;
  
  // Allow gardener to move.
  state = updateGardenerMoveState(state);
 
  // Allow gardener to (keep) watering.
  if (state.gardener.watering) state = utiliseItem(state);

  // Allow NPCs to move.
  state = updateNPCState(state);

  let cats : Cat[] = [];
  for(let i = 0; i < state.cats.length; i++){
    cats = [...cats, state.cats[i].move()]
  }
  state = {...state, cats: cats};

  if(state.airlock.state === AirlockState.OPEN) state = updateOpenAirlockMovements(state);

  let newPlants = dehydratePlants(state.plants, state);
  newPlants = growPlants(newPlants, state);

  let newAirlock = state.airlock.updateState(state);

  state = updateAnimEventState(state);

  let newBlackHole: BlackHole | null = state.blackHole;
  if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
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
  state = {...state, blackHole: newBlackHole, planet1: newPlanet1, planet2: newPlanet2, planet3: newPlanet3};

  return  {
    ...state,
    currentFrame: f,
    cats: cats,
    plants: newPlants,
    airlock: newAirlock,
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
  let gardener = state.gardener;
  let move : Coord = state.airlock.getMovementDelta(gardener.pos);
    let oldPos : Coord = gardener.pos;
    gardener.pos = oldPos.plus(move.x, move.y);
    // If there is a collision, negate it.
    if (collisionDetected(state, allColliders, gardener)) {
      gardener.pos = oldPos;
    }
  return {...state, cats: cats, npcs: npcs, gardener: gardener};
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
